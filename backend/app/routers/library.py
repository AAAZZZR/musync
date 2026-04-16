from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas import TrackOut
from app.state import TRACK_LIBRARY

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("/tracks", response_model=list[TrackOut])
def list_library(user: dict = Depends(get_current_user)) -> list[TrackOut]:
    tracks = [item for item in TRACK_LIBRARY if item["user_id"] == user["id"]]
    return [TrackOut(**{key: value for key, value in track.items() if key != "user_id"}) for track in tracks[::-1]]
