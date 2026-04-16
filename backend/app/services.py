from uuid import uuid4

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.domain import MOODS, Track, now_iso
from app.schemas import GenerationCreateRequest
from app.state import (
    GENERATION_JOBS,
    PLAYBACK_SESSIONS,
    PROFILES,
    TOKENS,
    TRACK_LIBRARY,
    TRACK_POOL,
    USERS,
    serialize_track,
)

settings = get_settings()


def ensure_mood_supported(mood: str) -> None:
    if mood not in MOODS:
        raise HTTPException(status_code=400, detail="Unsupported mood")


def normalize_prompt(mood: str, user_prompt: str) -> str:
    base = {
        "focus": "instrumental lofi for concentration",
        "calm": "gentle lofi with soft textures",
        "sleep": "slow tempo sleepy lofi, no sharp transients",
        "rainy": "rain ambience and vinyl noise",
        "happy_chill": "warm major-key chill lofi",
        "night_drive": "night urban lofi groove",
    }
    base_prompt = base.get(mood, "instrumental lofi")
    cleaned = " ".join(user_prompt.strip().split())
    return f"{base_prompt}; {cleaned}; no vocal; seamless background loop"


def pop_next_track(mood: str) -> Track:
    ensure_mood_supported(mood)
    if not TRACK_POOL[mood]:
        raise HTTPException(status_code=503, detail="No tracks available for this mood")
    track = TRACK_POOL[mood].popleft()
    TRACK_POOL[mood].append(track)
    return track


def create_token(user_id: str) -> str:
    token = f"msk_{uuid4().hex}"
    TOKENS[token] = user_id
    return token


def get_user_by_token(token: str) -> dict | None:
    user_id = TOKENS.get(token)
    if not user_id:
        return None
    return USERS.get(user_id)


def require_user(token: str | None) -> dict:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


def create_generated_track(user_id: str, payload: GenerationCreateRequest) -> dict:
    title = payload.title or f"{MOODS[payload.mood]['label']} Flow"
    track = Track(
        id=f"trk_{uuid4().hex[:10]}",
        title=title,
        mood=payload.mood,
        prompt=payload.prompt,
        stream_url="https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
        duration_sec=payload.duration_sec,
        source="ace-1.5",
        created_at=now_iso(),
    )
    track_dict = serialize_track(track)
    TRACK_LIBRARY.append({"user_id": user_id, **track_dict})
    TRACK_POOL[payload.mood].append(track)
    return track_dict


def create_user(email: str, full_name: str, password: str | None = None) -> dict:
    if any(user["email"] == email for user in USERS.values()):
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = f"usr_{uuid4().hex[:10]}"
    created_at = now_iso()
    user = {
        "id": user_id,
        "email": email,
        "password": password,
        "created_at": created_at,
    }
    USERS[user_id] = user
    PROFILES[user_id] = {
        "user_id": user_id,
        "full_name": full_name,
        "onboarding_complete": False,
        "preferred_mood": "focus",
        "daily_focus_minutes": 90,
        "background_volume": 60,
    }
    return user
