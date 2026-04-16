from fastapi import APIRouter

from app.core.config import get_settings

settings = get_settings()
router = APIRouter(tags=["system"])


@router.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "env": settings.app_env,
        "music_provider": {
            "model": settings.ace_model,
            "configured": bool(settings.ace_api_key and settings.ace_api_base_url),
            "base_url": settings.ace_api_base_url,
        },
        "supabase": {
            "configured": bool(settings.supabase_url and settings.supabase_service_role_key),
            "url": settings.supabase_url,
            "storage_bucket": settings.supabase_storage_bucket,
        },
    }
