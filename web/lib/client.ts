"use client";

import { LOCATION_COOKIE } from "./config";
import type { LocationOption } from "./types";

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Browser-side calls go through the same-origin proxy, which attaches the httpOnly session token. */
export async function clientApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(`/api/proxy${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ClientApiError(res.status, body?.error?.message ?? "Something went wrong");
  return body as T;
}

export function saveLocationCookie(location: LocationOption) {
  const value = encodeURIComponent(JSON.stringify(location));
  document.cookie = `${LOCATION_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
}
