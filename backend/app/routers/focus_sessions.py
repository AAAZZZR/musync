from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_current_profile
from app.domain import ensure_mood_supported
from app.models import FocusSession, Profile
from app.schemas import FocusSessionCreate, FocusSessionOut

router = APIRouter(prefix="/api/focus-sessions", tags=["focus-sessions"])


@router.get("", response_model=list[FocusSessionOut])
async def list_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> list[FocusSession]:
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


@router.post("/{session_id}/complete", response_model=FocusSessionOut)
async def complete_session(
    session_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> FocusSession:
    row = await session.get(FocusSession, session_id)
    if not row or row.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Session not found")
    row.status = "completed"
    row.completed_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(row)
    return row
