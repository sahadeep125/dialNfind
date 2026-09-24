import { API_URL } from "./config";

const TOKEN_KEY = "dnf_provider_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("accept", "application/json");
  if (json !== undefined) headers.set("content-type", "application/json");
  const token = tokenStore.get();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event("dnf:logout"));
    }
    throw new ApiError(res.status, body?.error?.message ?? "Something went wrong");
  }
  return body as T;
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}
