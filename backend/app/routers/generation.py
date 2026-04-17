from fastapi import APIRouter, Depends, HTTPException, Query

from app.ace_client import build_audio_url, poll_task, submit_task
from app.core.config import get_settings
from app.dependencies import get_current_user_id
from app.domain import MOODS, now_iso
from app.schemas import GenerationCreateRequest, GenerationJobOut
from app.services import ensure_mood_supported, generate_job_id, generate_track_id, normalize_prompt
from app.state import GENERATION_JOBS

settings = get_settings()
router = APIRouter(prefix="/api/generation", tags=["generation"])


@router.post("/jobs", response_model=GenerationJobOut)
async def create_generation_job(
    payload: GenerationCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> GenerationJobOut:
    ensure_mood_supported(payload.mood)
    prompt_normalized = normalize_prompt(payload.mood, payload.prompt)
    title = payload.title or f"{MOODS[payload.mood]['label']} Flow"
    job_id = generate_job_id()
    created_at = now_iso()

    # 如果 ACE API 有設定，走真實非同步生成
    if settings.ace_api_base_url:
        ace_task_id = await submit_task(
            prompt=prompt_normalized,
            duration_sec=payload.duration_sec,
        )
        job = {
            "job_id": job_id,
            "user_id": user_id,
            "mood": payload.mood,
            "prompt": payload.prompt,
            "prompt_normalized": prompt_normalized,
            "model": settings.ace_model,
            "status": "pending",
            "duration_sec": payload.duration_sec,
            "created_at": created_at,
            "completed_at": None,
            "track": None,
            "ace_task_id": ace_task_id,
            "title": title,
        }
    else:
        # Mock 模式：直接回 completed（開發用）
        track_id = generate_track_id()
        track = {
            "id": track_id,
            "title": title,
            "mood": payload.mood,
            "prompt": payload.prompt,
            "stream_url": "https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
            "duration_sec": payload.duration_sec,
            "source": settings.ace_model,
            "created_at": created_at,
        }
        job = {
            "job_id": job_id,
            "user_id": user_id,
            "mood": payload.mood,
            "prompt": payload.prompt,
            "prompt_normalized": prompt_normalized,
            "model": settings.ace_model,
            "status": "completed",
            "duration_sec": payload.duration_sec,
            "created_at": created_at,
            "completed_at": created_at,
            "track": track,
            "ace_task_id": None,
            "title": title,
        }

    GENERATION_JOBS[job_id] = job
    return GenerationJobOut(**job)


@router.get("/jobs/{job_id}", response_model=GenerationJobOut)
async def get_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
) -> GenerationJobOut:
    job = GENERATION_JOBS.get(job_id)
    if not job or job["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Generation job not found")

    # 如果 pending 且有 ace_task_id，去 ACE 問狀態
    if job["status"] == "pending" and job.get("ace_task_id"):
        result = await poll_task(job["ace_task_id"])

        if result["status"] == 1:
            # 成功 — 建 track
            audio_url = build_audio_url(result["audio_path"]) if result["audio_path"] else ""
            track_id = generate_track_id()
            job["status"] = "completed"
            job["completed_at"] = now_iso()
            job["track"] = {
                "id": track_id,
                "title": job["title"],
                "mood": job["mood"],
                "prompt": job["prompt"],
                "stream_url": audio_url,
                "duration_sec": job["duration_sec"],
                "source": settings.ace_model,
                "created_at": job["created_at"],
            }
        elif result["status"] == 2:
            # 失敗
            job["status"] = "failed"
            job["completed_at"] = now_iso()

    return GenerationJobOut(**job)


@router.get("/jobs", response_model=list[GenerationJobOut])
async def list_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
) -> list[GenerationJobOut]:
    user_jobs = [job for job in GENERATION_JOBS.values() if job["user_id"] == user_id]
    user_jobs.sort(key=lambda j: j["created_at"], reverse=True)
    return [GenerationJobOut(**job) for job in user_jobs[:limit]]
