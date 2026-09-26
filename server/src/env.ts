import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function list(value: string | undefined): string[] {
  return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", process.env.NODE_ENV === "production" ? undefined : "dev-secret"),
  /** Customer and provider sign-ins last this many days; staff sign-ins are much shorter. */
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  staffSessionHours: Number(process.env.STAFF_SESSION_HOURS ?? 12),
  /** Scales every rate limit (2 doubles them). 0 turns rate limiting off, for load tests only. */
  rateLimitMultiplier: Number(process.env.RATE_LIMIT_MULTIPLIER ?? 1),
  corsOrigins: list(process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173,http://localhost:5174"),
  timezone: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  /** Scheduled jobs (plan expiry, reminders, nightly ranking). Turn on in exactly one API instance. */
  runJobs: process.env.RUN_JOBS === "true",
  /** Where links in emails point. Password reset and email verification pages live on the website. */
  webUrl: (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  providerUrl: (process.env.PROVIDER_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  adminUrl: (process.env.ADMIN_URL ?? "http://localhost:5174").replace(/\/$/, ""),
  /** Outgoing email. With no SMTP_HOST, emails are printed to the console instead of sent. */
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "DialNFind <no-reply@dialnfind.com>",
    /** Where replies to account emails go, so people who answer a no-reply message still reach someone. */
    replyTo: process.env.SUPPORT_EMAIL ?? "support@dialnfind.com",
  },
  /** Public origin of this API, used to build URLs for uploaded files. */
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, ""),
  /**
   * Place search for addresses outside the directory. Defaults to OpenStreetMap Nominatim, whose
   * policy asks for an identifying User-Agent with contact details and at most one request a second.
   */
  geocoder: {
    url: (process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org").replace(/\/$/, ""),
    userAgent: process.env.GEOCODER_USER_AGENT ?? "DialNFind/1.0 (support@dialnfind.com)",
    country: process.env.GEOCODER_COUNTRY ?? "in",
    enabled: process.env.GEOCODER_ENABLED !== "false",
  },
  /**
   * Sign in with Google and Apple. Each is switched on by setting its client IDs; its endpoints answer 501 otherwise.
   * Client IDs are the accepted token audiences: every app (bundle ID / OAuth client) that can sign in.
   */
  oauth: {
    googleClientIds: list(process.env.GOOGLE_CLIENT_IDS),
    appleClientIds: list(process.env.APPLE_CLIENT_IDS),
    /** Services ID used by the websites and the Android web flow. Must also be in APPLE_CLIENT_IDS. */
    appleServicesId: process.env.APPLE_SERVICES_ID ?? "",
    /** Sign in with Apple key, used to revoke access when an account is deleted (App Store requirement). */
    appleTeamId: process.env.APPLE_TEAM_ID ?? "",
    appleKeyId: process.env.APPLE_KEY_ID ?? "",
    applePrivateKey: (process.env.APPLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    /** App URL schemes the Android Apple sign-in callback may send people back to. */
    appRedirectSchemes: list(process.env.APPLE_APP_REDIRECT_SCHEMES ?? "dialnfind,dialnfind-business"),
  },
  /**
   * Web payments (Razorpay Subscriptions). Checkout answers 501 until the keys are set. The webhook
   * secret is the one entered on the Razorpay dashboard for POST /api/v1/webhooks/razorpay.
   */
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  },
  /**
   * In-app purchases in the provider app, through RevenueCat. The secret key reads subscribers; the
   * webhook auth value must match the Authorization header set on the RevenueCat webhook.
   */
  revenuecat: {
    secretKey: process.env.REVENUECAT_SECRET_KEY ?? "",
    webhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH ?? "",
    projectId: process.env.REVENUECAT_PROJECT_ID ?? "",
  },
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  /** ID proofs, ownership documents and support attachments. Never served publicly; see lib/private-files.ts. */
  uploadPrivateDir: process.env.UPLOAD_PRIVATE_DIR ?? "uploads-private",
};

export const isProduction = env.nodeEnv === "production";
