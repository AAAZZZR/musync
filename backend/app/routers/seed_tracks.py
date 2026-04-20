from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import SeedTrack
from app.schemas import SeedTrackOut

router = APIRouter(prefix="/api/seed-tracks", tags=["seed-tracks"])


@router.get("", response_model=list[SeedTrackOut])
async def list_seeds(
    mood: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> list[SeedTrack]:
    stmt = select(SeedTrack).order_by(SeedTrack.mood.asc(), SeedTrack.sort_order.asc())
    if mood:
        stmt = stmt.where(SeedTrack.mood == mood)
    return list(await session.scalars(stmt))
