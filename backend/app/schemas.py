"""Pydantic request/response schemas — REST API contract。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ===== Auth =====


class AuthUser(BaseModel):
    id: str
    email: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=80)


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthSessionOut(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    expires_at: int | None = None
    user_id: str
    email: str


# ===== Profile =====


class ProfileOut(_Out):
    id: str
    user_id: str
    email: str
    full_name: str
    onboarding_complete: bool
    preferred_mood: str
    daily_focus_minutes: int
    background_volume: int
    track_limit: int
    plan: str
    stripe_customer_id: str | None = None
    stripe_current_period_end: datetime | None = None
    created_at: datetime


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=80)
    preferred_mood: str | None = Field(default=None, min_length=3, max_length=30)
    daily_focus_minutes: int | None = Field(default=None, ge=15, le=480)
    background_volume: int | None = Field(default=None, ge=0, le=100)
    onboarding_complete: bool | None = None


# ===== Tracks =====


class TrackOut(_Out):
    id: str
    profile_id: str
    title: str
    mood: str
    prompt: str
    storage_path: str
    duration_sec: int
    source: str
    is_public: bool
    published_at: datetime | None = None
    created_at: datetime


class CommunityTrackOut(TrackOut):
    creator: str


# ===== Seed tracks =====


class SeedTrackOut(_Out):
    id: str
    mood: str
    title: str
    prompt: str
    storage_path: str
    duration_sec: int


# ===== Focus sessions =====


class FocusSessionOut(_Out):
    id: str
    profile_id: str
    title: str
    mood: str
    duration_minutes: int
    prompt: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None


class FocusSessionCreate(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    mood: str = Field(min_length=3, max_length=30)
    duration_minutes: int = Field(ge=5, le=180)
    prompt: str = Field(min_length=1, max_length=180)


# ===== Generation =====


class GenerationJobOut(_Out):
    id: str
    profile_id: str
    mood: str
    prompt: str
    prompt_normalized: str
    model: str
    status: str
    duration_sec: int
    track_id: str | None = None
    provider_job_id: str | None = None
    ace_task_id: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    track: TrackOut | None = None


class GenerationJobCreate(BaseModel):
    mood: str = Field(min_length=3, max_length=30)
    prompt: str = Field(min_length=1, max_length=180)
    duration_sec: int = Field(default=180, ge=30, le=900)
    title: str | None = Field(default=None, max_length=80)


# ===== Playback =====


class PlaybackStartRequest(BaseModel):
    mood: str = Field(min_length=3, max_length=30)
    prompt: str = Field(min_length=1, max_length=180)


class PlaybackStartOut(BaseModel):
    session_id: str
    track: SeedTrackOut


# ===== Stream =====


class StreamUrlOut(BaseModel):
    url: str
    expires_in: int


# ===== Billing =====


class BillingUrlOut(BaseModel):
    url: str


# ===== Catalog =====


class CatalogMoodOut(BaseModel):
    key: str
    label: str
    description: str


class ApiMessage(BaseModel):
    message: str
