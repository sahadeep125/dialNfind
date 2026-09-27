import posthog from "posthog-js";
import type { User } from "./types";

/**
 * Product analytics (PostHog). One project holds the websites, both apps and the API, so a person is
 * followed across all of them by their account id. Off unless VITE_POSTHOG_KEY is set.
 * Event names and shared properties are listed in docs/ANALYTICS.md.
 */
const KEY = import.meta.env.VITE_POSTHOG_KEY ?? "";
export const analyticsEnabled = KEY.length > 0;

/** Sent with every event, and set again after sign-out clears everything. */
const BASE = {
  app_type: "provider_web",
  platform: "web",
  environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
  app_version: import.meta.env.VITE_APP_VERSION,
};

if (analyticsEnabled) {
  posthog.init(KEY, {
    // "/ingest" behind deploy/spa-nginx.conf (and the Vite dev server), so ad blockers do not drop events.
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    defaults: "2026-08-30",
    person_profiles: "identified_only",
    mask_personal_data_properties: true,
    custom_personal_data_properties: ["token", "code"],
    // Replays mask every input and never record request or response bodies (sign-in sends passwords).
    session_recording: { maskAllInputs: true, recordBody: false, recordHeaders: false },
  });
  posthog.register({ ...BASE, user_type: "anonymous" });
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!analyticsEnabled) return;
  posthog.capture(event, properties);
}

/** Ties this browser to the account; the same id is used by the website, the apps and the API. */
export function identifyUser(user: User, plan?: string | null): void {
  if (!analyticsEnabled) return;
  posthog.identify(
    String(user.id),
    { email: user.email, name: user.name, role: user.role, provider_id: user.provider?.id ?? null, ...(plan ? { plan } : {}) },
    user.createdAt ? { signed_up_at: user.createdAt } : undefined,
  );
  posthog.register({ user_type: user.role === "provider" ? "provider" : "customer" });
}

/** On sign-out, so the next person on this browser starts fresh. */
export function resetUser(): void {
  if (!analyticsEnabled) return;
  posthog.reset();
  posthog.register({ ...BASE, user_type: "anonymous" });
}
