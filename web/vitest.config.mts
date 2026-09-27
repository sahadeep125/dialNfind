import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // "server-only" throws outside a React Server Component bundle; tests import those modules directly.
      "server-only": fileURLToPath(new URL("./tests/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` comment.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.tsx"],
    env: { TZ: "UTC", API_URL: "http://api.test/api/v1" },
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "proxy.ts"],
      // shadcn/ui primitives are generated wrappers around Radix; the rest are framework entry points and config.
      exclude: ["components/ui/**", "**/*.d.ts"],
      reporter: ["text-summary", "text", "html", "json-summary"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
