from fastapi import APIRouter
from api.models.schemas import QueryIn

router = APIRouter(tags=["legacy"])


@router.post("/retrieve")
def retrieve_alias(body: QueryIn):
    return {"note": "Use /projects/{project_id}/query", "received": body.model_dump()}
