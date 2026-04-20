from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Profile, Track
from app.schemas import CommunityTrackOut

router = APIRouter(prefix="/api/community", tags=["community"])


@router.get("/tracks", response_model=list[CommunityTrackOut])
async def list_community_tracks(
    mood: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[CommunityTrackOut]:
    stmt = (
        select(Track, Profile.full_name)
        .join(Profile, Profile.id == Track.profile_id)
        .where(Track.is_public.is_(True))
        .order_by(Track.published_at.desc().nullslast())
        .limit(limit)
    )
    if mood:
        stmt = stmt.where(Track.mood == mood)

    rows = (await session.execute(stmt)).all()
    return [
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
            creator=creator,
        )
        for t, creator in rows
    ]
