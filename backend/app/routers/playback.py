import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_current_profile
from app.domain import ensure_mood_supported, normalize_prompt
from app.models import PlaybackSession, Profile, SeedTrack
from app.schemas import PlaybackStartOut, PlaybackStartRequest, SeedTrackOut

router = APIRouter(prefix="/api/playback", tags=["playback"])


async def _random_seed_by_mood(session: AsyncSession, mood: str) -> SeedTrack | None:
    count = await session.scalar(select(func.count()).select_from(SeedTrack).where(SeedTrack.mood == mood))
    if not count:
        return None
    offset = random.randrange(count)
    stmt = select(SeedTrack).where(SeedTrack.mood == mood).offset(offset).limit(1)
    return await session.scalar(stmt)


@router.post("/start", response_model=PlaybackStartOut)
async def start_playback(
    payload: PlaybackStartRequest,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> PlaybackStartOut:
    ensure_mood_supported(payload.mood)
    seed = await _random_seed_by_mood(session, payload.mood)
    if not seed:
        raise HTTPException(status_code=404, detail="No seed tracks for this mood")

    ps = PlaybackSession(
        profile_id=profile.id,
        mood=payload.mood,
        prompt=payload.prompt,
        prompt_normalized=normalize_prompt(payload.mood, payload.prompt),
    )
    session.add(ps)
    await session.commit()
    await session.refresh(ps)

    return PlaybackStartOut(session_id=ps.id, track=SeedTrackOut.model_validate(seed))


@router.post("/sessions/{session_id}/next", response_model=SeedTrackOut)
async def next_track(
    session_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> SeedTrack:
    ps = await session.get(PlaybackSession, session_id)
    if not ps or ps.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Playback session not found")
    seed = await _random_seed_by_mood(session, ps.mood)
    if not seed:
        raise HTTPException(status_code=404, detail="No seed tracks")
    return seed
