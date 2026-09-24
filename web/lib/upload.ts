"use client";


export type UploadPurpose = "avatar" | "logo" | "cover" | "portfolio" | "review" | "document";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const UPLOAD_RULES: Record<UploadPurpose, { types: string[]; maxMb: number }> = {
  avatar: { types: IMAGE_TYPES, maxMb: 5 },
  logo: { types: IMAGE_TYPES, maxMb: 5 },
  cover: { types: IMAGE_TYPES, maxMb: 8 },
  portfolio: { types: IMAGE_TYPES, maxMb: 8 },
  review: { types: IMAGE_TYPES, maxMb: 5 },
  document: { types: [...IMAGE_TYPES, "application/pdf"], maxMb: 10 },
};

/** Checks type and size before any bytes leave the browser. Returns an error message or null. */
export function checkFile(file: File, purpose: UploadPurpose): string | null {
  const rule = UPLOAD_RULES[purpose];
  if (!rule.types.includes(file.type)) return purpose === "document" ? "Choose a JPG, PNG, WebP or PDF file" : "Choose a JPG, PNG or WebP image";
  if (file.size > rule.maxMb * 1024 * 1024) return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${rule.maxMb} MB.`;
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
