import * as Sentry from "@sentry/nextjs";

// Browser errors. Off unless NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // No user details, cookies, headers or request bodies; reset and verify links carry a token in the URL.
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: { deny: ["token"] } },
  // Expected API answers (wrong password, validation) are not bugs; ClientApiError carries the status.
  beforeSend(event, hint) {
    const status = (hint.originalException as { status?: unknown } | undefined)?.status;
    if (typeof status === "number" && status >= 400 && status < 500) return null;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
