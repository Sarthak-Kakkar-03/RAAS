from typing import Optional

from fastapi import HTTPException, APIRouter, Header

from api.core.auth import require_project_key
from api.services.chroma_repo import ChromaRepo
from api.services.doc_registry import list_docs, get_doc, delete_doc
from dataclasses import asdict

router = APIRouter(prefix="/projects/{project_id}/docs", tags=["docs"])


@router.get("")
def list_project_docs(
    project_id: str,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)
    return {
        "project_id": project_id,
        "docs": [asdict(d) for d in list_docs(project_id)],
    }


@router.get("/{doc_id}")
def get_project_doc(
    project_id: str,
    doc_id: str,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)
    rec = get_doc(project_id, doc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Doc not found.")
    return asdict(rec)


@router.delete("/{doc_id}")
def delete_project_doc(
    project_id: str,
    doc_id: str,
    authorization: Optional[str] = Header(default=None),
):
    require_project_key(project_id, authorization)
    # 1) delete from chroma
    ChromaRepo().delete_by_doc_id(project_id=project_id, doc_id=doc_id)

    # 2) delete from registry
    delete_doc(project_id, doc_id)

    return {"ok": True, "project_id": project_id, "doc_id": doc_id}
