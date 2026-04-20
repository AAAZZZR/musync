"""Thin httpx 封裝 Supabase GoTrue REST — email/password auth 流程。"""

import logging
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _headers() -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY not configured")
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL not configured")
    return settings.supabase_url.rstrip("/")


async def _post(path: str, body: dict[str, Any], access_token: str | None = None) -> dict:
    url = f"{_base_url()}/auth/v1{path}"
    headers = _headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(url, headers=headers, json=body)

    if res.status_code >= 400:
        detail: Any
        try:
            data = res.json()
            detail = data.get("msg") or data.get("error_description") or data.get("error") or data
        except Exception:
            detail = res.text
        raise HTTPException(status_code=res.status_code, detail=detail)

    try:
        return res.json()
    except Exception:
        return {}


async def sign_up(email: str, password: str, full_name: str) -> dict:
    """建立新帳號。若 Dashboard 啟用 email 驗證，session 會是 null（需要先驗證）。"""
    return await _post(
        "/signup",
        {
            "email": email,
            "password": password,
            "data": {"full_name": full_name},
        },
    )


async def sign_in_with_password(email: str, password: str) -> dict:
    """Email + password 登入。成功回 session（含 access_token + refresh_token）。"""
    return await _post(
        "/token?grant_type=password",
        {"email": email, "password": password},
    )


async def refresh_session(refresh_token: str) -> dict:
    """用 refresh_token 換新 session。"""
    return await _post(
        "/token?grant_type=refresh_token",
        {"refresh_token": refresh_token},
    )


async def sign_out(access_token: str) -> None:
    """Revoke 當前 session。失敗不 raise（logout 應該始終成功）。"""
    url = f"{_base_url()}/auth/v1/logout"
    headers = _headers()
    headers["Authorization"] = f"Bearer {access_token}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, headers=headers)
    except Exception as e:
        logger.warning("sign_out failed (ignored): %s", e)


async def exchange_pkce_code(auth_code: str, code_verifier: str) -> dict:
    """OAuth PKCE flow：用 auth code + verifier 換 session。"""
    return await _post(
        "/token?grant_type=pkce",
        {"auth_code": auth_code, "code_verifier": code_verifier},
    )
