import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Uploaded files served by the API in development (see PUBLIC_URL in server/.env).
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
