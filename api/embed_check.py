from api.services.embedder import embed_chunks, embed_query

chunks = [
    "LangChain is a framework for building context-aware applications.",
    "This is another chunk to embed.",
]

vecs = embed_chunks(chunks)
print("num_vecs:", len(vecs))
print("dim:", len(vecs[0]))
print("first_5:", vecs[0][:5])

qv = embed_query("What is LangChain?")
print("query_dim:", len(qv))
