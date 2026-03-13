import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File
import shutil
from dataclasses import asdict


from api.models.schemas import ProjectCreate, ProjectOut, ProjectPublic
from api.core.auth import get_bearer_token, require_project_key
from api.services.chroma_repo import (
    delete_project_collection,
    get_or_create_project_collection,
)
from api.core.config import RAW_DIR
from api.services.doc_registry import list_docs, upsert_doc
from api.services.project_registry import create_project as create_project_record
from api.services.project_registry import delete_project as delete_project_record
from api.services.project_registry import list_projects as list_project_records

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut)
def create_project(body: ProjectCreate):
    project_id = uuid.uuid4().hex[:12]
    api_key = uuid.uuid4().hex
    project = create_project_record(
        project_id=project_id,
        name=body.name,
        api_key=api_key,
    )
    try:
        get_or_create_project_collection(project_id)
    except Exception:
        delete_project_record(project_id)
        try:
            delete_project_collection(project_id)
        except Exception:
            pass
        raise
    return project


@router.get("", response_model=List[ProjectPublic])
def list_projects():
    return list_project_records()


UPLOAD_FILE = File(...)


@router.post("/{project_id}/documents")
async def upload_document(
    project_id: str,
    token: str = Depends(get_bearer_token),
    file: UploadFile = UPLOAD_FILE,
):
    """
    Handle uploading a document file for a project, save it to the project's raw storage directory, and register the document metadata in the document registry.

    Returns:
        result (dict): Details about the uploaded document containing:
            - `ok` (bool): `True` when upload and registration succeeded.
            - `project_id` (str): ID of the project the document was uploaded to.
            - `doc_id` (str): Generated unique document identifier.
            - `filename` (str): Safe filename used for storage.
            - `path` (str): Filesystem path where the file was saved.
            - `bytes` (int): Size of the saved file in bytes.
            - `ingested` (bool): `False` indicating the document has not been ingested yet.
    """
    require_project_key(project_id, token)

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

    try:
        upsert_doc(
            project_id=project_id,
            doc_id=doc_id,
            filename=safe_name,
            status="uploaded",
            ingested=False,
        )
    except Exception:
        dst_path.unlink(missing_ok=True)
        raise
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
    token: str = Depends(get_bearer_token),
):
    """
    Retrieve the documents registered for a project.

    Requires a valid project key provided via the injected bearer token.

    Parameters:
        project_id (str): Project identifier whose documents should be listed.

    Returns:
        dict: A mapping with the key "documents" to a list of document records represented as dictionaries.
    """
    require_project_key(project_id, token)
    return {"documents": [asdict(doc) for doc in list_docs(project_id)]}


@router.get("/{project_id}/validate")
def validate_project(
    project_id: str,
    token: str = Depends(get_bearer_token),
):
    try:
        require_project_key(project_id=project_id, token=token)
        return True
    except Exception:
        return False
