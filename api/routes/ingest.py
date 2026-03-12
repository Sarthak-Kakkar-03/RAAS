from __future__ import annotations

from fastapi import APIRouter, Depends

from api.core.auth import get_bearer_token, require_project_key
from api.models.schemas import IngestBatchOut
from api.services.index_job_service import ingest_pending_docs

router = APIRouter(prefix="/projects/{project_id}", tags=["ingest"])


@router.post("/ingest", response_model=IngestBatchOut)
def ingest(project_id: str, token: str = Depends(get_bearer_token)):
    """
    Trigger ingestion of pending documents for the specified project and return a summary of the ingest batch.
    
    Parameters:
        project_id (str): Identifier of the project whose pending documents will be ingested.
    
    Returns:
        IngestBatchOut: Summary of the ingestion operation containing:
            ok (bool): `true` if `failed_count` is 0, `false` otherwise.
            project_id (str): Echoes the provided `project_id`.
            processed (int): Number of documents processed.
            ingested_count (int): Number of documents successfully ingested.
            failed_count (int): Number of documents that failed to ingest.
            ingested (list): Details or identifiers of ingested documents.
            failed (list): Details or identifiers of documents that failed.
    """
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
