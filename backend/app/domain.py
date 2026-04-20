from datetime import UTC, datetime

from fastapi import HTTPException


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


MOODS = {
    "focus": {"label": "Focus", "description": "Deep concentration without vocal clutter"},
    "calm": {"label": "Calm", "description": "Gentle ambient textures for light work"},
    "sleep": {"label": "Sleep", "description": "Low-energy background for winding down"},
    "rainy": {"label": "Rainy", "description": "Rain textures with warm instrumental loops"},
    "happy_chill": {"label": "Happy Chill", "description": "Bright lo-fi energy without distraction"},
    "night_drive": {"label": "Night Drive", "description": "Late-night groove with soft momentum"},
}


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
