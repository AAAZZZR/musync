from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_optional_auth_user
from app.models import Profile, SeedTrack, Track
from app.schemas import AuthUser, StreamUrlOut
from app.services.stream import DEFAULT_TTL_SEC, create_signed_url

router = APIRouter(prefix="/api/stream", tags=["stream"])


@router.get("/seed/{seed_id}", response_model=StreamUrlOut)
async def seed_stream(
    seed_id: str,
    session: AsyncSession = Depends(get_session),
) -> StreamUrlOut:
    seed = await session.get(SeedTrack, seed_id)
    if not seed:
        raise HTTPException(status_code=404, detail="Seed not found")
    url = await create_signed_url(seed.storage_path)
    return StreamUrlOut(url=url, expires_in=DEFAULT_TTL_SEC)


@router.get("/track/{track_id}", response_model=StreamUrlOut)
async def track_stream(
    track_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthUser | None = Depends(get_optional_auth_user),
) -> StreamUrlOut:
    track = await session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    if not track.is_public:
        # private track：必須是 owner
        profile: Profile | None = None
        if auth:
            from sqlalchemy import select

            profile = await session.scalar(select(Profile).where(Profile.user_id == auth.id))
        if not profile or profile.id != track.profile_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    url = await create_signed_url(track.storage_path)
    return StreamUrlOut(url=url, expires_in=DEFAULT_TTL_SEC)
