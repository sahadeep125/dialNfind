import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../env.js";

const MINUTE = 60 * 1000;
const byIp = (req: Request) => ipKeyGenerator(req.ip ?? "unknown");

/**
 * Builds a limiter that answers 429 in the API's usual error shape. Each limiter keeps its own count.
 * Counters live in memory, so each API instance counts on its own; use a shared store (Redis) before
 * running more than one.
 */
function limiter(windowMs: number, limit: number, message: string, key: (req: Request) => string = byIp) {
  return rateLimit({
    windowMs,
    limit: Math.max(1, Math.round(limit * env.rateLimitMultiplier)),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: key,
    skip: () => env.rateLimitMultiplier === 0,
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
  /** Every API request from one address. */
  global: limiter(15 * MINUTE, 600, "Too many requests. Please wait a few minutes and try again."),
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
  /** Plan and promotion requests from providers. */
  billing: limiter(60 * MINUTE, 10, "You have sent several requests already. Please wait before sending another."),
  /** Providers reporting spam or fake contacts. */
  disputes: limiter(60 * MINUTE, 30, "You have reported many contacts already. Please wait before reporting more."),
  /** New reviews and reports. */
  reviews: limiter(60 * MINUTE, 20, "Too many reviews or reports in a short time. Please try again later."),
  /** Lead spreadsheet downloads. */
  exports: limiter(60 * MINUTE, 20, "You have downloaded several exports already. Please wait before downloading another."),
  uploads: limiter(10 * MINUTE, 30, "Too many uploads. Please wait a few minutes."),
  /** Search, suggestions and location lookups. */
  search: limiter(1 * MINUTE, 120, "Too many searches. Please slow down for a moment."),
};
