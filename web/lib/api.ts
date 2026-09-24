import "server-only";
import { cookies } from "next/headers";
import { API_URL, TOKEN_COOKIE } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export function toQuery(params: Query): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/** Server-side fetch against the API, forwarding the session token when present. */
export async function api<T>(path: string, init: RequestInit & { query?: Query; auth?: boolean } = {}): Promise<T> {
  const { query, auth = true, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("accept", "application/json");
  if (rest.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (auth) {
    const token = (await cookies()).get(TOKEN_COOKIE)?.value;
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_URL}${path}${query ? toQuery(query) : ""}`, { cache: "no-store", ...rest, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export async function apiOrNull<T>(path: string, init: Parameters<typeof api>[1] = {}): Promise<T | null> {
  try {
    return await api<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 401)) return null;
    throw err;
  }
}
