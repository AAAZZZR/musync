"""ACE-Step 1.5 API client — handles submit, poll, and audio download."""

import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

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


async def submit_task(prompt: str, duration_sec: int, max_retries: int = 3) -> str:
    """Submit a text2music task. Retries on empty response (RunPod proxy quirk)."""
    client = _get_client()
    payload = {
        "prompt": prompt,
        "lyrics": "",
        "task_type": "text2music",
        "duration": duration_sec,
        "audio_format": "wav",
        "batch_size": 1,
    }

    import asyncio

    for attempt in range(max_retries):
        res = await client.post("/release_task", json=payload)
        if res.status_code == 404 and not res.text:
            logger.warning("ACE /release_task returned empty 404, retrying (%d/%d)", attempt + 1, max_retries)
            await asyncio.sleep(2)
            continue
        res.raise_for_status()
        body = res.json()
        task_id = body["data"]["task_id"]
        logger.info("ACE task submitted: %s", task_id)
        return task_id

    raise RuntimeError("ACE /release_task failed after retries")


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
        if isinstance(result, list) and len(result) > 0:
            result = result[0]
        if isinstance(result, dict):
            audio_path = result.get("file") or None

    return {"status": status, "audio_path": audio_path}


def build_audio_url(audio_path: str) -> str:
    """Turn ACE relative audio path into full URL."""
    settings = get_settings()
    base = settings.ace_api_base_url.rstrip("/")
    if audio_path.startswith("/"):
        return f"{base}{audio_path}"
    return f"{base}/v1/audio?path={audio_path}"
