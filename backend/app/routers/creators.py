"""Public creator profile — 取某 creator 的公開作品列表。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Profile, Track
from app.schemas import CommunityTrackOut, CreatorProfileOut

router = APIRouter(prefix="/api/creators", tags=["creators"])

TRACK_LIST_LIMIT = 100


@router.get("/{profile_id}", response_model=CreatorProfileOut)
async def get_creator_profile(
    profile_id: str,
    session: AsyncSession = Depends(get_session),
) -> CreatorProfileOut:
    """公開 endpoint — 回 creator 基本資料 + 公開曲目列表。

    profile 不存在、或完全沒公開作品 → 404。
    """
    profile = await session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Creator not found")

    total_stmt = (
        select(func.count(Track.id))
        .where(Track.profile_id == profile_id)
        .where(Track.is_public.is_(True))
    )
    total_public_tracks = await session.scalar(total_stmt) or 0

    if total_public_tracks == 0:
        raise HTTPException(status_code=404, detail="Creator has no public tracks")

    tracks_stmt = (
        select(Track)
        .where(Track.profile_id == profile_id)
        .where(Track.is_public.is_(True))
        .order_by(Track.published_at.desc().nullslast())
        .limit(TRACK_LIST_LIMIT)
    )
    tracks = list(await session.scalars(tracks_stmt))

    return CreatorProfileOut(
        id=profile.id,
        full_name=profile.full_name,
        total_public_tracks=total_public_tracks,
        tracks=[
            CommunityTrackOut(
                id=t.id,
                profile_id=t.profile_id,
                title=t.title,
                mood=t.mood,
                prompt=t.prompt,
                storage_path=t.storage_path,
                duration_sec=t.duration_sec,
                source=t.source,
                is_public=t.is_public,
                published_at=t.published_at,
                created_at=t.created_at,
                creator=profile.full_name,
            )
            for t in tracks
        ],
    )
