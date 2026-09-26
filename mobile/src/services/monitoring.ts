import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

/** Crash and error reporting through Sentry. Off unless EXPO_PUBLIC_SENTRY_DSN is set, so development stays quiet. */
export const monitoringEnabled = DSN.length > 0;

/** Names performance traces after the Expo Router screen; _layout.tsx registers the navigation container. */
export const navigationIntegration = monitoringEnabled
  ? Sentry.reactNavigationIntegration({ enableTimeToInitialDisplay: true })
  : null;

if (monitoringEnabled) {
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? "development" : (process.env.EXPO_PUBLIC_APP_ENV ?? "production"),
    release: `dialnfind@${Constants.expoConfig?.version ?? "0.0.0"}`,
    // No names, emails or IP addresses; the user is identified by account id only.
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1 : 0.1,
    integrations: navigationIntegration ? [navigationIntegration] : [],
    enableNativeFramesTracking: true,
    // Expected outcomes (wrong password, validation, offline) are not bugs.
    beforeSend(event, hint) {
      // ApiError carries the HTTP status (services/api.ts); 0 means the device was offline.
      const status = (hint.originalException as { status?: unknown } | undefined)?.status;
      if (typeof status === "number" && (status === 0 || (status >= 400 && status < 500))) return null;
      return event;
    },
  });
}

/** Ties reports to the signed-in account (by id only), or clears it on sign-out. */
export function setMonitoringUser(id: number | null): void {
  if (!monitoringEnabled) return;
  Sentry.setUser(id === null ? null : { id: String(id) });
}

/** Reports an unexpected error that the app handled (so it did not crash) but that should be looked at. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!monitoringEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export const wrapRoot = <P extends Record<string, unknown>>(component: React.ComponentType<P>) =>
  monitoringEnabled ? Sentry.wrap(component) : component;
