from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="MuSync API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class Track:
    id: str
    stream_url: str
    duration_sec: int


TRACK_POOL: dict[str, Deque[Track]] = defaultdict(deque)
SESSIONS: dict[str, dict] = {}
GENERATION_JOBS: list[dict] = []

for mood in ["focus", "calm", "sleep", "rainy", "happy_chill", "night_drive"]:
    for i in range(1, 11):
        TRACK_POOL[mood].append(
            Track(
                id=f"{mood}_seed_{i}",
                stream_url="https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
                duration_sec=180,
            )
        )


class StartRequest(BaseModel):
    mood: str = Field(min_length=3, max_length=30)
    prompt: str = Field(min_length=1, max_length=180)


class SessionRequest(BaseModel):
    session_id: str


class TrackOut(BaseModel):
    id: str
    stream_url: str
    duration_sec: int


class StartResponse(BaseModel):
    session_id: str
    track: TrackOut


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
    if not TRACK_POOL[mood]:
        raise HTTPException(status_code=503, detail="No tracks available for this mood")

    track = TRACK_POOL[mood].popleft()
    TRACK_POOL[mood].append(track)
    return track


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/play/start", response_model=StartResponse)
def play_start(payload: StartRequest) -> StartResponse:
    if payload.mood not in TRACK_POOL:
        raise HTTPException(status_code=400, detail="Unsupported mood")

    prompt_normalized = normalize_prompt(payload.mood, payload.prompt)
    track = pop_next_track(payload.mood)
    session_id = f"sess_{uuid4().hex[:12]}"

    SESSIONS[session_id] = {
        "mood": payload.mood,
        "prompt": payload.prompt,
        "prompt_normalized": prompt_normalized,
    }

    GENERATION_JOBS.append(
        {
            "job_id": f"job_{uuid4().hex[:10]}",
            "mood": payload.mood,
            "prompt_normalized": prompt_normalized,
            "status": "queued",
            "strategy": "B_prompt_affects_future_generation",
        }
    )

    return StartResponse(session_id=session_id, track=TrackOut(**track.__dict__))


@app.post("/api/play/next")
def play_next(payload: SessionRequest) -> dict:
    session = SESSIONS.get(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    track = pop_next_track(session["mood"])
    return {"track": TrackOut(**track.__dict__)}


@app.get("/api/generation/jobs")
def list_jobs(limit: int = 20) -> dict:
    return {"jobs": GENERATION_JOBS[-limit:]}
