import { ImageResponse } from "next/og";
import { publicApiOrNull } from "@/lib/api";
import { OG_SIZE, OgFrame } from "@/lib/og";
import type { ProviderDetail } from "@/lib/types";

export const alt = "Provider profile on DialNFind";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicApiOrNull<{ provider: ProviderDetail }>(`/providers/${encodeURIComponent(slug)}`, {
    query: { view: "false" },
    revalidate: 3600,
    tags: [`provider:${slug}`],
  });
  const p = data?.provider;
  if (!p) return new ImageResponse(<OgFrame eyebrow="DialNFind" title="Trusted local service providers" />, size);
  const rating = p.totalReviews > 0 ? `Rated ${p.avgRating.toFixed(1)} from ${p.totalReviews} reviews` : "New on DialNFind";
  return new ImageResponse(
    <OgFrame
      eyebrow={p.primaryCategory?.name ?? "Local services"}
      title={p.businessName}
      subtitle={`${p.locality ? `${p.locality}, ` : ""}${p.city} · ${rating}`}
      footer={p.verificationStatus === "verified" ? "Verified provider · Call directly on DialNFind" : "Call directly on DialNFind"}
    />,
    size,
  );
}
