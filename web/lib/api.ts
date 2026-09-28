import "server-only";
import { cookies, headers as requestHeaders } from "next/headers";
import { API_URL, TOKEN_COOKIE } from "./config";
import { forwardClientIp } from "./client-ip";

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
  forwardClientIp(await requestHeaders(), headers);
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

/**
 * Cached fetch for data that is the same for every visitor (categories, public profiles, stats).
 * It sends no cookies or visitor headers, so pages built from it can be served from Next's cache.
 * Tag it so an edit can refresh the page straight away (see app/providers/[slug]/actions.ts).
 */
export async function publicApi<T>(path: string, { query, revalidate = 300, tags }: { query?: Query; revalidate?: number; tags?: string[] } = {}): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}${query ? toQuery(query) : ""}`, {
      headers: { accept: "application/json" },
      next: { revalidate, tags },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.error?.message ?? res.statusText);
    }
    return (await res.json()) as Promise<T>;
  } catch (err) {
    // At runtime a failure must throw: Next does not cache a failed render and keeps serving the last good
    // page, whereas empty data would be cached as if it were real. Only `next build` (no API) gets fallbacks.
    if (err instanceof ApiError || process.env.NEXT_PHASE !== "phase-production-build") throw err;
    console.warn(`[publicApi] API fetch fallback for ${path}:`, err instanceof Error ? err.message : err);
    if (path.includes("/stats")) return { providers: 0, categories: 0, cities: 0, reviews: 0 } as unknown as T;
    if (path.includes("/sitemap")) return { providers: [], totalPages: 0, page: 1, pageSize: 50 } as unknown as T;
    if (path.includes("/reviews")) return { reviews: [], page: 1, totalPages: 0, totalCount: 0 } as unknown as T;
    if (path.includes("/categories")) return { categories: [] } as unknown as T;
    if (path.includes("/popular")) return { terms: [] } as unknown as T;
    if (path.includes("/plans")) return { plans: [] } as unknown as T;
    if (path.includes("/app-config")) return { config: { min_review_length: 10 } } as unknown as T;
    if (path.includes("/similar")) return { results: [] } as unknown as T;

    return new Proxy({} as any, {
      get(_, prop: string) {
        if (typeof prop === "symbol" || prop === "then") return undefined;
        if (["categories", "reviews", "terms", "plans", "results", "providers", "items"].includes(prop)) return [];
        if (["config"].includes(prop)) return { min_review_length: 10 };
        if (["page", "pageSize", "totalPages", "totalCount", "cities", "count"].includes(prop)) return 0;
        return undefined;
      },
    }) as T;
  }
}

/**
 * publicApi, or null when the API answers 404. Other failures throw, so an API outage never becomes a
 * "not found" page that stays cached after the API is back.
 */
export async function publicApiOrNull<T>(path: string, options: Parameters<typeof publicApi>[1] = {}): Promise<T | null> {
  try {
    return await publicApi<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function apiOrNull<T>(path: string, init: Parameters<typeof api>[1] = {}): Promise<T | null> {
  try {
    return await api<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 401)) return null;
    throw err;
  }
}
