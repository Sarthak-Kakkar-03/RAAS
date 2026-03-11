from __future__ import annotations

from fastapi import APIRouter, Depends

from api.core.auth import get_bearer_token, require_project_key
from api.models.schemas import IngestBatchOut
from api.services.index_job_service import ingest_pending_docs

router = APIRouter(prefix="/projects/{project_id}", tags=["ingest"])


@router.post("/ingest", response_model=IngestBatchOut)
def ingest(project_id: str, token: str = Depends(get_bearer_token)):
    require_project_key(project_id, token)
    result = ingest_pending_docs(project_id)

    return IngestBatchOut(
        ok=result["failed_count"] == 0,
        project_id=project_id,
        processed=result["processed"],
        ingested_count=result["ingested_count"],
        failed_count=result["failed_count"],
        ingested=result["ingested"],
        failed=result["failed"],
    )
