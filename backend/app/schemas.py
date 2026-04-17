from pydantic import BaseModel, Field


class TrackOut(BaseModel):
    id: str
    title: str
    mood: str
    prompt: str
    stream_url: str
    duration_sec: int
    source: str
    created_at: str


class GenerationCreateRequest(BaseModel):
    mood: str = Field(min_length=3, max_length=30)
    prompt: str = Field(min_length=1, max_length=180)
    duration_sec: int = Field(default=180, ge=30, le=600)
    title: str | None = Field(default=None, max_length=80)


class GenerationJobOut(BaseModel):
    job_id: str
    user_id: str
    mood: str
    prompt: str
    prompt_normalized: str
    model: str
    status: str  # pending | completed | failed
    duration_sec: int
    created_at: str
    completed_at: str | None = None
    track: TrackOut | None = None
    ace_task_id: str | None = None


class CatalogMoodOut(BaseModel):
    key: str
    label: str
    description: str


class ApiMessage(BaseModel):
    message: str
