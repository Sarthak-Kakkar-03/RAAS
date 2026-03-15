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
