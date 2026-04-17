"""ACE-Step 1.5 API client — handles submit, poll, and audio download."""

import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Module-level httpx client, initialised by lifespan in main.py
_client: httpx.AsyncClient | None = None


def init_client() -> None:
    global _client
    settings = get_settings()
    _client = httpx.AsyncClient(
        base_url=settings.ace_api_base_url.rstrip("/"),
        headers=settings.ace_headers,
        timeout=30.0,
    )


async def close_client() -> None:
    global _client
    if _client:
        await _client.aclose()
        _client = None


def _get_client() -> httpx.AsyncClient:
    if not _client:
        raise RuntimeError("ACE client not initialised — is ace_api_base_url set?")
    return _client


async def submit_task(
    prompt: str,
    duration_sec: int,
    audio_format: str = "mp3",
) -> str:
    """Submit a text2music task. Returns ace task_id."""
    client = _get_client()
    res = await client.post(
        "/release_task",
        json={
            "prompt": prompt,
            "lyrics": "",
            "task_type": "text2music",
            "audio_duration": duration_sec,
            "audio_format": audio_format,
            "batch_size": 1,
        },
    )
    res.raise_for_status()
    body = res.json()
    task_id = body["data"]["task_id"]
    logger.info("ACE task submitted: %s", task_id)
    return task_id


async def poll_task(task_id: str) -> dict:
    """Poll task status. Returns {status: 0|1|2, audio_path: str|None}."""
    client = _get_client()
    res = await client.post(
        "/query_result",
        json={"task_id_list": [task_id]},
    )
    res.raise_for_status()
    items = res.json()["data"]
    if not items:
        return {"status": 0, "audio_path": None}

    item = items[0]
    status = item["status"]  # 0=queued/running, 1=succeeded, 2=failed

    audio_path = None
    if status == 1 and item.get("result"):
        result = item["result"]
        if isinstance(result, str):
            result = json.loads(result)
        # result.file 是 "/v1/audio?path=..." 格式
        audio_path = result.get("file")

    return {"status": status, "audio_path": audio_path}


def build_audio_url(audio_path: str) -> str:
    """Turn ACE relative audio path into full URL."""
    settings = get_settings()
    base = settings.ace_api_base_url.rstrip("/")
    # audio_path 可能已經是 "/v1/audio?path=..." 或只是 path
    if audio_path.startswith("/"):
        return f"{base}{audio_path}"
    return f"{base}/v1/audio?path={audio_path}"
