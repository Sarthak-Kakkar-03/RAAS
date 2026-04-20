from __future__ import annotations

import logging
import time
import uuid
from dataclasses import asdict
from fastapi import APIRouter, Depends, HTTPException, Query

from api.core.auth import get_bearer_token, require_project_key
from api.models.schemas import (
    QueryIn,
    QueryOut,
    RelevanceCheckIn,
    RelevanceCheckOut,
    RetrievalSummaryOut,
    RetrievalTraceListOut,
)
from api.services.relevance_service import (
    check_relevance_distance,
    relevance_metadata,
)
from api.services.retrieval_registry import (
    create_retrieval_event,
    get_retrieval_summary,
    list_retrieval_events,
)
from api.services.retrieval_service import retrieve

router = APIRouter(prefix="/projects/{project_id}", tags=["query"])
logger = logging.getLogger(__name__)


@router.post("/query", response_model=QueryOut)
def query_project(
    project_id: str,
    body: QueryIn,
    token: str = Depends(get_bearer_token),
):
    """
    Handle a project-specific vector search request and return retrieval results.

    Parameters:
        project_id (str): Identifier of the project to query.
        body (QueryIn): Query payload containing `query`, `top_k`, and optional `where` filter.
        token (str): Bearer token extracted by dependency for project authorization.

    Returns:
        QueryOut: Object containing `results`, `latency_ms`, and `retrieval_debug`
        with trace metadata for the request.

    Raises:
        HTTPException: With status 500 for unexpected failures, or re-raises existing HTTPException instances.
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
        traced_hits = [hit for hit in hits[:5] if hit.get("distance") is not None]
        trace_id = None
        try:
            trace = create_retrieval_event(
                event_id=uuid.uuid4().hex[:12],
                project_id=project_id,
                query=body.query,
                top_k=body.top_k,
                hit_count=len(hits),
                latency_ms=latency_ms,
                where=body.where,
                top_hit_ids=[str(hit["id"]) for hit in traced_hits],
                top_hit_distances=[float(hit["distance"]) for hit in traced_hits],
                top_hit_texts=[str(hit.get("text") or "") for hit in traced_hits],
                top_hit_metadatas=[
                    (
                        hit.get("metadata")
                        if isinstance(hit.get("metadata"), dict)
                        else None
                    )
                    for hit in traced_hits
                ],
            )
            trace_id = trace.event_id
        except Exception as exc:
            logger.exception(
                "Failed to persist retrieval trace: %s",
                exc,
                extra={
                    "project_id": project_id,
                    "top_k": body.top_k,
                    "hit_count": len(hits),
                    "latency_ms": latency_ms,
                    "filters_applied": body.where is not None,
                },
            )
        return QueryOut(
            results=hits,
            latency_ms=latency_ms,
            retrieval_debug={
                "project_id": project_id,
                "top_k": body.top_k,
                "hit_count": len(hits),
                "trace_id": trace_id,
                "filters_applied": body.where is not None,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            "Query failed",
            extra={
                "project_id": project_id,
                "top_k": body.top_k,
                "filters_applied": body.where is not None,
            },
        )
        raise HTTPException(status_code=500, detail="Query failed") from e


@router.post("/relevance-check", response_model=RelevanceCheckOut)
def relevance_check(
    project_id: str,
    body: RelevanceCheckIn,
    token: str = Depends(get_bearer_token),
):
    """Embed a transient text payload and return nearest content distances."""
    try:
        require_project_key(project_id, token)
        t0 = time.time()
        hits = check_relevance_distance(
            project_id=project_id,
            text=body.text,
            top_k=body.top_k,
            where=body.where,
        )
        latency_ms = int((time.time() - t0) * 1000)
        metadata = relevance_metadata()
        min_distance = min((hit["distance"] for hit in hits), default=None)
        flagged = (
            body.distance_threshold is not None
            and min_distance is not None
            and min_distance > body.distance_threshold
        )
        return RelevanceCheckOut(
            project_id=project_id,
            embedding_model=metadata["embedding_model"],
            distance_metric=metadata["distance_metric"],
            probe_format=metadata["probe_format"],
            distance_threshold=body.distance_threshold,
            min_distance=min_distance,
            flagged=flagged,
            hit_count=len(hits),
            latency_ms=latency_ms,
            results=hits,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            "Relevance check failed",
            extra={
                "project_id": project_id,
                "top_k": body.top_k,
                "filters_applied": body.where is not None,
                "threshold_provided": body.distance_threshold is not None,
            },
        )
        raise HTTPException(status_code=500, detail="Relevance check failed") from e


@router.get("/queries", response_model=RetrievalTraceListOut)
def list_project_queries(
    project_id: str,
    limit: int = Query(50, ge=1, le=100),
    token: str = Depends(get_bearer_token),
):
    """Return recent retrieval traces for the given project."""
    require_project_key(project_id, token)
    traces = list_retrieval_events(project_id, limit=limit)
    return RetrievalTraceListOut(
        project_id=project_id,
        count=len(traces),
        traces=[asdict(trace) for trace in traces],
    )


@router.get("/queries/summary", response_model=RetrievalSummaryOut)
def get_project_query_summary(
    project_id: str,
    token: str = Depends(get_bearer_token),
):
    """Return aggregate retrieval metrics for the given project."""
    require_project_key(project_id, token)
    summary = get_retrieval_summary(project_id)
    return RetrievalSummaryOut(**asdict(summary))
