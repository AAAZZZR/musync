"""Supabase Storage 上傳 — 從 ACE 下載 wav、ffmpeg 轉 mp3、PUT 到 Storage。"""

import asyncio
import logging
from urllib.parse import quote

import httpx

from app.ace_client import _get_client
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def _download_wav_from_ace(audio_path: str) -> bytes:
    """audio_path 可能是 '/v1/audio?path=...' 或相對 path。回傳 wav binary。"""
    client = _get_client()
    url = audio_path if audio_path.startswith("/v1/audio") else f"/v1/audio?path={audio_path}"
    res = await client.get(url, timeout=120.0)
    res.raise_for_status()
    return res.content


async def _wav_to_mp3(wav_bytes: bytes) -> bytes:
    """pipe wav → ffmpeg → mp3 bytes。128kbps CBR。"""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "wav",
        "-i",
        "pipe:0",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "128k",
        "-f",
        "mp3",
        "pipe:1",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    mp3_bytes, stderr = await proc.communicate(wav_bytes)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {stderr.decode(errors='replace')}")
    return mp3_bytes


async def _upload_to_supabase(storage_path: str, mp3_bytes: bytes) -> None:
    """上傳 mp3 到 Supabase Storage（private bucket）。"""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

    bucket = settings.supabase_storage_bucket
    encoded_path = quote(storage_path, safe="/")
    upload_url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{encoded_path}"

    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": "audio/mpeg",
        "x-upsert": "true",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(upload_url, headers=headers, content=mp3_bytes)
        res.raise_for_status()

    logger.info("uploaded %s (%d bytes)", storage_path, len(mp3_bytes))


async def upload_ace_audio(ace_audio_path: str, storage_path: str) -> str:
    """
    從 ACE 下載 wav、轉 mp3、上傳到 Supabase Storage。

    Args:
        ace_audio_path: ACE 回的 audio path（如 `/v1/audio?path=%2Fworkspace%2F...`）
        storage_path: Storage 內的目標路徑（如 `seed/focus_seed_1.mp3` 或 `users/<uid>/<track_id>.mp3`）

    Returns:
        storage_path（用於 DB 儲存；播放時前端 signed URL 自己產）
    """
    wav_bytes = await _download_wav_from_ace(ace_audio_path)
    mp3_bytes = await _wav_to_mp3(wav_bytes)
    await _upload_to_supabase(storage_path, mp3_bytes)
    return storage_path


async def upload_local_wav(wav_path: str, storage_path: str) -> str:
    """從本地 wav 檔案上傳（migration script 用）。回 storage_path。"""
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()
    mp3_bytes = await _wav_to_mp3(wav_bytes)
    await _upload_to_supabase(storage_path, mp3_bytes)
    return storage_path
