// raas-frontend/types/api.ts

// Health response from API type
export type HealthResponse = {
  status?: string;
  chroma_ok?: boolean;
};

export type ProjectPublicInfo = {
  id: string;
  name: string;
};
