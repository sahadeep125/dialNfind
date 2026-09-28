import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify("test") },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.tsx"],
    env: { TZ: "UTC", VITE_API_URL: "http://api.test/api/v1", VITE_WEB_URL: "http://web.test" },
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // shadcn/ui primitives are generated Radix wrappers; main.tsx only mounts the app.
      exclude: ["src/components/ui/**", "src/main.tsx", "src/**/*.d.ts"],
      reporter: ["text-summary", "text", "html", "json-summary", "json"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
