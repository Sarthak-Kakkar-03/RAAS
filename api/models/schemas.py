from pydantic import AliasChoices, BaseModel, Field
from typing import Optional, List, Dict, Any


class ProjectCreate(BaseModel):
    name: str


class AdminLoginIn(BaseModel):
    password: str = Field(..., min_length=1)


class ProjectOut(BaseModel):
    id: str
    name: str
    api_key: str


class ProjectPublic(BaseModel):
    id: str
    name: str


class QueryIn(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=50)
    where: Optional[Dict[str, Any]] = Field(
        default=None,
        validation_alias=AliasChoices("where", "filters"),
    )


class QueryOut(BaseModel):
    results: List[Dict[str, Any]]
    latency_ms: int
    retrieval_debug: Dict[str, Any]
    ok: bool = True


class DocumentOut(BaseModel):
    doc_id: str
    filename: str
    path: str
    bytes: int
    uploaded_at: float
    indexed: bool = False


class IngestedDocOut(BaseModel):
    doc_id: str
    filename: str
    num_chunks: int


class IngestFailedDocOut(BaseModel):
    doc_id: str
    filename: str
    error: str


class IngestBatchOut(BaseModel):
    ok: bool
    project_id: str
    processed: int
    ingested_count: int
    failed_count: int
    ingested: List[IngestedDocOut]
    failed: List[IngestFailedDocOut]
