import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

const tmp = path.join(os.tmpdir(), "dialnfind-server-test");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // Every test file shares one database, so they run one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    // Set before any import, so env.ts sees these instead of server/.env (dotenv never overrides a set variable).
    env: {
      NODE_ENV: "test",
      TZ: "UTC",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://dialnfind:dialnfind@localhost:5432/dialnfind_test?schema=public",
      JWT_SECRET: "test-secret-that-is-long-enough-for-anything-0123456789",
      PORT: "4000",
      SESSION_DAYS: "30",
      STAFF_SESSION_HOURS: "12",
      RATE_LIMIT_MULTIPLIER: "0",
      TRUST_PROXY_HOPS: "1",
      CORS_ORIGINS: "http://localhost:3000,http://localhost:5173",
      APP_TIMEZONE: "Asia/Kolkata",
      RUN_JOBS: "false",
      WEB_URL: "http://localhost:3000",
      PROVIDER_URL: "http://localhost:5173",
      ADMIN_URL: "http://localhost:5174",
      PUBLIC_URL: "http://localhost:4000",
      SMTP_HOST: "",
      SMTP_PORT: "587",
      SMTP_USER: "",
      SMTP_PASS: "",
      SMTP_FROM: "DialNFind <no-reply@dialnfind.com>",
      SUPPORT_EMAIL: "support@dialnfind.com",
      GEOCODER_URL: "https://geo.test",
      GEOCODER_USER_AGENT: "DialNFind-test",
      GEOCODER_COUNTRY: "in",
      GEOCODER_ENABLED: "true",
      GOOGLE_CLIENT_IDS: "google-web,google-ios",
      APPLE_CLIENT_IDS: "com.dialnfind.app,com.dialnfind.web",
      APPLE_SERVICES_ID: "com.dialnfind.web",
      APPLE_TEAM_ID: "",
      APPLE_KEY_ID: "",
      APPLE_PRIVATE_KEY: "",
      APPLE_APP_REDIRECT_SCHEMES: "dialnfind,dialnfind-business",
      RAZORPAY_KEY_ID: "rzp_test_key",
      RAZORPAY_KEY_SECRET: "rzp_test_secret",
      RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
      REVENUECAT_SECRET_KEY: "rc_secret",
      REVENUECAT_WEBHOOK_AUTH: "Bearer rc-webhook",
      REVENUECAT_PROJECT_ID: "rc_project",
      POSTHOG_KEY: "",
      POSTHOG_HOST: "https://ph.test",
      UPLOAD_DIR: path.join(tmp, "public"),
      UPLOAD_PRIVATE_DIR: path.join(tmp, "private"),
      PRISMA_LOG: "",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts only wires the process (listen, signals); scripts are one-off CLIs.
      exclude: ["src/index.ts", "src/scripts/**"],
      reporter: ["text-summary", "text", "html", "json-summary"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
