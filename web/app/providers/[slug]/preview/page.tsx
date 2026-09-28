import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiOrNull } from "@/lib/api";
import type { Paged, ProviderDetail, Review } from "@/lib/types";
import { getAppConfig } from "@/lib/app-config";
import { ProviderProfile, REVIEWS_PAGE } from "@/components/provider/provider-profile";

type Params = { slug: string };

/**
 * The owner's or team's view of a listing before it is live, from a short-lived link the API signs
 * (GET /provider/preview-link). Never cached and never indexed; the public page stays fully cached.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Listing preview", robots: { index: false, follow: false } };

export default async function ProviderPreviewPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ token?: string | string[] }> }) {
  const [{ slug }, { token }] = await Promise.all([params, searchParams]);
  if (typeof token !== "string" || !token) notFound();
  const [data, config] = await Promise.all([
    apiOrNull<{ provider: ProviderDetail }>(`/providers/${encodeURIComponent(slug)}`, { auth: false, query: { view: "false", previewToken: token } }),
    getAppConfig(),
  ]);
  if (!data) notFound();
  const p = data.provider;
  // Reviews are only served for live listings; one that is not live yet shows none.
  const empty = { reviews: [], page: 1, pageSize: REVIEWS_PAGE, total: 0, totalPages: 0 };
  const reviews =
    p.status === "active"
      ? ((await apiOrNull<{ reviews: Review[] } & Paged>(`/providers/${encodeURIComponent(slug)}/reviews`, { auth: false, query: { pageSize: REVIEWS_PAGE } })) ?? empty)
      : empty;
  return <ProviderProfile p={p} reviews={reviews} similar={[]} minReviewLength={config.min_review_length} previewStatus={p.status ?? "active"} />;
}
