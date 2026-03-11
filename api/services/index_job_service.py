from __future__ import annotations

import logging
from typing import Any, Dict, List

from api.core.config import RAW_DIR
from api.services.doc_registry import list_docs, upsert_doc
from api.services.ingest_service import ingest_pdf_file

logger = logging.getLogger(__name__)


def ingest_pending_docs(project_id: str) -> Dict[str, Any]:
    pending_docs = [doc for doc in list_docs(project_id) if not doc.ingested]

    ingested: List[Dict[str, Any]] = []
    failed: List[Dict[str, Any]] = []

    for doc in pending_docs:
        file_path = RAW_DIR / project_id / f"{doc.doc_id}_{doc.filename}"
        if not file_path.exists():
            error_msg = "Source file missing."
            upsert_doc(
                project_id=project_id,
                doc_id=doc.doc_id,
                filename=doc.filename,
                status="failed",
                ingested=False,
                num_chunks=0,
                error=error_msg,
            )
            failed.append(
                {"doc_id": doc.doc_id, "filename": doc.filename, "error": error_msg}
            )
            continue

        try:
            result = ingest_pdf_file(
                project_id=project_id,
                file_path=file_path,
                filename=doc.filename,
                doc_id=doc.doc_id,
            )
            num_chunks = int(result.get("num_chunks", 0) or 0)
            upsert_doc(
                project_id=project_id,
                doc_id=doc.doc_id,
                filename=doc.filename,
                status="ingested",
                ingested=True,
                num_chunks=num_chunks,
                error=None,
            )
            ingested.append(
                {
                    "doc_id": doc.doc_id,
                    "filename": doc.filename,
                    "num_chunks": num_chunks,
                }
            )
        except ValueError as e:
            upsert_doc(
                project_id=project_id,
                doc_id=doc.doc_id,
                filename=doc.filename,
                status="failed",
                ingested=False,
                num_chunks=0,
                error=str(e),
            )
            failed.append(
                {"doc_id": doc.doc_id, "filename": doc.filename, "error": str(e)}
            )
        except Exception:
            logger.exception(
                "Ingest failed",
                extra={
                    "project_id": project_id,
                    "doc_id": doc.doc_id,
                    "filename": doc.filename,
                },
            )
            upsert_doc(
                project_id=project_id,
                doc_id=doc.doc_id,
                filename=doc.filename,
                status="failed",
                ingested=False,
                num_chunks=0,
                error="Ingest failed",
            )
            failed.append(
                {
                    "doc_id": doc.doc_id,
                    "filename": doc.filename,
                    "error": "Ingest failed",
                }
            )

    return {
        "processed": len(pending_docs),
        "ingested_count": len(ingested),
        "failed_count": len(failed),
        "ingested": ingested,
        "failed": failed,
    }
