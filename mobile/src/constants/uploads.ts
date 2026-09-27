import type { UploadPurpose } from "@/types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Same limits the API enforces (server/src/routes/uploads.ts). minSide is the shortest allowed image
 * side in pixels. The API stores every image as optimized WebP.
 */
export const UPLOAD_RULES: Record<UploadPurpose, { types: string[]; maxMb: number; minSide: number }> = {
  avatar: { types: IMAGE_TYPES, maxMb: 5, minSide: 128 },
  logo: { types: IMAGE_TYPES, maxMb: 5, minSide: 64 },
  cover: { types: IMAGE_TYPES, maxMb: 8, minSide: 400 },
  portfolio: { types: IMAGE_TYPES, maxMb: 8, minSide: 400 },
  review: { types: IMAGE_TYPES, maxMb: 5, minSide: 300 },
  document: { types: [...IMAGE_TYPES, "application/pdf"], maxMb: 10, minSide: 300 },
};
