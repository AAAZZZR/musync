from uuid import uuid4

from fastapi import HTTPException

from app.core.config import get_settings
from app.domain import MOODS, Track, now_iso
from app.schemas import GenerationCreateRequest
from app.state import TRACK_POOL, serialize_track

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
    TRACK_POOL[payload.mood].append(track)
    return track_dict
