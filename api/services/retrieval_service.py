from __future__ import annotations

from typing import Any, Dict, List, Optional

from api.services.chroma_repo import ChromaRepo
from api.services.embedder import embed_query


def retrieve(
    *,
    project_id: str,
    query: str,
    top_k: int = 5,
    where: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve top_k most similar chunks from Chroma for a given project.

    Args:
        project_id: tenant/project collection selector
        query: raw user query
        top_k: number of results
        where: optional metadata filter (e.g. {"doc_id": "..."} )

    Returns:
        List of hits: {id, text, metadata, distance}
    """
    if not query.strip():
        raise ValueError("Query is empty.")
    if top_k <= 0:
        raise ValueError("top_k must be >= 1")

    # 1) Embed query
    q_vec = embed_query(query)

    # 2) Query chroma
    col = ChromaRepo().collection(project_id)

    res = col.query(
        query_embeddings=[q_vec],
        n_results=top_k,
        where=where,  # optional
        include=["documents", "metadatas", "distances"],
    )

    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]

    hits: List[Dict[str, Any]] = []
    for i in range(
        min(
            len(ids),
            len(docs),
            len(metas),
            len(dists),
        )
    ):
        hits.append(
            {
                "id": ids[i],
                "text": docs[i],
                "metadata": metas[i],
                "distance": dists[i],
            }
        )

    return hits
