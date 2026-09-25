import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
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
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  timezone: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  /** Scheduled jobs (plan expiry, reminders, nightly ranking). Turn on in exactly one API instance. */
  runJobs: process.env.RUN_JOBS === "true",
  /** Where links in emails point. Password reset and email verification pages live on the website. */
  webUrl: (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  providerUrl: (process.env.PROVIDER_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  /** Outgoing email. With no SMTP_HOST, emails are printed to the console instead of sent. */
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "DialNFind <no-reply@dialnfind.com>",
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
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  /** ID proofs, ownership documents and support attachments. Never served publicly; see lib/private-files.ts. */
  uploadPrivateDir: process.env.UPLOAD_PRIVATE_DIR ?? "uploads-private",
};

export const isProduction = env.nodeEnv === "production";
