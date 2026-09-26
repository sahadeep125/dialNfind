import type { UploadPurpose } from "@/types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Same limits the API enforces (server/src/routes/uploads.ts). */
export const UPLOAD_RULES: Record<UploadPurpose, { types: string[]; maxMb: number }> = {
  avatar: { types: IMAGE_TYPES, maxMb: 5 },
  logo: { types: IMAGE_TYPES, maxMb: 5 },
  cover: { types: IMAGE_TYPES, maxMb: 8 },
  portfolio: { types: IMAGE_TYPES, maxMb: 8 },
  review: { types: IMAGE_TYPES, maxMb: 5 },
  document: { types: [...IMAGE_TYPES, "application/pdf"], maxMb: 10 },
};
