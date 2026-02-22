import time
import uuid
from typing import Optional
from fastapi import APIRouter, Header, HTTPException

from api.core.auth import require_project_key
from api.core.store import JOBS

router = APIRouter(tags=["jobs"])


@router.post("/projects/{project_id}/index")
def start_index_job(
    project_id: str, authorization: Optional[str] = Header(default=None)
):
    require_project_key(project_id, authorization)

    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {
        "status": "queued",
        "project_id": project_id,
        "created_at": time.time(),
    }
    return {"job_id": job_id}


@router.get("/jobs/{job_id}")
def job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
