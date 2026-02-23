from fastapi import APIRouter
from api.services.chroma_repo import ChromaRepo

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok", "chroma_ok": ChromaRepo().heartbeat()}
