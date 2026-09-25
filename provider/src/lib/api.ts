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
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Fired when the server says the plan does not include a feature; the layout opens the upgrade dialog. */
export const UPGRADE_EVENT = "dnf:upgrade";
export type UpgradeDetail = { entitlement: string; feature: string; message: string };

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
    if (res.status === 402 && body?.error?.code === "upgrade_required") {
      window.dispatchEvent(new CustomEvent<UpgradeDetail>(UPGRADE_EVENT, { detail: { ...body.error.details, message: body.error.message } }));
    }
    throw new ApiError(res.status, body?.error?.message ?? "Something went wrong", body?.error?.code, body?.error?.details);
  }
  return body as T;
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}
