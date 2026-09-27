import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(process.env.VITE_APP_VERSION ?? pkg.version) },
  server: {
    port: 5173,
    // Same as deploy/spa-nginx.conf: analytics go through this origin when VITE_POSTHOG_HOST=/ingest.
    proxy: {
      "/ingest/static": { target: "https://us-assets.i.posthog.com", changeOrigin: true, rewrite: (p) => p.replace(/^\/ingest/, "") },
      "/ingest/array": { target: "https://us-assets.i.posthog.com", changeOrigin: true, rewrite: (p) => p.replace(/^\/ingest/, "") },
      "/ingest": { target: "https://us.i.posthog.com", changeOrigin: true, rewrite: (p) => p.replace(/^\/ingest/, "") },
    },
  },
});
