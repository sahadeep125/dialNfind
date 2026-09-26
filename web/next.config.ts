import type { NextConfig } from "next";
import { IMAGE_ORIGINS } from "./lib/image-hosts";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://appleid.apple.com; object-src 'none'" },
];

const nextConfig: NextConfig = {
  images: {
    // Only our own upload origins (NEXT_PUBLIC_IMAGE_ORIGINS). Other image URLs render unoptimized; see lib/image-hosts.ts.
    remotePatterns: IMAGE_ORIGINS.map((origin) => new URL(origin)),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
