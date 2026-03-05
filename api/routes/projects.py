import time
import uuid
from typing import Optional, List
from fastapi import APIRouter, Header, UploadFile, File
from pathlib import Path
import shutil
import uuid
import time


from api.models.schemas import ProjectCreate, ProjectOut, ProjectPublic
from api.core.store import PROJECTS
from api.core.auth import require_project_key
from api.services.chroma_repo import get_or_create_project_collection
from api.core.config import RAW_DIR
from api.core.docs_store import DOCS
from api.models.schemas import DocumentOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut)
def create_project(body: ProjectCreate):
    project_id = uuid.uuid4().hex[:12]
    api_key = uuid.uuid4().hex
    proj = ProjectOut(id=project_id, name=body.name, api_key=api_key)
    # Create Chroma collection first - if this fails, don't store the project
    get_or_create_project_collection(project_id)
    PROJECTS[project_id] = proj
    return proj


@router.get("", response_model=List[ProjectPublic])
def list_projects():
    return [ProjectPublic(id=proj.id, name=proj.name) for proj in PROJECTS.values()]


UPLOAD_FILE = File(...)


@router.post("/{project_id}/documents")
async def upload_document(
    project_id: str,
    authorization: Optional[str] = Header(default=None),
    file: UploadFile = UPLOAD_FILE,
):
    require_project_key(project_id, authorization)

    filename = file.filename or "uploaded"
    # need a unique doc_id
    doc_id = uuid.uuid4().hex[:12]
    safe_name = filename.replace("/", "_")

    project_dir = RAW_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    dst_path = project_dir / f"{doc_id}_{safe_name}"

    # this streams instead of copy
    with dst_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    meta = {
        "doc_id": doc_id,
        "filename": safe_name,
        "path": str(dst_path),
        "bytes": dst_path.stat().st_size,
        "uploaded_at": time.time(),
        "indexed": False,
    }
    DOCS.setdefault(project_id, []).append(meta)
    return {"ok": True, "project_id": project_id, **meta}


@router.get("/{project_id}/documents")
def list_documents(
    project_id: str,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)
    return {"documents": DOCS.get(project_id, [])}
