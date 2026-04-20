from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_current_profile
from app.models import Profile, Track
from app.schemas import TrackOut
from app.services.stream import delete_object

router = APIRouter(prefix="/api/tracks", tags=["tracks"])


@router.get("", response_model=list[TrackOut])
async def list_tracks(
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> list[Track]:
    stmt = select(Track).where(Track.profile_id == profile.id).order_by(Track.created_at.desc())
    return list(await session.scalars(stmt))


@router.delete("/{track_id}")
async def delete_track(
    track_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> dict:
    track = await session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if track.profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not your track")

    ok = await delete_object(track.storage_path)
    if not ok:
        raise HTTPException(status_code=502, detail="Storage delete failed")

    await session.delete(track)
    await session.commit()
    return {"id": track_id}


@router.post("/{track_id}/publish", response_model=TrackOut)
async def publish_track(
    track_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> Track:
    track = await session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if track.profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not your track")
    track.is_public = True
    track.published_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(track)
    return track


@router.post("/{track_id}/unpublish", response_model=TrackOut)
async def unpublish_track(
    track_id: str,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> Track:
    track = await session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if track.profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not your track")
    track.is_public = False
    track.published_at = None
    await session.commit()
    await session.refresh(track)
    return track
