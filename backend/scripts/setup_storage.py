"""
建立 Supabase Storage `audio` bucket（private）。冪等：已存在 public=true 的會切成 private。

Usage:
  cd backend
  python -m scripts.setup_storage
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402

from app.core.config import get_settings  # noqa: E402


async def main():
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定")

    bucket = settings.supabase_storage_bucket
    base = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        existing = await client.get(f"{base}/storage/v1/bucket")
        existing.raise_for_status()
        rows = existing.json()
        match = next((b for b in rows if b.get("name") == bucket), None)

        if match:
            if match.get("public"):
                res = await client.put(
                    f"{base}/storage/v1/bucket/{bucket}",
                    json={"public": False},
                )
                res.raise_for_status()
                print(f'bucket "{bucket}" 已從 public 切成 private')
            else:
                print(f'bucket "{bucket}" 已存在且 private — 跳過')
            return

        res = await client.post(
            f"{base}/storage/v1/bucket",
            json={
                "name": bucket,
                "id": bucket,
                "public": False,
                "file_size_limit": 52_428_800,
                "allowed_mime_types": ["audio/mpeg", "audio/wav"],
            },
        )
        res.raise_for_status()
        print(f'bucket "{bucket}" 建立完成（private, 50MB, mp3/wav）')


if __name__ == "__main__":
    asyncio.run(main())
