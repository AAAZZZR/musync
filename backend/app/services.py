from uuid import uuid4

from fastapi import HTTPException

from app.core.config import get_settings
from app.domain import MOODS, now_iso

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


def generate_job_id() -> str:
    return f"job_{uuid4().hex[:10]}"


def generate_track_id() -> str:
    return f"trk_{uuid4().hex[:10]}"
