from fastapi import APIRouter, Depends, HTTPException

from api.core.auth import get_bearer_token, require_project_key
from api.services.chroma_repo import ChromaRepo
from api.services.doc_registry import list_docs, get_doc, delete_doc
from dataclasses import asdict

router = APIRouter(prefix="/projects/{project_id}/docs", tags=["docs"])


@router.get("")
def list_project_docs(
    project_id: str,
    token: str = Depends(get_bearer_token),
):
    """
    List documents for the specified project.
    
    Parameters:
        project_id (str): Identifier of the project whose documents will be listed.
    
    Returns:
        dict: A payload with keys:
            - `project_id` (str): The same project identifier.
            - `docs` (list[dict]): List of document records for the project, each represented as a dictionary.
    """
    require_project_key(project_id, token)
    return {
        "project_id": project_id,
        "docs": [asdict(d) for d in list_docs(project_id)],
    }


@router.get("/{doc_id}")
def get_project_doc(
    project_id: str,
    doc_id: str,
    token: str = Depends(get_bearer_token),
):
    """
    Retrieve a document record for the given project and document ID.
    
    Parameters:
        project_id (str): Identifier of the project containing the document.
        doc_id (str): Identifier of the document to retrieve.
    
    Returns:
        dict: Dictionary representation of the requested document.
    
    Raises:
        HTTPException: Raised with status code 404 if the document is not found.
    """
    require_project_key(project_id, token)
    rec = get_doc(project_id, doc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Doc not found.")
    return asdict(rec)


@router.delete("/{doc_id}")
def delete_project_doc(
    project_id: str,
    doc_id: str,
    token: str = Depends(get_bearer_token),
):
    """
    Delete a document for a project from the Chroma repository and the registry.
    
    Parameters:
        project_id (str): Identifier of the project containing the document.
        doc_id (str): Identifier of the document to delete.
    
    Returns:
        dict: A success payload with keys `ok`, `project_id`, and `doc_id` confirming the deletion.
    """
    require_project_key(project_id, token)
    # 1) delete from chroma
    ChromaRepo().delete_by_doc_id(project_id=project_id, doc_id=doc_id)

    # 2) delete from registry
    delete_doc(project_id, doc_id)

    return {"ok": True, "project_id": project_id, "doc_id": doc_id}
