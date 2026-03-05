from __future__ import annotations

from pathlib import Path
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException

from api.services.ingest_service import ingest_pdf_file

router = APIRouter(prefix="/projects/{project_id}", tags=["ingest"])

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/ingest")
async def ingest(project_id: str, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Only PDF files are supported in v1."
        )

    safe_name = Path(file.filename).name
    if safe_name != file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    dest_path = UPLOAD_DIR / f"{uuid.uuid4()}-{safe_name}"

    try:
        with dest_path.open("wb") as out:
            shutil.copyfileobj(file.file, out)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    try:
        result = ingest_pdf_file(
            project_id=project_id,
            file_path=dest_path,
            filename=file.filename,
        )
        return {
            "ok": True,
            "project_id": result.get("project_id", project_id),
            "doc_id": result.get("doc_id"),
            "filename": result.get("filename", file.filename),
            "num_chunks": result.get("num_chunks"),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingest failed: {e}")
