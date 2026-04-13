from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from api.core.db import get_conn


@dataclass(frozen=True)
class RetrievalEvent:
    event_id: str
    project_id: str
    query: str
    top_k: int
    hit_count: int
    latency_ms: int
    where: Optional[Dict[str, Any]]
    top_hit_ids: List[str]
    top_hit_distances: List[float]
    created_at: str


@dataclass(frozen=True)
class RetrievalSummary:
    project_id: str
    total_queries: int
    avg_latency_ms: float
    zero_hit_queries: int
    filtered_queries: int
    avg_hit_count: float
    last_queried_at: Optional[str]


def _row_to_retrieval_event(row) -> RetrievalEvent:
    """Convert a SQLite row into a retrieval event record."""
    return RetrievalEvent(
        event_id=row["event_id"],
        project_id=row["project_id"],
        query=row["query_text"],
        top_k=row["top_k"],
        hit_count=row["hit_count"],
        latency_ms=row["latency_ms"],
        where=json.loads(row["where_json"]) if row["where_json"] else None,
        top_hit_ids=json.loads(row["top_hit_ids_json"] or "[]"),
        top_hit_distances=json.loads(row["top_hit_distances_json"] or "[]"),
        created_at=row["created_at"],
    )


def init_retrieval_registry() -> None:
    """Create the retrieval events table and supporting indexes."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS retrieval_events (
                event_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                query_text TEXT NOT NULL,
                top_k INTEGER NOT NULL CHECK (top_k >= 1),
                hit_count INTEGER NOT NULL CHECK (hit_count >= 0),
                latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
                where_json TEXT,
                top_hit_ids_json TEXT NOT NULL,
                top_hit_distances_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_retrieval_events_project_created
            ON retrieval_events(project_id, created_at DESC)
            """)


def create_retrieval_event(
    *,
    event_id: str,
    project_id: str,
    query: str,
    top_k: int,
    hit_count: int,
    latency_ms: int,
    where: Optional[Dict[str, Any]],
    top_hit_ids: List[str],
    top_hit_distances: List[float],
) -> RetrievalEvent:
    """Persist one retrieval event and return the normalized record."""
    init_retrieval_registry()
    created_at = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO retrieval_events (
                event_id,
                project_id,
                query_text,
                top_k,
                hit_count,
                latency_ms,
                where_json,
                top_hit_ids_json,
                top_hit_distances_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                project_id,
                query,
                top_k,
                hit_count,
                latency_ms,
                json.dumps(where) if where is not None else None,
                json.dumps(top_hit_ids),
                json.dumps(top_hit_distances),
                created_at,
            ),
        )
    return RetrievalEvent(
        event_id=event_id,
        project_id=project_id,
        query=query,
        top_k=top_k,
        hit_count=hit_count,
        latency_ms=latency_ms,
        where=where,
        top_hit_ids=top_hit_ids,
        top_hit_distances=top_hit_distances,
        created_at=created_at,
    )


def list_retrieval_events(project_id: str, *, limit: int = 50) -> List[RetrievalEvent]:
    """List recent retrieval events for a project."""
    init_retrieval_registry()
    bounded_limit = max(1, min(limit, 100))
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM retrieval_events
            WHERE project_id=?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (project_id, bounded_limit),
        ).fetchall()
    return [_row_to_retrieval_event(row) for row in rows]


def get_retrieval_summary(project_id: str) -> RetrievalSummary:
    """Return aggregated retrieval metrics for a project."""
    init_retrieval_registry()
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_queries,
                AVG(latency_ms) AS avg_latency_ms,
                SUM(CASE WHEN hit_count = 0 THEN 1 ELSE 0 END) AS zero_hit_queries,
                SUM(CASE WHEN where_json IS NOT NULL THEN 1 ELSE 0 END) AS filtered_queries,
                AVG(hit_count) AS avg_hit_count,
                MAX(created_at) AS last_queried_at
            FROM retrieval_events
            WHERE project_id=?
            """,
            (project_id,),
        ).fetchone()

    total_queries = int(row["total_queries"] or 0)
    return RetrievalSummary(
        project_id=project_id,
        total_queries=total_queries,
        avg_latency_ms=round(float(row["avg_latency_ms"] or 0.0), 2),
        zero_hit_queries=int(row["zero_hit_queries"] or 0),
        filtered_queries=int(row["filtered_queries"] or 0),
        avg_hit_count=round(float(row["avg_hit_count"] or 0.0), 2),
        last_queried_at=row["last_queried_at"] if total_queries else None,
    )
