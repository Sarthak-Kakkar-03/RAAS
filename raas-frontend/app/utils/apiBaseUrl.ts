const productionApiBaseUrl =
  process.env.NEXT_PUBLIC_RAAS_API_BASE_URL ?? "/api";

export const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? (process.env.NEXT_PUBLIC_RAAS_API_BASE_URL ?? "http://localhost:8000")
    : productionApiBaseUrl;
