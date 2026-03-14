import logging
import sqlite3
import time
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from api.core.auth import get_bearer_token, require_project_key
from api.services.job_registry import (
    create_job,
    get_active_job,
    get_job,
    update_job,
)
from api.services.index_job_service import ingest_pending_docs

router = APIRouter(tags=["jobs"])
logger = logging.getLogger(__name__)


def _run_index_job(job_id: str, project_id: str) -> None:
    """Execute an index job and persist its final status."""
    update_job(job_id, status="running", started_at=time.time())
    try:
        result = ingest_pending_docs(project_id)
        update_job(
            job_id,
            status="completed",
            finished_at=time.time(),
            result={
                "ok": result["failed_count"] == 0,
                "project_id": project_id,
                **result,
            },
        )
    except Exception:
        logger.exception(
            "Index job failed",
            extra={"job_id": job_id, "project_id": project_id},
        )
        update_job(
            job_id,
            status="failed",
            finished_at=time.time(),
            error="Index job failed",
        )


@router.post("/projects/{project_id}/index")
def start_index_job(
    project_id: str,
    background_tasks: BackgroundTasks,
    token: str = Depends(get_bearer_token),
):
    """
    Create and queue a new indexing job for the given project.

    Verifies access for the provided project, ensures no other active job exists for that project,
    persists a new queued job, and schedules the job to run in the background.

    Returns:
        dict: A payload containing `job_id` (the new job's identifier) and `status` set to `"queued"`.

    Raises:
        HTTPException: With status 409 when an index job is already queued or running for the project.
    """
    require_project_key(project_id, token)

    active_job = get_active_job(project_id)
    if active_job:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "An index job is already queued or running for this project.",
                "job_id": active_job["job_id"],
                "status": active_job["status"],
            },
        )

    job_id = uuid.uuid4().hex[:12]
    try:
        create_job(job_id=job_id, project_id=project_id, status="queued")
    except sqlite3.IntegrityError:
        active_job = get_active_job(project_id)
        raise HTTPException(
            status_code=409,
            detail={
                "message": "An index job is already queued or running for this project.",
                "job_id": active_job["job_id"] if active_job else None,
                "status": active_job["status"] if active_job else None,
            },
        ) from None

    background_tasks.add_task(_run_index_job, job_id, project_id)
    return {"job_id": job_id, "status": "queued"}


@router.get("/jobs/{job_id}")
def job_status(job_id: str, token: str = Depends(get_bearer_token)):
    """
    Retrieve a job by its ID and verify access to the associated project.

    Parameters:
        job_id (str): The identifier of the job to retrieve.

    Returns:
        dict: The job record.

    Raises:
        HTTPException: 404 if no job with the given ID exists.
        HTTPException: 403 if the token does not grant access to the job's project.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    require_project_key(job["project_id"], token)
    return job
