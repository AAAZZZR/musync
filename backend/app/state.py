from collections import defaultdict, deque
from dataclasses import asdict
from typing import Deque

from app.domain import MOODS, Track, now_iso

TRACK_POOL: dict[str, Deque[Track]] = defaultdict(deque)
USERS: dict[str, dict] = {}
TOKENS: dict[str, str] = {}
PROFILES: dict[str, dict] = {}
PLAYBACK_SESSIONS: dict[str, dict] = {}
GENERATION_JOBS: list[dict] = []
TRACK_LIBRARY: list[dict] = []
FOCUS_SESSIONS: list[dict] = []


def seed_tracks() -> None:
    if any(TRACK_POOL.values()):
        return

    for mood in MOODS:
        for i in range(1, 7):
            TRACK_POOL[mood].append(
                Track(
                    id=f"{mood}_seed_{i}",
                    title=f"{MOODS[mood]['label']} Seed {i}",
                    mood=mood,
                    prompt=f"Seed loop for {mood}",
                    stream_url="https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
                    duration_sec=180,
                    source="seed",
                    created_at=now_iso(),
                )
            )


def serialize_track(track: Track | dict) -> dict:
    if isinstance(track, Track):
        return asdict(track)
    return track
