"""Focus session endpoints — create / list / complete / pause / resume / abandon。

Status 轉移（詳見 .claude/coordination/sessions-design.md）:

- active  --pause-->   paused
- paused  --resume-->  active
- active|paused  --abandon-->   abandoned
- active|paused  --complete-->  completed
- completed / abandoned 為終端態，任何 transition 皆 409

Stale cleanup：list 進來時先把自己的 active 且 `started_at + 3h + total_paused_seconds < now`
的 session bulk 改成 abandoned，避免殭屍計時卡在 dashboard。
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_current_profile
from app.domain import ensure_mood_supported
from app.models import FocusSession, Profile
from app.schemas import FocusSessionCreate, FocusSessionOut

router = APIRouter(prefix="/api/focus-sessions", tags=["focus-sessions"])


# focus session 合法最大時長 = 180 min = 3 hr。stale 門檻用「最大合法時長」
# 即可，超過代表客戶端直接關掉沒送 complete。
STALE_THRESHOLD = timedelta(hours=3)


async def _cleanup_stale(profile_id: str, session: AsyncSession) -> None:
    """把該 user 所有 active 且已超時的 session 改成 abandoned。

    公式：started_at + STALE_THRESHOLD + total_paused_seconds < now
    （pause 過的時間要加回，才不會誤殺正常 session）

    用 Postgres `make_interval` 把 total_paused_seconds 轉 interval 加到
    started_at，讓 DB 端一條 SQL 做完篩選 + bulk update。
    """
    now = datetime.now(UTC)
    paused_interval = func.make_interval(0, 0, 0, 0, 0, 0, FocusSession.total_paused_seconds)

    select_stmt = select(FocusSession.id).where(
        FocusSession.profile_id == profile_id,
        FocusSession.status == "active",
        FocusSession.started_at + paused_interval < now - STALE_THRESHOLD,
    )
    stale_ids = list(await session.scalars(select_stmt))
    if not stale_ids:
        return

    await session.execute(
        update(FocusSession)
        .where(FocusSession.id.in_(stale_ids))
        .values(status="abandoned", abandoned_at=now)
    )
    await session.commit()


@router.get("", response_model=list[FocusSessionOut])
async def list_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> list[FocusSession]:
    await _cleanup_stale(profile.id, session)
    stmt = (
        select(FocusSession)
        .where(FocusSession.profile_id == profile.id)
        .order_by(FocusSession.started_at.desc())
        .limit(limit)
    )
    return list(await session.scalars(stmt))


@router.post("", response_model=FocusSessionOut)
async def create_session(
    payload: FocusSessionCreate,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    ensure_mood_supported(payload.mood)
    row = FocusSession(
        profile_id=profile.id,
        title=payload.title,
        mood=payload.mood,
        duration_minutes=payload.duration_minutes,
        prompt=payload.prompt,
        status="active",
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def _load_owned(
    session_id: str, profile: Profile, session: AsyncSession
) -> FocusSession:
    row = await session.get(FocusSession, session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row.profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not your session")
    return row


@router.post("/{session_id}/complete", response_model=FocusSessionOut)
async def complete_session(
    session_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    row = await _load_owned(session_id, profile, session)
    row.status = "completed"
    row.completed_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(row)
    return row


@router.post("/{session_id}/pause", response_model=FocusSessionOut)
async def pause_session(
    session_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    row = await _load_owned(session_id, profile, session)
    if row.status != "active":
        raise HTTPException(
            status_code=409, detail=f"Cannot pause from status={row.status}"
        )
    row.status = "paused"
    row.paused_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(row)
    return row


@router.post("/{session_id}/resume", response_model=FocusSessionOut)
async def resume_session(
    session_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    row = await _load_owned(session_id, profile, session)
    if row.status != "paused":
        raise HTTPException(
            status_code=409, detail=f"Cannot resume from status={row.status}"
        )
    if row.paused_at is None:
        # 防禦：理論上 status=paused 就必有 paused_at
        raise HTTPException(status_code=400, detail="Session paused_at missing")

    now = datetime.now(UTC)
    elapsed = (now - row.paused_at).total_seconds()
    row.total_paused_seconds = int(row.total_paused_seconds + elapsed)
    row.paused_at = None
    row.status = "active"
    await session.commit()
    await session.refresh(row)
    return row


@router.post("/{session_id}/abandon", response_model=FocusSessionOut)
async def abandon_session(
    session_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    row = await _load_owned(session_id, profile, session)
    if row.status not in ("active", "paused"):
        raise HTTPException(
            status_code=409, detail=f"Cannot abandon from status={row.status}"
        )
    row.status = "abandoned"
    row.abandoned_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(row)
    return row
