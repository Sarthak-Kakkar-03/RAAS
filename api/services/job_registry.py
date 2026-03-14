from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from api.core.db import get_conn


def init_jobs_registry() -> None:
    """Create the jobs table and enforce one active job per project."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at REAL NOT NULL,
                started_at REAL,
                finished_at REAL,
                error TEXT,
                result_json TEXT,
                updated_at TEXT NOT NULL
            )
            """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_one_active_per_project
            ON jobs(project_id)
            WHERE status IN ('queued', 'running')
            """)


def create_job(
    *, job_id: str, project_id: str, status: str = "queued"
) -> Dict[str, Any]:
    """Persist a new job record and return its public fields."""
    init_jobs_registry()
    created_at = datetime.now(timezone.utc).timestamp()
    updated_at = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO jobs (job_id, project_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, project_id, status, created_at, updated_at),
        )
    return {
        "job_id": job_id,
        "project_id": project_id,
        "status": status,
        "created_at": created_at,
    }


def update_job(
    job_id: str,
    *,
    status: Optional[str] = None,
    started_at: Optional[float] = None,
    finished_at: Optional[float] = None,
    error: Optional[str] = None,
    result: Optional[Dict[str, Any]] = None,
) -> None:
    """Update mutable fields on an existing job record."""
    init_jobs_registry()

    fields = []
    params: list[Any] = []
    if status is not None:
        fields.append("status=?")
        params.append(status)
    if started_at is not None:
        fields.append("started_at=?")
        params.append(started_at)
    if finished_at is not None:
        fields.append("finished_at=?")
        params.append(finished_at)
    if error is not None:
        fields.append("error=?")
        params.append(error)
    if result is not None:
        fields.append("result_json=?")
        params.append(json.dumps(result))

    fields.append("updated_at=?")
    params.append(datetime.now(timezone.utc).isoformat())

    params.append(job_id)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE jobs SET {', '.join(fields)} WHERE job_id=?",  # nosec B608
            params,
        )


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a job by id and deserialize its stored result payload."""
    init_jobs_registry()
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT job_id, project_id, status, created_at, started_at, finished_at, error, result_json
            FROM jobs
            WHERE job_id=?
            """,
            (job_id,),
        ).fetchone()

    if not row:
        return None

    job: Dict[str, Any] = {
        "job_id": row["job_id"],
        "project_id": row["project_id"],
        "status": row["status"],
        "created_at": row["created_at"],
    }
    if row["started_at"] is not None:
        job["started_at"] = row["started_at"]
    if row["finished_at"] is not None:
        job["finished_at"] = row["finished_at"]
    if row["error"]:
        job["error"] = row["error"]
    if row["result_json"]:
        job["result"] = json.loads(row["result_json"])
    return job


def get_active_job(project_id: str) -> Optional[Dict[str, Any]]:
    """Return the queued or running job for a project, if one exists."""
    init_jobs_registry()
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT job_id, project_id, status, created_at, started_at, finished_at, error, result_json
            FROM jobs
            WHERE project_id=? AND status IN ('queued', 'running')
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (project_id,),
        ).fetchone()

    if not row:
        return None
    return get_job(row["job_id"])
