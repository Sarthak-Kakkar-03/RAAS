from __future__ import annotations

import time
from typing import Optional
from fastapi import APIRouter, Header, HTTPException

from api.core.auth import require_project_key
from api.models.schemas import QueryIn, QueryOut
from api.services.retrieval_service import retrieve

router = APIRouter(prefix="/projects/{project_id}", tags=["query"])


@router.post("/query", response_model=QueryOut)
def query_project(
    project_id: str,
    body: QueryIn,
    authorization: Optional[str] = Header(default=None),
):
    try:
        require_project_key(project_id, authorization)
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
