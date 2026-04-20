// raas-frontend/types/api.ts

// Health response from API type
export type HealthResponse = {
  status?: string;
  chroma_ok?: boolean;
};

export type AdminSessionResponse = {
  ok: boolean;
  authenticated: boolean;
};

export type ProjectPublicInfo = {
  id: string;
  name: string;
};

export type ProjectPrivateInfo = {
  id: string;
  name: string;
  api_key: string;
};

export type DocumentInfo = {
  project_id: string;
  doc_id: string;
  filename: string;
  status: string;
  ingested: boolean;
  num_chunks: number;
  created_at: string;
  error: string | null;
};

export type UploadDocumentStatus = {
  ok: boolean;
  project_id: string;
  doc_id: string;
  filename: string;
  path: string;
  bytes: number;
  ingested: boolean;
};

export type IngestBatchStatus = {
  ok: boolean;
  project_id: string;
  processed: number;
  ingested_count: number;
  failed_count: number;
};

export type QueryHit = {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  distance: number;
};

export type QueryResponse = {
  ok: boolean;
  results: QueryHit[];
  latency_ms: number;
  retrieval_debug: Record<string, unknown>;
};

export type RelevanceHit = {
  id: string;
  text: string;
  metadata: Record<string, unknown> | null;
  distance: number;
};

export type RelevanceCheckResponse = {
  ok: boolean;
  project_id: string;
  embedding_model: string;
  distance_metric: string;
  probe_format: string;
  distance_threshold: number | null;
  min_distance: number | null;
  flagged: boolean;
  hit_count: number;
  latency_ms: number;
  results: RelevanceHit[];
};

export type RetrievalTraceInfo = {
  event_id: string;
  project_id: string;
  query: string;
  top_k: number;
  hit_count: number;
  latency_ms: number;
  where: Record<string, unknown> | null;
  top_hit_ids: string[];
  top_hit_distances: number[];
  top_hit_texts: string[];
  top_hit_metadatas: (Record<string, unknown> | null)[];
  created_at: string;
};

export type RetrievalTraceListResponse = {
  ok: boolean;
  project_id: string;
  count: number;
  traces: RetrievalTraceInfo[];
};

export type RetrievalSummaryResponse = {
  ok: boolean;
  project_id: string;
  total_queries: number;
  avg_latency_ms: number;
  zero_hit_queries: number;
  filtered_queries: number;
  avg_hit_count: number;
  last_queried_at: string | null;
};
