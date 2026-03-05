from __future__ import annotations

from pathlib import Path
import uuid

from api.services.text_extractor import extract_text_from_pdf
from api.services.chunker import chunk_text
from api.services.index_service import index_chunks_into_chroma


def ingest_pdf_file(
    *,
    project_id: str,
    file_path: Path,
    filename: str,
    doc_id: str | None = None,
) -> dict:
    """
    Orchestrates ingest:
    extract -> chunk -> (delegate embedding + id generation + upsert to index_service)

    NOTE:
    - This service does NOT generate chunk IDs.
    - This service does NOT talk to Chroma directly.
    """
    doc_id = doc_id or str(uuid.uuid4())

    # 1) Extract
    text = extract_text_from_pdf(file_path)
    if not text.strip():
        raise ValueError(
            "No extractable text found in PDF (scanned PDFs not supported in v1)."
        )

    # 2) Chunk
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("Chunking produced 0 chunks.")

    # 3) Index (index_service does: embed -> build ChunkRecords -> upsert)
    indexed_count = index_chunks_into_chroma(
        project_id=project_id,
        doc_id=doc_id,
        filename=filename,
        chunks=chunks,
    )

    return {
        "project_id": project_id,
        "doc_id": doc_id,
        "filename": filename,
        "num_chunks": indexed_count,
    }
