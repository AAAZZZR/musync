"""Signed URL 產生 — 驗權 + 產 Supabase signed URL。"""

import json
import logging
from urllib.parse import quote

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_TTL_SEC = 3600


async def create_signed_url(storage_path: str, ttl_sec: int = DEFAULT_TTL_SEC) -> str:
    """產生 Supabase private bucket signed URL。"""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase not configured")

    bucket = settings.supabase_storage_bucket
    encoded = quote(storage_path, safe="/")
    url = f"{settings.supabase_url}/storage/v1/object/sign/{bucket}/{encoded}"

    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(url, headers=headers, content=json.dumps({"expiresIn": ttl_sec}))
        res.raise_for_status()
        body = res.json()

    signed = body.get("signedURL") or body.get("signedUrl")
    if not signed:
        raise RuntimeError(f"No signedURL in response: {body}")

    # signedURL 是相對路徑；補完整 URL
    if signed.startswith("/"):
        return f"{settings.supabase_url}/storage/v1{signed}"
    return f"{settings.supabase_url}/storage/v1/{signed}"


async def delete_object(storage_path: str) -> bool:
    """刪 Storage 內的物件。回 True = 刪了或本來就沒有；False = 真錯誤。"""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase not configured")

    bucket = settings.supabase_storage_bucket
    encoded = quote(storage_path, safe="/")
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{encoded}"

    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.delete(url, headers=headers)

    if res.status_code == 200 or res.status_code == 404:
        return True
    logger.warning("delete_object %s failed: %s %s", storage_path, res.status_code, res.text)
    return False
