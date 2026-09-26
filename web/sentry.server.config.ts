import * as Sentry from "@sentry/nextjs";

// Server errors (pages, route handlers). Off unless NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // No user details, cookies, headers or request bodies; reset and verify links carry a token in the URL.
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: { deny: ["token"] } },
});
