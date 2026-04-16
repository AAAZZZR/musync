from fastapi import APIRouter, Depends, Header, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as id_token_module

from app.core.config import get_settings
from app.dependencies import get_current_user
from app.schemas import ApiMessage, AuthResponse, GoogleAuthRequest, LoginRequest, SignUpRequest, UserOut
from app.services import create_token, create_user
from app.state import TOKENS, USERS

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def auth_signup(payload: SignUpRequest) -> AuthResponse:
    user = create_user(email=payload.email, full_name=payload.full_name, password=payload.password)
    token = create_token(user["id"])
    return AuthResponse(access_token=token, user=UserOut(**{k: user[k] for k in ("id", "email", "created_at")}))


@router.post("/login", response_model=AuthResponse)
def auth_login(payload: LoginRequest) -> AuthResponse:
    user = next((item for item in USERS.values() if item["email"] == payload.email), None)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"])
    return AuthResponse(access_token=token, user=UserOut(**{k: user[k] for k in ("id", "email", "created_at")}))


@router.post("/logout", response_model=ApiMessage)
def auth_logout(authorization: str | None = Header(default=None)) -> ApiMessage:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
        TOKENS.pop(token, None)
    return ApiMessage(message="Logged out")


@router.get("/me", response_model=UserOut)
def auth_me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(**{k: user[k] for k in ("id", "email", "created_at")})


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in not configured")
    try:
        info = id_token_module.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}")

    email = info.get("email")
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email not verified")
    full_name = info.get("name") or email.split("@")[0]

    existing = next((u for u in USERS.values() if u["email"] == email), None)
    if existing:
        user = existing
    else:
        user = create_user(email=email, full_name=full_name, password=None)

    token = create_token(user["id"])
    return AuthResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], created_at=user["created_at"]),
    )
