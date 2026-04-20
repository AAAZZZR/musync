import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app import supabase_auth
from app.core.db import get_session
from app.dependencies import get_current_profile
from app.models import Profile
from app.schemas import OkResponse, ProfileOut, ProfileUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
async def get_profile(profile: Profile = Depends(get_current_profile)) -> Profile:
    return profile


@router.patch("", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate,
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> Profile:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(profile, key, value)
    await session.commit()
    await session.refresh(profile)
    return profile


@router.delete("", response_model=OkResponse)
async def delete_account(
    profile: Profile = Depends(get_current_profile),
    session: AsyncSession = Depends(get_session),
) -> OkResponse:
    """砍 Supabase user + Profile row（FK cascade 帶走 tracks/sessions/etc）。

    Storage 檔案孤兒化（out of scope — 見 account-design.md）。
    """
    user_id = profile.user_id
    email = profile.email
    logger.info("delete_account start user_id=%s email=%s", user_id, email)
    await supabase_auth.admin_delete_user(user_id)
    await session.delete(profile)
    await session.commit()
    logger.info("delete_account done user_id=%s", user_id)
    return OkResponse(ok=True)
