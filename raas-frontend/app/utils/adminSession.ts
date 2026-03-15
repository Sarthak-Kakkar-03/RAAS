import { API_BASE_URL } from "@/app/utils/apiBaseUrl";
import type { AdminSessionResponse } from "@/types/api";

export async function getAdminSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AdminSessionResponse;
  } catch {
    return null;
  }
}

export async function loginAdmin(password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  const data = (await response.json().catch(() => null)) as {
    detail?: string;
    ok?: boolean;
    authenticated?: boolean;
  } | null;

  if (!response.ok || !data?.ok || !data.authenticated) {
    throw new Error(data?.detail ?? "Invalid password");
  }

  return data;
}
