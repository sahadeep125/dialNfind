import { ImageResponse } from "next/og";
import { GUIDES, getGuide } from "@/lib/guides";
import { OG_SIZE, OgFrame } from "@/lib/og";

export const alt = "Home service guide on DialNFind";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  return new ImageResponse(<OgFrame eyebrow="DialNFind guide" title={guide?.title ?? "Home service guides"} footer="Costs, checklists and tips for home services" />, size);
}
