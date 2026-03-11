import uuid
from typing import Optional, List
from fastapi import APIRouter, Header, UploadFile, File
import shutil
from dataclasses import asdict


from api.models.schemas import ProjectCreate, ProjectOut, ProjectPublic
from api.core.auth import require_project_key
from api.services.chroma_repo import get_or_create_project_collection
from api.core.config import RAW_DIR
from api.services.doc_registry import list_docs, upsert_doc
from api.services.project_registry import create_project as create_project_record
from api.services.project_registry import list_projects as list_project_records

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut)
def create_project(body: ProjectCreate):
    project_id = uuid.uuid4().hex[:12]
    api_key = uuid.uuid4().hex
    # Create Chroma collection first - if this fails, don't store the project
    get_or_create_project_collection(project_id)
    return create_project_record(project_id=project_id, name=body.name, api_key=api_key)


@router.get("", response_model=List[ProjectPublic])
def list_projects():
    return list_project_records()


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

    upsert_doc(
        project_id=project_id,
        doc_id=doc_id,
        filename=safe_name,
        status="uploaded",
        ingested=False,
    )
    return {
        "ok": True,
        "project_id": project_id,
        "doc_id": doc_id,
        "filename": safe_name,
        "path": str(dst_path),
        "bytes": dst_path.stat().st_size,
        "ingested": False,
    }


@router.get("/{project_id}/documents")
def list_documents(
    project_id: str,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)
    return {"documents": [asdict(doc) for doc in list_docs(project_id)]}
