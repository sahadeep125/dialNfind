/**
 * Origins whose images Next may resize (the API's uploads and any storage CDN). Providers can also
 * link a logo or cover from anywhere; those are shown as they are, so the image optimizer never
 * fetches from arbitrary hosts.
 */
export const IMAGE_ORIGINS = (process.env.NEXT_PUBLIC_IMAGE_ORIGINS || "http://localhost:4000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

/** True when next/image may optimize this URL; pass the opposite as `unoptimized`. */
export function isOptimizableImage(src: string): boolean {
  try {
    return IMAGE_ORIGINS.includes(new URL(src).origin);
  } catch {
    return false;
  }
}
