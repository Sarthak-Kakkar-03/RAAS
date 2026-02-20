import time
import uuid
from typing import Optional, List
from fastapi import APIRouter, Header, UploadFile, File

from ..models.schemas import ProjectCreate, ProjectOut, QueryIn, QueryOut
from ..core.store import PROJECTS
from ..core.auth import require_project_key

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=ProjectOut)
def create_project(body: ProjectCreate):
    project_id = uuid.uuid4().hex[:12]
    api_key = uuid.uuid4().hex
    proj = ProjectOut(id=project_id, name=body.name, api_key=api_key)
    PROJECTS[project_id] = proj
    return proj

@router.get("", response_model=List[ProjectOut])
def list_projects():
    return list(PROJECTS.values())

UPLOAD_FILE = File(...)

`@router.post`("/{project_id}/documents")
async def upload_document(
    project_id: str,
    authorization: Optional[str] = Header(default=None),
    file: UploadFile = UPLOAD_FILE
):
    require_project_key(project_id, authorization)

    filename = file.filename or "uploaded"
    return {"ok": True, "project_id": project_id, "filename": filename}

@router.get("/{project_id}/documents")
def list_documents(
    project_id: str,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)
    return {"documents": []}

@router.post("/{project_id}/query", response_model=QueryOut)
def query_project(
    project_id: str,
    body: QueryIn,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)

    t0 = time.time()
    results = []
    latency_ms = int((time.time() - t0) * 1000)

    return QueryOut(
        results=results,
        latency_ms=latency_ms,
        retrieval_debug={"project_id": project_id, "top_k": body.top_k},
    )