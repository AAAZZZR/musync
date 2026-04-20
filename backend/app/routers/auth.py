"""Auth endpoints — 包住 Supabase GoTrue，讓前端只知道這個後端。"""

import base64
import hashlib
import logging
from secrets import token_urlsafe
from urllib.parse import quote

from fastapi import APIRouter, Cookie, HTTPException, Header, Request
from fastapi.responses import RedirectResponse

from app import supabase_auth
from app.core.config import get_settings
from app.schemas import AuthSessionOut, LoginRequest, RefreshRequest, SignupRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

SUPPORTED_PROVIDERS = {"google"}
OAUTH_VERIFIER_COOKIE = "mu_oauth_verifier"
OAUTH_NEXT_COOKIE = "mu_oauth_next"
ACCESS_COOKIE = "mu_access"
REFRESH_COOKIE = "mu_refresh"
REFRESH_MAX_AGE = 30 * 24 * 60 * 60


def _cookie_kwargs(max_age: int) -> dict:
    settings = get_settings()
    return {
        "httponly": True,
        "secure": settings.app_env == "production",
        "samesite": "lax",
        "max_age": max_age,
        "path": "/",
    }


def _session_out(data: dict) -> AuthSessionOut:
    user = data.get("user") or {}
    user_id = user.get("id") or data.get("user_id") or ""
    email = user.get("email") or data.get("email") or ""
    access = data.get("access_token")
    refresh = data.get("refresh_token")
    if not access or not refresh:
        raise HTTPException(
            status_code=400,
            detail="No session returned — signup may require email confirmation",
        )
    return AuthSessionOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=data.get("expires_in") or 3600,
        expires_at=data.get("expires_at"),
        user_id=user_id,
        email=email,
    )


def _pkce_pair() -> tuple[str, str]:
    verifier = token_urlsafe(64)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge


@router.post("/signup", response_model=AuthSessionOut)
async def signup(payload: SignupRequest) -> AuthSessionOut:
    data = await supabase_auth.sign_up(payload.email, payload.password, payload.full_name)
    return _session_out(data)


@router.post("/login", response_model=AuthSessionOut)
async def login(payload: LoginRequest) -> AuthSessionOut:
    data = await supabase_auth.sign_in_with_password(payload.email, payload.password)
    return _session_out(data)


@router.post("/refresh", response_model=AuthSessionOut)
async def refresh(payload: RefreshRequest) -> AuthSessionOut:
    data = await supabase_auth.refresh_session(payload.refresh_token)
    return _session_out(data)


@router.post("/logout")
async def logout(authorization: str | None = Header(default=None)) -> dict:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        await supabase_auth.sign_out(token)
    return {"ok": True}


@router.get("/oauth/{provider}")
async def oauth_start(provider: str, request: Request, next: str = "/app/dashboard"):
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(400, detail=f"Unsupported provider: {provider}")

    settings = get_settings()
    verifier, challenge = _pkce_pair()

    callback_url = str(request.url_for("oauth_callback"))
    supabase_url = settings.supabase_url.rstrip("/")
    authorize = (
        f"{supabase_url}/auth/v1/authorize"
        f"?provider={provider}"
        f"&redirect_to={quote(callback_url, safe='')}"
        f"&code_challenge={challenge}"
        f"&code_challenge_method=S256"
    )

    response = RedirectResponse(authorize)
    response.set_cookie(OAUTH_VERIFIER_COOKIE, verifier, **_cookie_kwargs(600))
    response.set_cookie(OAUTH_NEXT_COOKIE, next, **_cookie_kwargs(600))
    return response


@router.get("/oauth/callback", name="oauth_callback")
async def oauth_callback(
    request: Request,
    code: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    mu_oauth_verifier: str | None = Cookie(default=None),
    mu_oauth_next: str | None = Cookie(default=None),
):
    settings = get_settings()
    app_url = settings.app_url.rstrip("/")

    if error:
        logger.warning("OAuth error: %s %s", error, error_description)
        return RedirectResponse(f"{app_url}/login?error={quote(error)}")

    if not code:
        return RedirectResponse(f"{app_url}/login?error=missing_code")

    if not mu_oauth_verifier:
        return RedirectResponse(f"{app_url}/login?error=missing_verifier")

    try:
        data = await supabase_auth.exchange_pkce_code(code, mu_oauth_verifier)
    except HTTPException as e:
        logger.warning("PKCE exchange failed: %s", e.detail)
        return RedirectResponse(f"{app_url}/login?error=exchange_failed")

    access = data.get("access_token")
    refresh = data.get("refresh_token")
    expires_in = int(data.get("expires_in") or 3600)
    if not access or not refresh:
        return RedirectResponse(f"{app_url}/login?error=no_session")

    next_path = mu_oauth_next if (mu_oauth_next and mu_oauth_next.startswith("/")) else "/app/dashboard"

    response = RedirectResponse(f"{app_url}{next_path}")
    response.set_cookie(ACCESS_COOKIE, access, **_cookie_kwargs(expires_in))
    response.set_cookie(REFRESH_COOKIE, refresh, **_cookie_kwargs(REFRESH_MAX_AGE))
    response.delete_cookie(OAUTH_VERIFIER_COOKIE, path="/")
    response.delete_cookie(OAUTH_NEXT_COOKIE, path="/")
    return response
