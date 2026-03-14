from __future__ import annotations
from chromadb.api.models.Collection import Collection
from dataclasses import dataclass
from typing import List, Optional

import chromadb

from api.core.config import CHROMA_HOST, CHROMA_PORT


@dataclass(frozen=True)
class ChunkRecord:
    """data class for chunks"""

    id: str
    text: str
    metadata: dict
    embedding: Optional[List[float]] = None


class ChromaRepo:

    def __init__(self, host: str = CHROMA_HOST, port: int = CHROMA_PORT):
        """Create a Chroma HTTP client wrapper for project collections."""
        self._client = chromadb.HttpClient(host=host, port=port)

    def heartbeat(self) -> bool:
        """Return whether the Chroma server responds to a heartbeat."""
        try:
            self._client.heartbeat()
            return True
        except Exception:
            return False

    @staticmethod
    def collection_name(project_id: str):
        """Build the Chroma collection name for a project."""
        return f"raas_{project_id}"

    def collection(self, project_id: str) -> Collection:
        """Fetch or create the Chroma collection for a project."""
        return self._client.get_or_create_collection(
            name=self.collection_name(project_id)
        )

    def upsert_chunks(self, project_id: str, chunks: List[ChunkRecord]) -> None:
        """Insert or update chunk records for a project collection."""
        if not chunks:
            return
        col = self.collection(project_id=project_id)
        ids = [c.id for c in chunks]
        documents = [c.text for c in chunks]
        metadatas = [c.metadata for c in chunks]
        has_embeddings = [c.embedding is not None for c in chunks]

        if all(has_embeddings):
            embeddings = [c.embedding for c in chunks]
            col.upsert(
                ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings
            )
            return
        if any(has_embeddings):
            raise ValueError(
                "Mixed embeddings state: some chunks have embeddings and some do not."
            )

        col.upsert(ids=ids, documents=documents, metadatas=metadatas)

    def delete_by_doc_id(self, project_id: str, doc_id: str) -> None:
        """Delete all chunks belonging to a document from a project collection."""
        col = self.collection(project_id)
        col.delete(where={"doc_id": doc_id})

    def replace_by_doc_id(
        self, project_id: str, doc_id: str, chunks: List[ChunkRecord]
    ) -> None:
        """
        Safely replace all chunks for a doc:
        1) upsert new chunks
        2) delete only stale previous chunk ids
        """
        if not chunks:
            self.delete_by_doc_id(project_id=project_id, doc_id=doc_id)
            return

        col = self.collection(project_id)
        previous = col.get(where={"doc_id": doc_id})
        previous_ids = set(previous.get("ids") or [])

        self.upsert_chunks(project_id=project_id, chunks=chunks)

        new_ids = {c.id for c in chunks}
        stale_ids = sorted(previous_ids - new_ids)
        if stale_ids:
            col.delete(ids=stale_ids)

    def count_chunks(self, project_id: str) -> int:
        """Count how many chunks currently exist for a project."""
        col = self.collection(project_id)
        return col.count()

    def delete_collection(self, project_id: str) -> None:
        """Delete the entire Chroma collection for a project."""
        self._client.delete_collection(name=self.collection_name(project_id))


def heartbeat() -> bool:
    """Return whether Chroma is reachable using the default client."""
    return ChromaRepo().heartbeat()


def get_or_create_project_collection(project_id: str) -> Collection:
    """Return the Chroma collection for a project, creating it if needed."""
    return ChromaRepo().collection(project_id)


def delete_project_collection(project_id: str) -> None:
    """Delete the Chroma collection associated with a project."""
    ChromaRepo().delete_collection(project_id)
