from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.dependencies import get_current_user
from app.domain import now_iso
from app.schemas import GenerationCreateRequest, GenerationJobOut, TrackOut
from app.services import create_generated_track, ensure_mood_supported, normalize_prompt
from app.state import GENERATION_JOBS

settings = get_settings()
router = APIRouter(prefix="/api/generation", tags=["generation"])


@router.post("/jobs", response_model=GenerationJobOut)
def create_generation_job(
    payload: GenerationCreateRequest,
    user: dict = Depends(get_current_user),
) -> GenerationJobOut:
    ensure_mood_supported(payload.mood)
    prompt_normalized = normalize_prompt(payload.mood, payload.prompt)
    track = create_generated_track(user["id"], payload)
    created_at = now_iso()
    job = {
        "job_id": f"job_{uuid4().hex[:10]}",
        "user_id": user["id"],
        "mood": payload.mood,
        "prompt": payload.prompt,
        "prompt_normalized": prompt_normalized,
        "model": settings.ace_model,
        "status": "completed",
        "duration_sec": payload.duration_sec,
        "created_at": created_at,
        "completed_at": created_at,
        "track": track,
    }
    GENERATION_JOBS.append(job)
    return GenerationJobOut(**job)


@router.get("/jobs", response_model=list[GenerationJobOut])
def list_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
) -> list[GenerationJobOut]:
    jobs = [job for job in GENERATION_JOBS if job["user_id"] == user["id"]]
    return [GenerationJobOut(**job) for job in jobs[-limit:][::-1]]


@router.get("/jobs/{job_id}", response_model=GenerationJobOut)
def get_job(job_id: str, user: dict = Depends(get_current_user)) -> GenerationJobOut:
    job = next((item for item in GENERATION_JOBS if item["job_id"] == job_id and item["user_id"] == user["id"]), None)
    if not job:
        raise HTTPException(status_code=404, detail="Generation job not found")
    return GenerationJobOut(**job)
