import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/og";

export const alt = "KaajVa: find trusted local service providers in Siliguri";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgFrame eyebrow="Local services directory" title="Find trusted local pros in Siliguri, in seconds" subtitle="Electricians, plumbers, AC and TV repair, movers, tutors and more" />, size);
}
