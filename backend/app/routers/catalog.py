from fastapi import APIRouter

from app.domain import MOODS
from app.schemas import CatalogMoodOut

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/moods", response_model=list[CatalogMoodOut])
def list_moods() -> list[CatalogMoodOut]:
    return [
        CatalogMoodOut(key=key, label=value["label"], description=value["description"])
        for key, value in MOODS.items()
    ]
