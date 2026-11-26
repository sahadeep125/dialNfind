import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { IMAGE_ORIGINS } from "./lib/image-hosts";
import pkg from "./package.json" with { type: "json" };

// Analytics (lib/analytics.ts) is sent to /ingest on this site and passed on to PostHog, so ad blockers do not drop it.
const POSTHOG_HOST = (process.env.POSTHOG_INGEST_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
const POSTHOG_ASSETS_HOST = POSTHOG_HOST.replace(/^https:\/\/(\w+)\.i\./, "https://$1-assets.i.");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://appleid.apple.com; object-src 'none'" },
];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// The public address (lib/config.ts SITE_URL). Read here too, because next.config cannot import app code.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaajva.in").replace(/\/$/, "");

/**
 * Cloudflare tells the origin which scheme the visitor used in the cf-visitor header ({"scheme":"http"}).
 * A plain-http request gets a permanent redirect to the https address, so Google stops finding a second,
 * http copy of every page (Search Console listed hundreds of them as "Alternative page with proper canonical").
 */
const httpsRedirect = SITE_URL.startsWith("https://")
  ? [{ source: "/:path*", has: [{ type: "header" as const, key: "cf-visitor", value: '.*"scheme":"http".*' }], destination: `${SITE_URL}/:path*`, permanent: true }]
  : [];

// Docker images (web/Dockerfile) run the self-contained server that `standalone` produces. Tracing starts at
// the workspace root because pnpm keeps packages there. `next start` does not work with it, so it is opt-in.
const standalone = process.env.NEXT_OUTPUT_STANDALONE === "1";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version },
  ...(standalone ? { output: "standalone" as const, outputFileTracingRoot: path.resolve(process.cwd(), "..") } : {}),
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
    // Next 16 refuses to optimize images from private IPs. Allow that only when our own upload origin is
    // this machine (local development); production origins are public, so the protection stays on there.
    dangerouslyAllowLocalIP: IMAGE_ORIGINS.some((origin) => LOCAL_HOSTS.has(new URL(origin).hostname)),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // PostHog's endpoints end in a slash (/ingest/e/), which the default trailing-slash redirect would strip.
  // It is turned off, and the redirect below does the same job for every other path.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      ...httpsRedirect,
      { source: "/:path((?!ingest/).+)/", destination: "/:path", permanent: true },
      // Crawlers ask for /apple-icon (no extension); the file is served at /apple-icon.png.
      { source: "/apple-icon", destination: "/apple-icon.png", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS_HOST}/static/:path*` },
      { source: "/ingest/array/:path*", destination: `${POSTHOG_ASSETS_HOST}/array/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_HOST}/:path*` },
    ];
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
