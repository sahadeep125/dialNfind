import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

/** The repository root (this file is server/src/env.ts, or server/dist/env.js once built). */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Relative folders are taken from the repository root, so they are the same whichever directory the API starts in. */
const fromRepoRoot = (dir: string) => path.resolve(REPO_ROOT, dir);

function list(value: string | undefined): string[] {
  return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  /** Signs session tokens and, with a separate prefix, private file links. No fallback, so a forgotten value can never mean a guessable secret. */
  jwtSecret: required("JWT_SECRET"),
  /** Customer and provider sign-ins last this many days; staff sign-ins are much shorter. */
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  staffSessionHours: Number(process.env.STAFF_SESSION_HOURS ?? 12),
  /** Scales every rate limit (2 doubles them). 0 turns rate limiting off, for load tests only. */
  rateLimitMultiplier: Number(process.env.RATE_LIMIT_MULTIPLIER ?? 1),
  /**
   * Proxies in front of the API that add an X-Forwarded-For entry (a load balancer is 1; a CDN in front of it
   * makes 2). Rate limits are per visitor address, so a wrong count makes everyone share one limit (too low)
   * or lets visitors pick their own address (too high).
   */
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  corsOrigins: list(process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173,http://localhost:5174"),
  timezone: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  /** Scheduled jobs (plan expiry, reminders, nightly ranking). Turn on in exactly one API instance. */
  runJobs: process.env.RUN_JOBS === "true",
  /** Where links in emails point. Password reset and email verification pages live on the website. */
  webUrl: (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  providerUrl: (process.env.PROVIDER_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  adminUrl: (process.env.ADMIN_URL ?? "http://localhost:5174").replace(/\/$/, ""),
  /**
   * Public pages on the website are cached. After a change, the API asks the website to rebuild them at
   * WEB_INTERNAL_URL/api/revalidate (http://web:3000 inside Docker). Without REVALIDATE_SECRET (the same value
   * as on the website) nothing is sent, and pages refresh only when their cache time runs out.
   */
  webInternalUrl: (process.env.WEB_INTERNAL_URL || process.env.WEB_URL || "http://localhost:3000").replace(/\/$/, ""),
  revalidateSecret: process.env.REVALIDATE_SECRET ?? "",
  /** Outgoing email. With no SMTP_HOST, emails are printed to the console instead of sent. */
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    /** Defaults to the SMTP login: Gmail and most providers rewrite or reject a From address the account does not own. */
    from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `DialNFind <${process.env.SMTP_USER}>` : "DialNFind <no-reply@dialnfind.com>"),
    /** Where replies to account emails go, so people who answer a no-reply message still reach someone. */
    replyTo: process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "support@dialnfind.com",
  },
  /** Public origin of this API, used to build URLs for uploaded files. */
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, ""),
  /**
   * Place search for addresses outside the directory. Defaults to OpenStreetMap Nominatim, whose
   * policy asks for an identifying User-Agent with contact details and at most one request a second.
   */
  geocoder: {
    url: (process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org").replace(/\/$/, ""),
    userAgent: process.env.GEOCODER_USER_AGENT || `DialNFind/1.0 (${process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "support@dialnfind.com"})`,
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
  /**
   * Product analytics (PostHog). Off unless POSTHOG_KEY is set. The key is the project token shared with the
   * web and mobile apps, so server events land on the same people.
   */
  posthog: {
    key: process.env.POSTHOG_KEY ?? "",
    host: (process.env.POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, ""),
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
  },
  /** Public images (logos, covers, portfolio, review and profile photos), served at PUBLIC_URL/uploads. */
  uploadDir: fromRepoRoot(process.env.UPLOAD_DIR || "uploads/public"),
  /** ID proofs, ownership documents and support attachments. Never served publicly; see lib/private-files.ts. */
  uploadPrivateDir: fromRepoRoot(process.env.UPLOAD_PRIVATE_DIR || "uploads/private"),
};

export const isProduction = env.nodeEnv === "production";

/**
 * Settings that work in development but are wrong for real users: a weak token secret, links that
 * point at localhost, email printed to the console instead of sent. Production refuses to start with
 * any of them, so a missed variable shows up at deploy time instead of in a customer's inbox.
 */
function productionProblems(): string[] {
  const problems: string[] = [];
  if (env.jwtSecret.length < 32 || /change-me|change-this|replace_with/i.test(env.jwtSecret)) {
    problems.push("JWT_SECRET must be a random value of at least 32 characters (for example `openssl rand -base64 48`)");
  }
  const local = /localhost|127\.0\.0\.1|10\.0\.2\.2/;
  for (const [name, value] of [["PUBLIC_URL", env.publicUrl], ["WEB_URL", env.webUrl], ["PROVIDER_URL", env.providerUrl], ["ADMIN_URL", env.adminUrl]] as const) {
    if (local.test(value) || !value.startsWith("https://")) problems.push(`${name} must be the public https address, not ${value}`);
  }
  if (!process.env.CORS_ORIGINS) problems.push("CORS_ORIGINS must list the web, provider and admin origins");
  if (!env.smtp.host) problems.push("SMTP_HOST is empty, so sign-up codes and password reset links would only be printed to the log");
  // Example values copied from .env.production.example; the mail server refuses them, so no email would arrive.
  const placeholder = /your-email@|@example\.(com|org)|your-app-password/i;
  for (const [name, value] of [["SMTP_USER", env.smtp.user], ["SMTP_PASS", env.smtp.pass], ["SMTP_FROM", env.smtp.from], ["SUPPORT_EMAIL", env.smtp.replyTo]] as const) {
    if (placeholder.test(value)) problems.push(`${name} is still the example value; set the real mail account in .env`);
  }
  if (env.rateLimitMultiplier <= 0) problems.push("RATE_LIMIT_MULTIPLIER must be above 0; 0 turns off every rate limit");
  return problems;
}

if (isProduction) {
  const problems = productionProblems();
  if (problems.length) {
    throw new Error(`Refusing to start with NODE_ENV=production:\n- ${problems.join("\n- ")}`);
  }
  if (!env.revalidateSecret) {
    console.warn("REVALIDATE_SECRET is empty: website pages will show changes only when their cache runs out (up to an hour).");
  }
}
