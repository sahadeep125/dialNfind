import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { LOCATION_COOKIE, TOKEN_COOKIE } from "./config";
import { DEFAULT_LOCATION } from "./default-location";
import type { LocationOption, SessionUser } from "./types";

/** The signed-in user, or `unreachable` when the API could not answer (which is not the same as signed out). */
const loadSession = cache(async (): Promise<{ user: SessionUser | null; unreachable: boolean }> => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return { user: null, unreachable: false };
  try {
    const { user } = await api<{ user: SessionUser }>("/auth/me");
    return { user, unreachable: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { user: null, unreachable: false };
    return { user: null, unreachable: true };
  }
});

/** The signed-in user or null. Public pages treat an API outage like a guest visit. */
export async function getSession(): Promise<SessionUser | null> {
  return (await loadSession()).user;
}

/**
 * For signed-in pages. During an API outage it throws, so the page shows its error screen with Try again
 * instead of sending a signed-in person to the login form.
 */
export async function requireSession(next: string): Promise<SessionUser> {
  const { user, unreachable } = await loadSession();
  if (unreachable) throw new Error("We could not reach DialNFind to check your sign-in. Please try again in a moment.");
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
