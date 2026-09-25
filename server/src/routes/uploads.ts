import express, { Router } from "express";
import { z } from "zod";
import { parse } from "../lib/validate.js";
import { badRequest } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { storage, storageKey } from "../storage/index.js";

export const uploadsRouter = Router();

/** What each kind of upload may contain. Documents also allow PDF. */
const PURPOSES = {
  avatar: { folder: "avatars", types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 },
  logo: { folder: "logos", types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 },
  cover: { folder: "covers", types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024 },
  portfolio: { folder: "portfolio", types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024 },
  review: { folder: "reviews", types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 },
  document: { folder: "documents", types: ["image/jpeg", "image/png", "image/webp", "application/pdf"], maxBytes: 10 * 1024 * 1024 },
} as const;

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Checks the file's first bytes so a renamed file cannot pass as an image. */
function sniff(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

const MAX_BYTES = Math.max(...Object.values(PURPOSES).map((p) => p.maxBytes));

/**
 * POST /uploads?purpose=portfolio — the request body is the raw file, sent with its content type.
 * Returns { url } to store on the record (portfolio imageUrl, logoUrl, documentUrl, ...). Documents are
 * private: their URL comes back signed and only works for an hour, like everywhere else in the API.
 */
uploadsRouter.post(
  "/",
  requireAuth,
  express.raw({ type: () => true, limit: MAX_BYTES }),
  async (req, res) => {
    const { purpose } = parse(z.object({ purpose: z.enum(Object.keys(PURPOSES) as [keyof typeof PURPOSES]) }), req.query);
    const rule = PURPOSES[purpose];
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) throw badRequest("Choose a file to upload");
    if (body.length > rule.maxBytes) throw badRequest(`The file is too large. The limit is ${rule.maxBytes / 1024 / 1024} MB.`);
    const type = sniff(body);
    if (!type || !(rule.types as readonly string[]).includes(type)) {
      throw badRequest(purpose === "document" ? "Upload a JPG, PNG, WebP or PDF file" : "Upload a JPG, PNG or WebP image");
    }
    const url = await storage.put(storageKey(rule.folder, EXT[type]), body, type, purpose === "document" ? "private" : "public");
    res.status(201).json({ url, contentType: type, size: body.length });
  },
);
