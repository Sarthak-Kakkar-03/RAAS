from __future__ import annotations

from typing import Dict, List
import hashlib

from api.services.chroma_repo import ChromaRepo, ChunkRecord
from api.services.embedder import embed_chunks


def _stable_doc_hash(doc_id: str) -> str:
    """Short stable hash used in chunk ids."""
    return hashlib.blake2s(doc_id.encode("utf-8"), digest_size=8).hexdigest()


def make_chunk_id(project_id: str, doc_id: str, chunk_index: int) -> str:
    """Stable chunk id so re-indexing overwrites instead of duplicating."""
    dh = _stable_doc_hash(doc_id)
    return f"{project_id}:{dh}:{chunk_index:05d}"


def index_chunks_into_chroma(
    *,
    project_id: str,
    doc_id: str,
    filename: str,
    chunks: List[str],
) -> int:
    """Embed and upsert chunks into Chroma for a project."""
    if not chunks:
        return 0

    cleaned_chunks = [c.replace("\x00", "").strip() for c in chunks]
    cleaned_chunks = [c for c in cleaned_chunks if c]
    if not cleaned_chunks:
        return 0

    vectors = embed_chunks(cleaned_chunks)
    if len(vectors) != len(cleaned_chunks):
        raise RuntimeError("Embedding output length does not match number of chunks.")

    records: List[ChunkRecord] = []
    for i, (text, vec) in enumerate(zip(cleaned_chunks, vectors)):
        md: Dict = {
            "doc_id": doc_id,
            "chunk_index": i,
            "filename": filename,
        }
        records.append(
            ChunkRecord(
                id=make_chunk_id(project_id, doc_id, i),
                text=text,
                metadata=md,
                embedding=vec,
            )
        )

    repo = ChromaRepo()
    repo.upsert_chunks(project_id=project_id, chunks=records)
    return len(records)
