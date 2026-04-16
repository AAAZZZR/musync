from dataclasses import dataclass
from datetime import UTC, datetime


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


@dataclass
class Track:
    id: str
    title: str
    mood: str
    prompt: str
    stream_url: str
    duration_sec: int
    source: str
    created_at: str


MOODS = {
    "focus": {"label": "Focus", "description": "Deep concentration without vocal clutter"},
    "calm": {"label": "Calm", "description": "Gentle ambient textures for light work"},
    "sleep": {"label": "Sleep", "description": "Low-energy background for winding down"},
    "rainy": {"label": "Rainy", "description": "Rain textures with warm instrumental loops"},
    "happy_chill": {"label": "Happy Chill", "description": "Bright lo-fi energy without distraction"},
    "night_drive": {"label": "Night Drive", "description": "Late-night groove with soft momentum"},
}
