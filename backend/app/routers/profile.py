from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas import ProfileOut, ProfileUpdateRequest
from app.services import ensure_mood_supported
from app.state import PROFILES

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_profile(user: dict = Depends(get_current_user)) -> ProfileOut:
    return ProfileOut(**PROFILES[user["id"]])


@router.patch("", response_model=ProfileOut)
def update_profile(payload: ProfileUpdateRequest, user: dict = Depends(get_current_user)) -> ProfileOut:
    profile = PROFILES[user["id"]]
    if payload.preferred_mood is not None:
        ensure_mood_supported(payload.preferred_mood)
    profile.update(payload.model_dump(exclude_none=True))
    return ProfileOut(**profile)
