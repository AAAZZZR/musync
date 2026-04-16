from fastapi import APIRouter, Depends, Header, HTTPException

from app.dependencies import get_current_user
from app.schemas import ApiMessage, AuthResponse, LoginRequest, SignUpRequest, UserOut
from app.services import create_token, create_user
from app.state import TOKENS, USERS

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def auth_signup(payload: SignUpRequest) -> AuthResponse:
    user = create_user(payload.email, payload.password, payload.full_name)
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
