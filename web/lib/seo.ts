import type { Metadata } from "next";
import { SITE_NAME } from "./config";

/**
 * Metadata for a public page: its own canonical URL and social preview. Next merges metadata
 * shallowly, so every public page sets these rather than inheriting the home page's.
 */
export function pageMetadata({
  title,
  description,
  path,
  images,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  images?: { url: string; alt?: string }[];
  type?: "website" | "profile" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, locale: "en_IN", url: path, title, description, ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(images ? { images: images.map((i) => i.url) } : {}) },
  };
}

/** Pages behind sign-in, or one-off flows (password reset), stay out of search results. */
export const NO_INDEX: Metadata["robots"] = { index: false, follow: false };

/** Shortens text for a meta description at a word boundary, so it never ends mid-word. */
export function clip(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s-]+$/, "")}…`;
}
