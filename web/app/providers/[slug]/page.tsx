import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi, publicApiOrNull } from "@/lib/api";
import type { Paged, ProviderCard as ProviderCardType, ProviderDetail, Review } from "@/lib/types";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider)
    return {
      title: "Provider not found",
      robots: { index: false, follow: true },
    };
  const p = provider;
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
      `${rating}${about || `${service} in ${place}.`} Call ${p.businessName} directly on DialNFind.`,
    ),
    path: `/providers/${p.slug}`,
    type: "profile",
  });
}

export default async function ProviderPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await getProvider(slug);
  if (!p) notFound();
  const [reviews, { results: similar }, { config }] = await Promise.all([
    publicApi<{ reviews: Review[] } & Paged>(`/providers/${encodeURIComponent(slug)}/reviews`, {
      query: { pageSize: REVIEWS_PAGE },
      revalidate: PROVIDER_TTL,
      tags: tagsFor(slug),
    }),
    publicApi<{ results: ProviderCardType[] }>(`/providers/${encodeURIComponent(slug)}/similar`, { revalidate: PROVIDER_TTL, tags: tagsFor(slug) }),
    publicApi<{ config: { min_review_length: number } }>("/app-config", { revalidate: 600, tags: ["app-config"] }),
  ]);

  return <ProviderProfile p={p} reviews={reviews} similar={similar} minReviewLength={config.min_review_length} />;
}
