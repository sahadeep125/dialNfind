import { afterEach, describe, expect, it, vi } from "vitest";

const saved = { ...process.env };

async function loadEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  // dotenv would fill the gaps from server/.env; the test wants exactly what it set.
  vi.doMock("dotenv/config", () => ({}));
  return import("../../src/env.js");
}

afterEach(() => {
  process.env = { ...saved };
  vi.doUnmock("dotenv/config");
  vi.resetModules();
});

const PROD_OK = {
  NODE_ENV: "production",
  JWT_SECRET: "x".repeat(40),
  PUBLIC_URL: "https://api.dialnfind.com/",
  WEB_URL: "https://dialnfind.com",
  PROVIDER_URL: "https://business.dialnfind.com",
  ADMIN_URL: "https://admin.dialnfind.com",
  CORS_ORIGINS: "https://dialnfind.com",
  SMTP_HOST: "smtp.x",
  RATE_LIMIT_MULTIPLIER: "1",
};

describe("env", () => {
  it("applies defaults", async () => {
    const keys = ["NODE_ENV", "PORT", "SESSION_DAYS", "STAFF_SESSION_HOURS", "RATE_LIMIT_MULTIPLIER", "TRUST_PROXY_HOPS", "CORS_ORIGINS", "APP_TIMEZONE", "WEB_URL", "PROVIDER_URL", "ADMIN_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SUPPORT_EMAIL", "PUBLIC_URL", "GEOCODER_URL", "GEOCODER_USER_AGENT", "GEOCODER_COUNTRY", "GEOCODER_ENABLED", "GOOGLE_CLIENT_IDS", "APPLE_CLIENT_IDS", "APPLE_SERVICES_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY", "APPLE_APP_REDIRECT_SCHEMES", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "REVENUECAT_SECRET_KEY", "REVENUECAT_WEBHOOK_AUTH", "REVENUECAT_PROJECT_ID", "POSTHOG_KEY", "POSTHOG_HOST", "APP_ENV", "UPLOAD_DIR", "UPLOAD_PRIVATE_DIR", "RUN_JOBS"];
    const { env, isProduction } = await loadEnv(Object.fromEntries(keys.map((k) => [k, undefined])));
    expect(isProduction).toBe(false);
    expect(env).toMatchObject({
      nodeEnv: "development", port: 4000, sessionDays: 30, staffSessionHours: 12, rateLimitMultiplier: 1, trustProxyHops: 1,
      corsOrigins: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"], timezone: "Asia/Kolkata", runJobs: false,
      publicUrl: "http://localhost:4000",
      smtp: { host: "", port: 587, from: "DialNFind <no-reply@dialnfind.com>", replyTo: "support@dialnfind.com" },
      geocoder: { enabled: true, country: "in" },
      oauth: { googleClientIds: [], appRedirectSchemes: ["dialnfind", "dialnfind-business"], applePrivateKey: "" },
      posthog: { key: "", host: "https://us.i.posthog.com", environment: "development" },
    });
    expect(env.uploadDir).toMatch(/uploads\/public$/);
    expect(env.uploadPrivateDir).toMatch(/uploads\/private$/);
  });
  it("reads values and unescapes the Apple key", async () => {
    const { env } = await loadEnv({ PORT: "5000", PUBLIC_URL: undefined, APPLE_PRIVATE_KEY: "a\\nb", APP_ENV: "staging", GEOCODER_ENABLED: "false", RUN_JOBS: "true" });
    expect(env.publicUrl).toBe("http://localhost:5000");
    expect(env.oauth.applePrivateKey).toBe("a\nb");
    expect(env.posthog.environment).toBe("staging");
    expect(env.geocoder.enabled).toBe(false);
    expect(env.runJobs).toBe(true);
  });
  it("requires the database URL and token secret", async () => {
    await expect(loadEnv({ DATABASE_URL: undefined })).rejects.toThrow("Missing required environment variable DATABASE_URL");
    process.env = { ...saved };
    await expect(loadEnv({ JWT_SECRET: "" })).rejects.toThrow("JWT_SECRET");
  });
  it("starts in production only with production settings", async () => {
    const { isProduction } = await loadEnv(PROD_OK);
    expect(isProduction).toBe(true);
    process.env = { ...saved };
    const err = await loadEnv({ ...PROD_OK, JWT_SECRET: "change-me-in-production", PUBLIC_URL: "http://localhost:4000", WEB_URL: "http://dialnfind.com", CORS_ORIGINS: undefined, SMTP_HOST: "", RATE_LIMIT_MULTIPLIER: "0" }).catch((e: Error) => e);
    expect(String(err)).toContain("JWT_SECRET must be a random value");
    expect(String(err)).toContain("PUBLIC_URL must be the public https address");
    expect(String(err)).toContain("WEB_URL must be the public https address, not http://dialnfind.com");
    expect(String(err)).toContain("CORS_ORIGINS must list");
    expect(String(err)).toContain("SMTP_HOST is empty");
    expect(String(err)).toContain("RATE_LIMIT_MULTIPLIER must be above 0");
    process.env = { ...saved };
    await expect(loadEnv({ ...PROD_OK, JWT_SECRET: "short" })).rejects.toThrow("JWT_SECRET");
    process.env = { ...saved };
    await expect(loadEnv({ ...PROD_OK, JWT_SECRET: "replace_with_super_secret_jwt_key_minimum_32_characters_long" })).rejects.toThrow("JWT_SECRET");
  });
  it("refuses example mail settings in production and sends from the SMTP login by default", async () => {
    const err = await loadEnv({ ...PROD_OK, SMTP_USER: "your-email@gmail.com", SMTP_PASS: "your-app-password", SMTP_FROM: undefined, SUPPORT_EMAIL: undefined }).catch((e: Error) => e);
    expect(String(err)).toContain("SMTP_USER is still the example value");
    expect(String(err)).toContain("SMTP_PASS is still the example value");
    process.env = { ...saved };
    const { env } = await loadEnv({ ...PROD_OK, SMTP_USER: "team@shop.in", SMTP_FROM: "", SUPPORT_EMAIL: "" });
    expect(env.smtp.from).toBe("DialNFind <team@shop.in>");
    expect(env.smtp.replyTo).toBe("team@shop.in");
  });
});
