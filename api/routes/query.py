from __future__ import annotations

import time
from fastapi import APIRouter, Depends, HTTPException

from api.core.auth import get_bearer_token, require_project_key
from api.models.schemas import QueryIn, QueryOut
from api.services.retrieval_service import retrieve

router = APIRouter(prefix="/projects/{project_id}", tags=["query"])


@router.post("/query", response_model=QueryOut)
def query_project(
    project_id: str,
    body: QueryIn,
    token: str = Depends(get_bearer_token),
):
    """
    Handle a project-specific vector search request and return retrieval results with timing and debug info.
    
    Parameters:
        project_id (str): Identifier of the project to query.
        body (QueryIn): Query payload containing `query`, `top_k`, and optional `where` filter.
        token (str): Bearer token extracted by dependency for project authorization.
    
    Returns:
        QueryOut: Object containing `results` (retrieval hits), `latency_ms` (round-trip time in milliseconds), and `retrieval_debug` (diagnostic map with `project_id` and `top_k`).
    
    Raises:
        HTTPException: With status 400 if the request parameters are invalid (ValueError), with status 500 for unexpected failures, or re-raises existing HTTPException instances.
    """
    try:
        require_project_key(project_id, token)
        t0 = time.time()
        hits = retrieve(
            project_id=project_id,
            query=body.query,
            top_k=body.top_k,
            where=body.where,
        )
        latency_ms = int((time.time() - t0) * 1000)
        return QueryOut(
            results=hits,
            latency_ms=latency_ms,
            retrieval_debug={"project_id": project_id, "top_k": body.top_k},
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Query failed") from e
