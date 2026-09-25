import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { env } from "../env.js";

/**
 * Documents (ID proofs, ownership papers, support attachments) are stored outside the public upload
 * folder. The database keeps a plain URL under PRIVATE_FILES_URL; every API response turns it into a
 * signed link that works for an hour, and GET /api/v1/files/* refuses anything unsigned or expired.
 */
export const PRIVATE_FILES_ROUTE = "/api/v1/files";
export const PRIVATE_FILES_URL = `${env.publicUrl}${PRIVATE_FILES_ROUTE}/`;
export const privateDir = path.resolve(env.uploadPrivateDir);
const LINK_LIFETIME_S = 60 * 60;

const signature = (key: string, exp: number) => createHmac("sha256", env.jwtSecret).update(`file:${key}:${exp}`).digest("base64url");

/** A time-limited link for one private file. */
export function signFileUrl(url: string): string {
  const key = url.slice(PRIVATE_FILES_URL.length).split("?")[0];
  const exp = Math.floor(Date.now() / 1000) + LINK_LIFETIME_S;
  return `${PRIVATE_FILES_URL}${key}?exp=${exp}&sig=${signature(key, exp)}`;
}

/** A time-limited link to a generated file (such as an invoice PDF) served at `${env.publicUrl}${route}/${key}`. */
export function signedLink(route: string, key: string): string {
  const exp = Math.floor(Date.now() / 1000) + LINK_LIFETIME_S;
  return `${env.publicUrl}${route}/${key}?exp=${exp}&sig=${signature(key, exp)}`;
}

export function checkFileSignature(key: string, exp: string | undefined, sig: string | undefined): boolean {
  const expiry = Number(exp);
  if (!sig || !Number.isInteger(expiry) || expiry < Date.now() / 1000) return false;
  const expected = Buffer.from(signature(key, expiry));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Replaces every private file URL in a response body with a signed one. */
export function signPrivateUrls(value: unknown): unknown {
  if (typeof value === "string") return value.startsWith(PRIVATE_FILES_URL) ? signFileUrl(value) : value;
  if (Array.isArray(value)) return value.map(signPrivateUrls);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = signPrivateUrls(v);
    return out;
  }
  return value;
}

/** Input rule for document fields: only files uploaded to this API, stored without the signature. */
export const privateFileUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v.startsWith(PRIVATE_FILES_URL), "Upload the file again")
  .transform((v) => v.split("?")[0]);
