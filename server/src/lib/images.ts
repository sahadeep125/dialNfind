import sharp, { type Metadata } from "sharp";
import { badRequest } from "./errors.js";

export interface ImageRule {
  /** The stored image fits inside this box; smaller images are never enlarged. */
  maxWidth: number;
  maxHeight: number;
  /** The shorter side must be at least this many pixels, so blurry thumbnails are turned away. */
  minSide: number;
  /** WebP quality, 1-100. */
  quality: number;
}

/** Refuses anything that would decode to more than ~40 megapixels (a small file can expand to gigabytes). */
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Decodes an uploaded image, checks it and re-encodes it as WebP: turned upright, shrunk to the rule's
 * box and stripped of metadata (EXIF, including the GPS position phones write). Decoding every pixel
 * also catches files whose header looks right but whose body is corrupt. Animated images keep their first frame.
 */
export async function processImage(input: Buffer, rule: ImageRule): Promise<{ data: Buffer; width: number; height: number }> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw badRequest("This image could not be read. Try another file.");
  }
  if (meta.width * meta.height > MAX_INPUT_PIXELS) throw badRequest("This image is too large. Use one under 40 megapixels.");
  if (Math.min(meta.width, meta.height) < rule.minSide) {
    throw badRequest(`This image is too small (${meta.autoOrient.width} × ${meta.autoOrient.height} px). Use one at least ${rule.minSide} px on each side.`);
  }
  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, autoOrient: true })
      .resize({ width: rule.maxWidth, height: rule.maxHeight, fit: "inside", withoutEnlargement: true })
      .webp({ quality: rule.quality, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw badRequest("This image could not be read. Try another file.");
  }
}
