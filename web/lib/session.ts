import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { LOCATION_COOKIE, TOKEN_COOKIE } from "./config";
import { DEFAULT_LOCATION } from "./default-location";
import type { LocationOption, SessionUser } from "./types";

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { user } = await api<{ user: SessionUser }>("/auth/me");
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    return null;
  }
});

export async function requireSession(next: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!user.emailVerifiedAt) redirect(`/verify-email?next=${encodeURIComponent(next)}`);
  return user;
}

export { DEFAULT_LOCATION };

/** The visitor's chosen location, persisted in a cookie so server-rendered pages can use it. */
export async function getSavedLocation(): Promise<LocationOption> {
  const raw = (await cookies()).get(LOCATION_COOKIE)?.value;
  if (!raw) return DEFAULT_LOCATION;
  try {
    const parsed = JSON.parse(raw) as LocationOption;
    if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") return parsed;
  } catch {
    /* fall through */
  }
  return DEFAULT_LOCATION;
}
