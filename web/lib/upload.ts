"use client";


export type UploadPurpose = "avatar" | "logo" | "cover" | "portfolio" | "review" | "document";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Same limits the API enforces (server/src/routes/uploads.ts). minSide is the shortest allowed image side in pixels. */
export const UPLOAD_RULES: Record<UploadPurpose, { types: string[]; maxMb: number; minSide: number }> = {
  avatar: { types: IMAGE_TYPES, maxMb: 5, minSide: 128 },
  logo: { types: IMAGE_TYPES, maxMb: 5, minSide: 64 },
  cover: { types: IMAGE_TYPES, maxMb: 8, minSide: 400 },
  portfolio: { types: IMAGE_TYPES, maxMb: 8, minSide: 400 },
  review: { types: IMAGE_TYPES, maxMb: 5, minSide: 300 },
  document: { types: [...IMAGE_TYPES, "application/pdf"], maxMb: 10, minSide: 300 },
};

/** Decodes an image to read its size; null when the browser cannot read it. */
async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // Older Safari cannot decode some files into a bitmap; an <img> element still can.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    return img
      .decode()
      .then(() => ({ width: img.naturalWidth, height: img.naturalHeight }))
      .catch(() => null)
      .finally(() => URL.revokeObjectURL(url));
  }
}

/**
 * Checks type, size and (for images) that the picture opens and is big enough, before any bytes leave
 * the browser. Returns an error message or null. The API repeats every check, so this is only for speed.
 */
export async function checkFile(file: File, purpose: UploadPurpose): Promise<string | null> {
  const rule = UPLOAD_RULES[purpose];
  if (!rule.types.includes(file.type)) return purpose === "document" ? "Choose a JPG, PNG, WebP or PDF file" : "Choose a JPG, PNG or WebP image";
  if (file.size === 0) return "This file is empty. Choose another one.";
  if (file.size > rule.maxMb * 1024 * 1024) return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${rule.maxMb} MB.`;
  if (file.type.startsWith("image/")) {
    const size = await imageSize(file);
    if (!size) return "This image could not be read. Choose another file.";
    if (Math.min(size.width, size.height) < rule.minSide) return `This image is ${size.width} × ${size.height} px. Use one at least ${rule.minSide} px on each side.`;
  }
  return null;
}

/** Uploads one file with progress reporting and resolves to its public URL. */
export function uploadFile(file: File, purpose: UploadPurpose, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Same-origin proxy attaches the httpOnly session token.
    xhr.open("POST", `/api/proxy/uploads?purpose=${purpose}`);
    xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { url?: string; error?: { message?: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.url) resolve(body.url);
      else reject(new Error(body?.error?.message ?? "Upload failed. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}
