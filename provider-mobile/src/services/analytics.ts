import { Platform } from "react-native";
import Constants from "expo-constants";
import PostHog from "posthog-react-native";

import type { SessionUser } from "@/types";

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";

/**
 * Product analytics through PostHog. One project holds the websites, both apps and the API, so a person
 * is followed across all of them by their account id (a customer who starts a business keeps theirs). Off unless EXPO_PUBLIC_POSTHOG_KEY is set.
 * Event names and shared properties are listed in docs/ANALYTICS.md.
 */
export const analyticsEnabled = KEY.length > 0;

/** Sent with every event, and set again after sign-out clears everything. */
const BASE = {
  app_type: "provider_mobile",
  platform: Platform.OS,
  environment: __DEV__ ? "development" : (process.env.EXPO_PUBLIC_APP_ENV ?? "production"),
  app_version: Constants.expoConfig?.version ?? "0.0.0",
};

export const posthog = analyticsEnabled
  ? new PostHog(KEY, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      captureAppLifecycleEvents: true,
      // Session replay needs a native build (the @posthog/react-native-plugin module); text fields are always masked.
      enableSessionReplay: true,
      sessionReplayConfig: { maskAllTextInputs: true, maskAllImages: false, captureLog: false },
    })
  : null;

void posthog?.register({ ...BASE, user_type: "anonymous" });

export function track(event: string, properties?: Record<string, string | number | boolean | null | undefined>): void {
  if (!posthog) return;
  posthog.capture(event, withoutUndefined(properties));
}

/** Called by the root layout whenever the Expo Router path changes. */
export function trackScreen(pathname: string, params: Record<string, string | string[] | undefined>): void {
  if (!posthog) return;
  const flat = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]));
  void posthog.screen(pathname, withoutUndefined(flat));
}

/** Ties this device to the account; the same id is used by the websites, the other app and the API. */
export function identifyUser(user: SessionUser, plan?: string | null): void {
  if (!posthog) return;
  posthog.identify(String(user.id), {
    $set: { email: user.email, name: user.name, role: user.role, provider_id: user.provider?.id ?? null, ...(plan ? { plan } : {}) },
    $set_once: { signed_up_at: user.createdAt },
  });
  void posthog.register({ user_type: user.role === "provider" ? "provider" : "customer" });
}

/** On sign-out (or a session that expired), so the next person on this device starts fresh. */
export function resetUser(): void {
  if (!posthog) return;
  posthog.reset();
  void posthog.register({ ...BASE, user_type: "anonymous" });
}

function withoutUndefined<T extends Record<string, unknown>>(props?: T) {
  if (!props) return undefined;
  return Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) as Record<string, string | number | boolean | null>;
}
