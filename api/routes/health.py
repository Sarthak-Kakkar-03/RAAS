from fastapi import APIRouter
from ..services.chroma_service import heartbeat

router = APIRouter(tags=["health"])

@router.get("/health")
def health():
    return {
        "status": "ok",
        "chroma_ok": heartbeat()
    }