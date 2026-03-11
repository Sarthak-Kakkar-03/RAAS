import logging
import time
import uuid
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from api.core.auth import require_project_key
from api.services.job_registry import create_job, get_job, update_job
from api.services.index_job_service import ingest_pending_docs

router = APIRouter(tags=["jobs"])
logger = logging.getLogger(__name__)


def _run_index_job(job_id: str, project_id: str) -> None:
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
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)

    job_id = uuid.uuid4().hex[:12]
    create_job(job_id=job_id, project_id=project_id, status="queued")
    background_tasks.add_task(_run_index_job, job_id, project_id)
    return {"job_id": job_id, "status": "queued"}


@router.get("/jobs/{job_id}")
def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
