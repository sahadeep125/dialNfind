import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { publicApi, publicApiOrNull } from "@/lib/api";
import type { Category, Paged, ProviderCard as ProviderCardType, ProviderDetail, Review } from "@/lib/types";
import { ProviderProfile, REVIEWS_PAGE } from "@/components/provider/provider-profile";
import { clip, pageMetadata } from "@/lib/seo";

type Params = { slug: string };

/**
 * Profiles are cached for everyone. The API refreshes a profile the moment it changes (/api/revalidate), a
 * visitor's own review does the same (actions.ts), and the timer below is only a safety net.
 */
export const revalidate = 300;
export async function generateStaticParams(): Promise<Params[]> {
  return [];
}

const PROVIDER_TTL = 300;
const tagsFor = (slug: string) => [`provider:${slug}`, "providers"];

/** One request per render for both the metadata and the page; views are counted in the browser (viewer-state.tsx). */
const getProvider = cache(async (slug: string) => {
  const data = await publicApiOrNull<{ provider: ProviderDetail }>(
    `/providers/${encodeURIComponent(slug)}`,
    {
      query: { view: "false" },
      revalidate: PROVIDER_TTL,
      tags: tagsFor(slug),
    },
  );
  return data?.provider ?? null;
});

/**
 * A listing the team deleted keeps sending its old address on: a permanent redirect to its category,
 * so search engines move the link's value there instead of finding a 404. Tagged like the profile, so
 * the API's refresh on delete clears a cached "not deleted" answer straight away.
 */
const getRemovedPath = cache(async (slug: string) => {
  const data = await publicApiOrNull<{ path: string }>(`/providers/removed/${encodeURIComponent(slug)}`, {
    revalidate: PROVIDER_TTL,
    tags: tagsFor(slug),
  });
  return data?.path.startsWith("/") ? data.path : null;
});

/** No live listing: redirect when it was deleted, otherwise a 404. */
async function redirectOrNotFound(slug: string): Promise<never> {
  const path = await getRemovedPath(slug);
  if (path) permanentRedirect(path);
  notFound();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) {
    // Search engines get metadata before anything streams, so a deleted listing answers with a real 308.
    const moved = await getRemovedPath(slug);
    if (moved) permanentRedirect(moved);
    return {
      title: "Provider not found",
      robots: { index: false, follow: true },
    };
  }
  const p = provider;
  const path = `/providers/${p.slug}`;
  // The API writes the title and description (the provider can edit them), so the site, the provider's SEO
  // page and the admin console all show the same text.
  if (p.seo) {
    return {
      ...pageMetadata({ title: p.seo.title, description: p.seo.description, path, type: "profile", absoluteTitle: true }),
      keywords: p.seo.keywords,
      ...(p.seo.noIndex ? { robots: { index: false, follow: true } } : {}),
    };
  }
  const place = p.locality ? `${p.locality}, ${p.city}` : p.city;
  const service = p.primaryCategory?.name ?? "Local services";
  const rating =
    p.totalReviews > 0
      ? `Rated ${p.avgRating.toFixed(1)}/5 from ${p.totalReviews} reviews. `
      : "";
  const about = (p.description || p.shortDescription || "")
    .replace(/\s+/g, " ")
    .trim();
  return pageMetadata({
    title: `${p.businessName}: ${service} in ${place}`,
    description: clip(
      `${rating}${about || `${service} in ${place}.`} Call ${p.businessName} directly on KaajVa.`,
    ),
    path,
    type: "profile",
  });
}

export default async function ProviderPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await getProvider(slug);
  if (!p) return redirectOrNotFound(slug);
  const [reviews, { results: similar }, { config }, { categories }] = await Promise.all([
    publicApi<{ reviews: Review[] } & Paged>(`/providers/${encodeURIComponent(slug)}/reviews`, {
      query: { pageSize: REVIEWS_PAGE },
      revalidate: PROVIDER_TTL,
      tags: tagsFor(slug),
    }),
    publicApi<{ results: ProviderCardType[] }>(`/providers/${encodeURIComponent(slug)}/similar`, { revalidate: PROVIDER_TTL, tags: tagsFor(slug) }),
    publicApi<{ config: { min_review_length: number } }>("/app-config", { revalidate: 600, tags: ["app-config"] }),
    publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] }),
  ]);

  return <ProviderProfile p={p} reviews={reviews} similar={similar} minReviewLength={config.min_review_length} categories={categories} />;
}
