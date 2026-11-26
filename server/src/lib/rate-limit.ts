import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../env.js";

const MINUTE = 60 * 1000;
const byIp = (req: Request) => ipKeyGenerator(req.ip ?? "unknown");

/** Header the website's server sends on its cached, visitor-independent fetches (web/lib/api.ts publicApi). */
export const WEB_SERVER_HEADER = "x-web-secret";

/**
 * True for the website's own server rendering public pages. Those fetches carry no visitor address, so they
 * would all share one per-address limit: a search engine crawling the sitemap used it up within minutes and
 * every page after that failed with 500. They prove themselves with REVALIDATE_SECRET, which only the website has.
 */
export function isWebServer(req: Request): boolean {
  const secret = env.revalidateSecret;
  const given = req.get(WEB_SERVER_HEADER);
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Builds a limiter that answers 429 in the API's usual error shape. Each limiter keeps its own count.
 * Counters live in memory, so each API instance counts on its own; use a shared store (Redis) before
 * running more than one.
 */
function limiter(windowMs: number, limit: number, message: string, key: (req: Request) => string = byIp, exemptWebServer = false) {
  return rateLimit({
    windowMs,
    limit: Math.max(1, Math.round(limit * env.rateLimitMultiplier)),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: key,
    skip: (req) => env.rateLimitMultiplier === 0 || (exemptWebServer && isWebServer(req)),
    handler: (_req, res) => {
      res.status(429).json({ error: { code: "rate_limited", message } });
    },
  });
}

const emailKey = (req: Request) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return `${byIp(req)}:${email}`;
};

export const limits = {
  /** Every API request from one address (not the website's own page rendering). */
  global: limiter(15 * MINUTE, 600, "Too many requests. Please wait a few minutes and try again.", byIp, true),
  /** Sign in, sign up and password reset, counted per address and email so one account cannot be guessed at. */
  auth: limiter(15 * MINUTE, 10, "Too many attempts. Please wait 15 minutes and try again.", emailKey),
  /** Call and WhatsApp taps. */
  leads: limiter(10 * MINUTE, 30, "Too many contact requests. Please wait a few minutes."),
  /** The public contact form (no account needed, so the tightest). */
  contact: limiter(60 * MINUTE, 5, "You have sent several messages already. Please wait before sending another."),
  /** New support tickets from signed-in users. */
  tickets: limiter(60 * MINUTE, 10, "You have opened several tickets already. Please wait before opening another."),
  /** Ownership claims on listings. */
  claims: limiter(60 * MINUTE, 5, "You have sent several claims already. Please wait before sending another."),
  /** Providers reporting spam or fake contacts. */
  disputes: limiter(60 * MINUTE, 30, "You have reported many contacts already. Please wait before reporting more."),
  /** New reviews and reports. */
  reviews: limiter(60 * MINUTE, 20, "Too many reviews or reports in a short time. Please try again later."),
  /** Lead spreadsheet downloads. */
  exports: limiter(60 * MINUTE, 20, "You have downloaded several exports already. Please wait before downloading another."),
  uploads: limiter(10 * MINUTE, 30, "Too many uploads. Please wait a few minutes."),
  /** Search, suggestions and location lookups. */
  search: limiter(1 * MINUTE, 120, "Too many searches. Please slow down for a moment.", byIp, true),
};
