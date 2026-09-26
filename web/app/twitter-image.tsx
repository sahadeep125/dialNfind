import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/og";

export const alt = "DialNFind: find trusted local service providers near you";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgFrame eyebrow="Local services directory" title="Find trusted local pros near you, in seconds" subtitle="Electricians, plumbers, AC and TV repair, cleaning and more" />, size);
}
