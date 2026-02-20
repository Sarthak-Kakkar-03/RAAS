from fastapi import FastAPI, Header, UploadFile, File, HTTPException
from pathlib import Path
import shutil
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi.concurrency import run_in_threadpool
import time
import uuid

DATA_DIR = Path("data")
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Initialize fast api app
# Skeleton for now
app = FastAPI(title="RaaS", version="0.1.0")

class ProjectCreate(BaseModel):
    name: str

class ProjectOut(BaseModel):
    id: str
    name: str
    api_key: str
    
class QueryIn(BaseModel):
    query: str
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None
    
class QueryOut(BaseModel):
    results: List[Dict[str, Any]]
    latency_ms: int
    retrieval_debug: Dict[str, Any]
    
# ----Temp placeholders
PROJECTS: Dict[str, ProjectOut] = {}
JOBS: Dict[str, Dict[str, Any]] = {}

def require_project_key(project_id: str, authorization: Optional[str]):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if token != proj.api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return proj

@app.get("/health")
def health():
    return {
        "status": "ok"
    }

@app.post("/projects", response_model=ProjectOut)
def create_project(body: ProjectCreate):
    project_id = uuid.uuid4().hex[:12] # not expecting high collision risk
    api_key = uuid.uuid4().hex # need for safety
    proj = ProjectOut(id=project_id, name=body.name, api_key=api_key)
    PROJECTS[project_id] = proj
    return proj

@app.get("/projects", response_model=List[ProjectOut])
def list_projects():
    return list(PROJECTS.values())
        
@app.post("/projects/{project_id}/documents")
async def upload_document(
    project_id: str,
    authorization: Optional[str] = Header(default=None),
    file: UploadFile = File(...)
):
    require_project_key(project_id, authorization)

    # V1: just accept and store later (S3/local). For now, just validate.
    filename = file.filename or "uploaded"
    return {"ok": True, "project_id": project_id, "filename": filename}

@app.get("/projects/{project_id}/documents")
def list_documents(project_id: str, authorization: Optional[str] = Header(default=None)):
    require_project_key(project_id, authorization)
    # V1 placeholder
    return {"documents": []}

@app.post("/projects/{project_id}/index")
def start_index_job(project_id: str, authorization: Optional[str] = Header(default=None)):
    require_project_key(project_id, authorization)

    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {"status": "queued", "project_id": project_id, "created_at": time.time()}
    # V1: we’ll mark running/succeeded once we wire the worker
    return {"job_id": job_id}

@app.get("/jobs/{job_id}")
def job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.post("/projects/{project_id}/query", response_model=QueryOut)
def query_project(
    project_id: str,
    body: QueryIn,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)

    t0 = time.time()
    # placeholder retrieval
    results = []
    latency_ms = int((time.time() - t0) * 1000)

    return QueryOut(
        results=results,
        latency_ms=latency_ms,
        retrieval_debug={"project_id": project_id, "top_k": body.top_k}
    )
    
@app.post("/retrieve")
def retrieve_alias(body: QueryIn):
    return {"note": "Use /projects/{project_id}/query", "received": body.model_dump()}
