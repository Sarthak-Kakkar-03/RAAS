from fastapi import APIRouter
from api.services.chroma_repo import ChromaRepo

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Report API liveness and whether Chroma responds to a heartbeat."""
    return {"status": "ok", "chroma_ok": ChromaRepo().heartbeat()}
