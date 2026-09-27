import posthog from "posthog-js";
import { LOCATION_COOKIE } from "./config";
import type { LocationOption, SessionUser } from "./types";

/**
 * Product analytics (PostHog). One project holds the websites, both apps and the API, so a person is
 * followed across all of them by their account id. Off unless NEXT_PUBLIC_POSTHOG_KEY is set.
 * Event names and shared properties are listed in docs/ANALYTICS.md.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
export const analyticsEnabled = KEY.length > 0;

/** Sent with every event, and set again after sign-out clears everything. */
const BASE = {
  app_type: "customer_web",
  platform: "web",
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  app_version: process.env.NEXT_PUBLIC_APP_VERSION,
};

/** Called once from instrumentation-client.ts, before the app hydrates. */
export function initAnalytics(): void {
  if (!analyticsEnabled) return;
  posthog.init(KEY, {
    // Through this site (next.config.ts rewrites), so ad blockers do not drop events.
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",
    defaults: "2026-08-30",
    person_profiles: "identified_only",
    // Reset and verify links carry a token in the URL.
    mask_personal_data_properties: true,
    custom_personal_data_properties: ["token", "code"],
    // Replays mask every input and never record request or response bodies (sign-in sends passwords).
    session_recording: { maskAllInputs: true, recordBody: false, recordHeaders: false },
  });
  posthog.register({ ...BASE, user_type: "anonymous" });
  const city = savedLocation()?.city;
  if (city) posthog.register({ city });
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!analyticsEnabled) return;
  posthog.capture(event, properties);
}

/** Ties this browser to the account; the same id is used by the apps and the API. */
export function identifyUser(user: SessionUser): void {
  if (!analyticsEnabled) return;
  const userType = user.role === "provider" ? "provider" : "customer";
  posthog.identify(
    String(user.id),
    { email: user.email, name: user.name, role: user.role, provider_id: user.provider?.id ?? null },
    { signed_up_at: user.createdAt },
  );
  posthog.register({ user_type: userType });
}

/** On sign-out, so the next person on this browser starts fresh. */
export function resetUser(): void {
  if (!analyticsEnabled) return;
  posthog.reset();
  posthog.register({ ...BASE, user_type: "anonymous" });
  const city = savedLocation()?.city;
  if (city) posthog.register({ city });
}

/** Call before the location cookie is written, so a repeat of the same place is not counted as a change. */
export function setCity(location: LocationOption): void {
  if (!analyticsEnabled) return;
  posthog.register({ city: location.city });
  if (savedLocation()?.label === location.label) return;
  track("location_changed", { city: location.city, area: location.kind === "area" ? location.name : undefined, location_kind: location.kind });
}

function savedLocation(): LocationOption | undefined {
  try {
    const prefix = `${LOCATION_COOKIE}=`;
    const raw = document.cookie.split("; ").find((c) => c.startsWith(prefix))?.slice(prefix.length);
    return raw ? (JSON.parse(decodeURIComponent(raw)) as LocationOption) : undefined;
  } catch {
    return undefined;
  }
}
