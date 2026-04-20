"""Generation jobs — 提交到 ACE、poll 結果、完成時落 DB + 上傳 Storage。

Throttling rules（詳見 .claude/coordination/generation-design.md）:

- Single-pending：同 profile 同時間只能 1 個 status='pending' 的 job。
- Rate limit：`plan='free'` 每 rolling 1 小時最多 10 個 job；`plan='pro'` 不擋。
- Cancel：owner + pending only，把 status 改 failed 並記 completed_at。
  ACE 1.5 上游沒有 cancel API，log warning 說明 GPU 任務會跑完但結果被丟棄。
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ace_client import poll_task, submit_task
from app.core.config import get_settings
from app.core.db import get_session
from app.dependencies import get_current_profile
from app.domain import MOODS, ensure_mood_supported, normalize_prompt
from app.models import GenerationJob, Profile, Track
from app.schemas import GenerationJobCreate, GenerationJobOut, TrackOut
from app.storage import upload_ace_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/generation", tags=["generation"])

# Free plan rolling-window rate limit（詳見 generation-design.md §3）
FREE_PLAN_HOURLY_LIMIT = 10
RATE_LIMIT_WINDOW = timedelta(hours=1)


def _job_to_out(job: GenerationJob, track: Track | None = None) -> GenerationJobOut:
    out = GenerationJobOut.model_validate(job)
    out.track = TrackOut.model_validate(track) if track else None
    return out


@router.post("/jobs", response_model=GenerationJobOut)
async def create_job(
    payload: GenerationJobCreate,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> GenerationJobOut:
    settings = get_settings()
    if not settings.ace_api_base_url:
        raise HTTPException(status_code=503, detail="ACE API not configured")

    ensure_mood_supported(payload.mood)

    # Rate limit（free plan only，rolling last 1 hour，any status 都算）
    if profile.plan == "free":
        cutoff = datetime.now(UTC) - RATE_LIMIT_WINDOW
        recent = await session.scalar(
            select(func.count())
            .select_from(GenerationJob)
            .where(
                GenerationJob.profile_id == profile.id,
                GenerationJob.created_at > cutoff,
            )
        )
        if recent is not None and recent >= FREE_PLAN_HOURLY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit: {FREE_PLAN_HOURLY_LIMIT} generations/hour on free plan",
            )

    # Single-pending：同時只能有 1 個 pending job
    pending_count = await session.scalar(
        select(func.count())
        .select_from(GenerationJob)
        .where(
            GenerationJob.profile_id == profile.id,
            GenerationJob.status == "pending",
        )
    )
    if pending_count is not None and pending_count >= 1:
        raise HTTPException(
            status_code=429,
            detail="Another generation is already in progress",
        )

    # Track limit check
    current = await session.scalar(
        select(func.count()).select_from(Track).where(Track.profile_id == profile.id)
    )
    if current is not None and current >= profile.track_limit:
        raise HTTPException(
            status_code=402,
            detail=f"Track limit reached ({current}/{profile.track_limit})",
        )

    prompt_normalized = normalize_prompt(payload.mood, payload.prompt)
    ace_task_id = await submit_task(prompt=prompt_normalized, duration_sec=payload.duration_sec)

    job = GenerationJob(
        profile_id=profile.id,
        mood=payload.mood,
        prompt=payload.prompt,
        prompt_normalized=prompt_normalized,
        model=settings.ace_model,
        status="pending",
        duration_sec=payload.duration_sec,
        provider_job_id=None,  # 直接用 job.id；frontend poll 用 job.id
        ace_task_id=ace_task_id,
    )
    # 順便把 title 藏在 prompt_normalized 旁邊？沒地方放，先用 mood label 組
    session.add(job)
    await session.commit()
    await session.refresh(job)

    return _job_to_out(job)


@router.get("/jobs/{job_id}", response_model=GenerationJobOut)
async def get_job(
    job_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> GenerationJobOut:
    settings = get_settings()
    job = await session.get(GenerationJob, job_id)
    if not job or job.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Generation job not found")

    track: Track | None = None
    if job.track_id:
        track = await session.get(Track, job.track_id)

    # pending + 有 ace_task_id → 去 ACE 問狀態
    if job.status == "pending" and job.ace_task_id:
        result = await poll_task(job.ace_task_id)

        if result["status"] == 1:
            raw_path = result.get("audio_path") or ""
            track_id = str(uuid.uuid4())
            storage_path = f"users/{profile.user_id}/{track_id}.mp3"
            try:
                await upload_ace_audio(raw_path, storage_path)
            except Exception as e:
                job.status = "failed"
                job.completed_at = datetime.now(UTC)
                await session.commit()
                raise HTTPException(status_code=502, detail=f"Upload failed: {e}")

            title = f"{MOODS.get(job.mood, {}).get('label', job.mood)} Flow"
            track = Track(
                id=track_id,
                profile_id=profile.id,
                title=title,
                mood=job.mood,
                prompt=job.prompt,
                storage_path=storage_path,
                duration_sec=job.duration_sec,
                source=settings.ace_model,
            )
            session.add(track)
            job.status = "completed"
            job.track_id = track_id
            job.completed_at = datetime.now(UTC)
            await session.commit()
            await session.refresh(job)
            await session.refresh(track)
        elif result["status"] == 2:
            job.status = "failed"
            job.completed_at = datetime.now(UTC)
            await session.commit()
            await session.refresh(job)

    return _job_to_out(job, track)


@router.post("/jobs/{job_id}/cancel", response_model=GenerationJobOut)
async def cancel_job(
    job_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> GenerationJobOut:
    """Cancel 一個 pending job。

    ACE-Step 1.5 上游沒有 cancel API（詳見 generation-design.md §2），
    所以這裡只改 DB 狀態：status→failed、completed_at=now。GPU 那邊會跑完但結果被忽略。
    """
    job = await session.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Generation job not found")
    if job.profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not your generation job")
    if job.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel job with status={job.status}",
        )

    # ACE 1.5 沒 cancel endpoint — 只能 log，實際 GPU 任務會跑完
    if job.ace_task_id:
        logger.warning(
            "Job %s cancelled client-side; ACE task %s will still complete on the GPU",
            job.id,
            job.ace_task_id,
        )

    job.status = "failed"
    job.completed_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(job)

    track: Track | None = None
    if job.track_id:
        track = await session.get(Track, job.track_id)
    return _job_to_out(job, track)


@router.get("/jobs", response_model=list[GenerationJobOut])
async def list_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> list[GenerationJobOut]:
    stmt = (
        select(GenerationJob)
        .where(GenerationJob.profile_id == profile.id)
        .order_by(GenerationJob.created_at.desc())
        .limit(limit)
    )
    jobs = list(await session.scalars(stmt))
    track_ids = [j.track_id for j in jobs if j.track_id]
    tracks_map: dict[str, Track] = {}
    if track_ids:
        rows = await session.scalars(select(Track).where(Track.id.in_(track_ids)))
        for t in rows:
            tracks_map[t.id] = t
    return [_job_to_out(j, tracks_map.get(j.track_id or "")) for j in jobs]
