from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.domain import now_iso
from app.schemas import SessionRequest, StartRequest, StartResponse, TrackOut
from app.services import ensure_mood_supported, normalize_prompt, pop_next_track
from app.state import PLAYBACK_SESSIONS, serialize_track

router = APIRouter(prefix="/api/play", tags=["playback"])


@router.post("/start", response_model=StartResponse)
def play_start(payload: StartRequest, user: dict = Depends(get_current_user)) -> StartResponse:
    ensure_mood_supported(payload.mood)
    prompt_normalized = normalize_prompt(payload.mood, payload.prompt)
    track = pop_next_track(payload.mood)
    session_id = f"sess_{uuid4().hex[:12]}"

    PLAYBACK_SESSIONS[session_id] = {
        "id": session_id,
        "user_id": user["id"],
        "mood": payload.mood,
        "prompt": payload.prompt,
        "prompt_normalized": prompt_normalized,
        "started_at": now_iso(),
    }

    return StartResponse(session_id=session_id, track=TrackOut(**serialize_track(track)))


@router.post("/next")
def play_next(payload: SessionRequest, user: dict = Depends(get_current_user)) -> dict:
    session = PLAYBACK_SESSIONS.get(payload.session_id)
    if not session or session["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Session not found")

    track = pop_next_track(session["mood"])
    return {"track": TrackOut(**serialize_track(track))}
