from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.ace_client import _get_client
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/audio", tags=["audio"])


@router.get("")
async def proxy_audio(path: str):
    """Proxy audio from ACE server. Frontend calls /api/audio?path=<encoded_path>."""
    if not settings.ace_api_base_url:
        raise HTTPException(status_code=503, detail="ACE not configured")

    client = _get_client()
    url = f"/v1/audio?path={path}"

    try:
        res = await client.send(
            client.build_request("GET", url),
            stream=True,
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="Audio not found")

        return StreamingResponse(
            res.aiter_bytes(),
            media_type="audio/wav",
            headers={"Accept-Ranges": "bytes"},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
