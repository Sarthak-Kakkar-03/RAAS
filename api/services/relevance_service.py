from __future__ import annotations

from typing import Any, Dict, List, Optional

from api.core.config import settings
from api.services.chroma_repo import ChromaRepo
from api.services.embedder import embed_query

PROBE_FORMAT = "text_v1"
DISTANCE_METRIC = "collection_default"


def build_probe_text(*, text: str) -> str:
    """Build a stable transient text payload for relevance probing."""
    cleaned_text = text.strip()
    if not cleaned_text:
        raise ValueError("Text is empty.")
    return cleaned_text


def check_relevance_distance(
    *,
    project_id: str,
    text: str,
    top_k: int = 3,
    where: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Compare a transient text probe against indexed project content.

    Returns the nearest indexed chunks without storing the probe text or embedding.
    """
    if top_k <= 0:
        raise ValueError("top_k must be >= 1")

    probe_text = build_probe_text(text=text)
    probe_vec = embed_query(probe_text)

    col = ChromaRepo().collection(project_id)
    res = col.query(
        query_embeddings=[probe_vec],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]

    hits: List[Dict[str, Any]] = []
    for i in range(min(len(ids), len(docs), len(metas), len(dists))):
        hits.append(
            {
                "id": str(ids[i]),
                "text": str(docs[i]),
                "metadata": metas[i] if isinstance(metas[i], dict) else None,
                "distance": float(dists[i]),
            }
        )

    return hits


def relevance_metadata() -> Dict[str, str]:
    """Return stable metadata describing how transient relevance probing works."""
    return {
        "embedding_model": settings.openai_embedding_model,
        "distance_metric": DISTANCE_METRIC,
        "probe_format": PROBE_FORMAT,
    }
