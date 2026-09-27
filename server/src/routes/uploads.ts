import express, { Router } from "express";
import { z } from "zod";
import { parse } from "../lib/validate.js";
import { badRequest } from "../lib/errors.js";
import { processImage, type ImageRule } from "../lib/images.js";
import { requireAuth } from "../middleware/auth.js";
import { storage, storageKey } from "../storage/index.js";

export const uploadsRouter = Router();

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
type Purpose = "avatar" | "logo" | "cover" | "portfolio" | "review" | "document";

/**
 * What each kind of upload may contain and how images are stored. Documents also allow PDF. Images are
 * always re-encoded to WebP inside `image`'s box; the apps mirror maxBytes and minSide (lib/upload.ts,
 * constants/uploads.ts) so people hear about a problem before the upload starts.
 */
const PURPOSES: Record<Purpose, { folder: string; types: string[]; maxBytes: number; image: ImageRule }> = {
  avatar: { folder: "avatars", types: IMAGE_TYPES, maxBytes: 5 * 1024 * 1024, image: { maxWidth: 512, maxHeight: 512, minSide: 128, quality: 80 } },
  // Also used for category and badge icons.
  logo: { folder: "logos", types: IMAGE_TYPES, maxBytes: 5 * 1024 * 1024, image: { maxWidth: 512, maxHeight: 512, minSide: 64, quality: 85 } },
  cover: { folder: "covers", types: IMAGE_TYPES, maxBytes: 8 * 1024 * 1024, image: { maxWidth: 1920, maxHeight: 1080, minSide: 400, quality: 80 } },
  portfolio: { folder: "portfolio", types: IMAGE_TYPES, maxBytes: 8 * 1024 * 1024, image: { maxWidth: 1600, maxHeight: 1600, minSide: 400, quality: 80 } },
  review: { folder: "reviews", types: IMAGE_TYPES, maxBytes: 5 * 1024 * 1024, image: { maxWidth: 1600, maxHeight: 1600, minSide: 300, quality: 80 } },
  // Higher quality and size so the text on ID proofs and registration papers stays readable.
  document: { folder: "documents", types: [...IMAGE_TYPES, "application/pdf"], maxBytes: 10 * 1024 * 1024, image: { maxWidth: 2400, maxHeight: 2400, minSide: 300, quality: 90 } },
};

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
 * Returns { url } to store on the record (portfolio imageUrl, logoUrl, documentUrl, ...). Images come back
 * as optimized WebP; PDFs are stored as sent. Documents are private: their URL comes back signed and only
 * works for an hour, like everywhere else in the API.
 */
uploadsRouter.post(
  "/",
  requireAuth,
  express.raw({ type: () => true, limit: MAX_BYTES }),
  async (req, res) => {
    const { purpose } = parse(z.object({ purpose: z.enum(Object.keys(PURPOSES) as [Purpose, ...Purpose[]]) }), req.query);
    const rule = PURPOSES[purpose];
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) throw badRequest("Choose a file to upload");
    if (body.length > rule.maxBytes) throw badRequest(`The file is too large. The limit is ${rule.maxBytes / 1024 / 1024} MB.`);
    const type = sniff(body);
    if (!type || !rule.types.includes(type)) {
      throw badRequest(purpose === "document" ? "Upload a JPG, PNG, WebP or PDF file" : "Upload a JPG, PNG or WebP image");
    }
    const visibility = purpose === "document" ? "private" : "public";
    if (type === "application/pdf") {
      const url = await storage.put(storageKey(rule.folder, "pdf"), body, type, visibility);
      res.status(201).json({ url, contentType: type, size: body.length });
      return;
    }
    const image = await processImage(body, rule.image);
    const url = await storage.put(storageKey(rule.folder, "webp"), image.data, "image/webp", visibility);
    res.status(201).json({ url, contentType: "image/webp", size: image.data.length, width: image.width, height: image.height });
  },
);
