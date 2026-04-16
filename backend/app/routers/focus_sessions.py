from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.domain import now_iso
from app.schemas import FocusSessionCreateRequest, FocusSessionOut
from app.services import ensure_mood_supported
from app.state import FOCUS_SESSIONS

router = APIRouter(prefix="/api/focus-sessions", tags=["focus-sessions"])


@router.post("", response_model=FocusSessionOut)
def create_focus_session(
    payload: FocusSessionCreateRequest,
    user: dict = Depends(get_current_user),
) -> FocusSessionOut:
    ensure_mood_supported(payload.mood)
    focus_session = {
        "id": f"focus_{uuid4().hex[:10]}",
        "user_id": user["id"],
        "title": payload.title,
        "mood": payload.mood,
        "duration_minutes": payload.duration_minutes,
        "prompt": payload.prompt,
        "status": "active",
        "started_at": now_iso(),
        "completed_at": None,
    }
    FOCUS_SESSIONS.append(focus_session)
    return FocusSessionOut(**focus_session)


@router.get("", response_model=list[FocusSessionOut])
def list_focus_sessions(user: dict = Depends(get_current_user)) -> list[FocusSessionOut]:
    sessions = [item for item in FOCUS_SESSIONS if item["user_id"] == user["id"]]
    return [FocusSessionOut(**session) for session in sessions[::-1]]


@router.get("/{session_id}", response_model=FocusSessionOut)
def get_focus_session(session_id: str, user: dict = Depends(get_current_user)) -> FocusSessionOut:
    session = next((item for item in FOCUS_SESSIONS if item["id"] == session_id and item["user_id"] == user["id"]), None)
    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return FocusSessionOut(**session)


@router.post("/{session_id}/complete", response_model=FocusSessionOut)
def complete_focus_session(session_id: str, user: dict = Depends(get_current_user)) -> FocusSessionOut:
    session = next((item for item in FOCUS_SESSIONS if item["id"] == session_id and item["user_id"] == user["id"]), None)
    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")

    session["status"] = "completed"
    session["completed_at"] = now_iso()
    return FocusSessionOut(**session)
