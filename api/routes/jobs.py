import logging
import time
import uuid
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from api.core.auth import require_project_key
from api.core.store import JOBS
from api.services.index_job_service import ingest_pending_docs

router = APIRouter(tags=["jobs"])
logger = logging.getLogger(__name__)


def _run_index_job(job_id: str, project_id: str) -> None:
    JOBS[job_id]["status"] = "running"
    JOBS[job_id]["started_at"] = time.time()
    try:
        result = ingest_pending_docs(project_id)
        JOBS[job_id].update(
            {
                "status": "completed",
                "finished_at": time.time(),
                "result": {
                    "ok": result["failed_count"] == 0,
                    "project_id": project_id,
                    **result,
                },
            }
        )
    except Exception:
        logger.exception(
            "Index job failed",
            extra={"job_id": job_id, "project_id": project_id},
        )
        JOBS[job_id].update(
            {
                "status": "failed",
                "finished_at": time.time(),
                "error": "Index job failed",
            }
        )


@router.post("/projects/{project_id}/index")
def start_index_job(
    project_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)

    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {
        "status": "queued",
        "project_id": project_id,
        "created_at": time.time(),
    }
    background_tasks.add_task(_run_index_job, job_id, project_id)
    return {"job_id": job_id, "status": "queued"}


@router.get("/jobs/{job_id}")
def job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
