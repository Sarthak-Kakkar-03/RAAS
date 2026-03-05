from __future__ import annotations

import logging
from pathlib import Path
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException

from api.services.ingest_service import ingest_pdf_file
import uuid

router = APIRouter(prefix="/projects/{project_id}", tags=["ingest"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/ingest")
def ingest(project_id: str, file: UploadFile = File(...)):
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
    except Exception:
        logger.exception(
            "Failed to save upload",
            extra={"project_id": project_id, "filename": file.filename},
        )
        raise HTTPException(status_code=500, detail="Failed to save upload")

    ingest_succeeded = False
    try:
        result = ingest_pdf_file(
            project_id=project_id,
            file_path=dest_path,
            filename=file.filename,
        )
        ingest_succeeded = True
        return {
            "ok": True,
            "project_id": result.get("project_id", project_id),
            "doc_id": result.get("doc_id"),
            "filename": result.get("filename", file.filename),
            "num_chunks": result.get("num_chunks"),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception(
            "Ingest failed",
            extra={"project_id": project_id, "filename": file.filename},
        )
        raise HTTPException(status_code=500, detail="Ingest failed")
    finally:
        if not ingest_succeeded and dest_path.exists():
            try:
                dest_path.unlink()
            except Exception:
                logger.exception(
                    "Failed to remove uploaded file after ingest failure",
                    extra={
                        "project_id": project_id,
                        "filename": file.filename,
                        "dest_path": str(dest_path),
                    },
                )
