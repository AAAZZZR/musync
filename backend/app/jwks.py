"""Supabase JWKS fetch + cache — 用來驗證 ES256 簽名的 access_token。"""

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_keys: dict[str, dict] = {}


async def load_jwks() -> None:
    """從 Supabase 拉 JWKS，以 kid 為 key 快取。"""
    settings = get_settings()
    if not settings.supabase_url:
        logger.warning("SUPABASE_URL 未設定，跳過 JWKS load")
        return

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url)
        res.raise_for_status()

    data = res.json()
    global _keys
    _keys = {key["kid"]: key for key in data.get("keys", []) if "kid" in key}
    logger.info("JWKS loaded: %d key(s) [%s]", len(_keys), ", ".join(_keys.keys()))


async def get_key(kid: str) -> dict | None:
    """找 kid 對應的 JWK；cache miss 時重拉一次（處理 key rotation）。"""
    if kid in _keys:
        return _keys[kid]
    await load_jwks()
    return _keys.get(kid)


def clear_cache() -> None:
    """測試用：清快取。"""
    global _keys
    _keys = {}
