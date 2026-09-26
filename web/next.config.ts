import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
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
    remotePatterns: IMAGE_ORIGINS.map((origin) => {
      const url = new URL(origin);
      return {
        protocol: url.protocol.replace(/:$/, "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/**",
      };
    }),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Uploads source maps when SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN are set (production builds).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Browser reports go through this site, so ad blockers do not drop them.
  tunnelRoute: "/monitoring",
});
