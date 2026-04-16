from pydantic import BaseModel, EmailStr, Field


class TrackOut(BaseModel):
    id: str
    title: str
    mood: str
    prompt: str
    stream_url: str
    duration_sec: int
    source: str
    created_at: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ProfileOut(BaseModel):
    user_id: str
    full_name: str
    onboarding_complete: bool
    preferred_mood: str
    daily_focus_minutes: int
    background_volume: int


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=80)
    preferred_mood: str | None = Field(default=None, min_length=3, max_length=30)
    daily_focus_minutes: int | None = Field(default=None, ge=15, le=480)
    background_volume: int | None = Field(default=None, ge=0, le=100)
    onboarding_complete: bool | None = None


class StartRequest(BaseModel):
    mood: str = Field(min_length=3, max_length=30)
    prompt: str = Field(min_length=1, max_length=180)


class SessionRequest(BaseModel):
    session_id: str


class StartResponse(BaseModel):
    session_id: str
    track: TrackOut


class FocusSessionCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    mood: str = Field(min_length=3, max_length=30)
    duration_minutes: int = Field(ge=5, le=180)
    prompt: str = Field(min_length=1, max_length=180)


class FocusSessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    mood: str
    duration_minutes: int
    prompt: str
    status: str
    started_at: str
    completed_at: str | None = None


class GenerationCreateRequest(BaseModel):
    mood: str = Field(min_length=3, max_length=30)
    prompt: str = Field(min_length=1, max_length=180)
    duration_sec: int = Field(default=180, ge=30, le=900)
    title: str | None = Field(default=None, max_length=80)


class GenerationJobOut(BaseModel):
    job_id: str
    user_id: str
    mood: str
    prompt: str
    prompt_normalized: str
    model: str
    status: str
    duration_sec: int
    created_at: str
    completed_at: str | None = None
    track: TrackOut | None = None


class CatalogMoodOut(BaseModel):
    key: str
    label: str
    description: str


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=10)


class ApiMessage(BaseModel):
    message: str
