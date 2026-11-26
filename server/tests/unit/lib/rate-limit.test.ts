import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { env } from "../../../src/env.js";
import { WEB_SERVER_HEADER, isWebServer } from "../../../src/lib/rate-limit.js";

const req = (headers: Record<string, string>) => ({ get: (name: string) => headers[name.toLowerCase()] }) as unknown as Request;

describe("isWebServer", () => {
  it("accepts only the website's REVALIDATE_SECRET", () => {
    const saved = env.revalidateSecret;
    try {
      env.revalidateSecret = "web-shared-secret";
      expect(isWebServer(req({ [WEB_SERVER_HEADER]: "web-shared-secret" }))).toBe(true);
      expect(isWebServer(req({ [WEB_SERVER_HEADER]: "web-shared-secreT" }))).toBe(false);
      expect(isWebServer(req({ [WEB_SERVER_HEADER]: "short" }))).toBe(false);
      expect(isWebServer(req({}))).toBe(false);
      // Without a secret configured nobody is exempt, even a request sending an empty header.
      env.revalidateSecret = "";
      expect(isWebServer(req({ [WEB_SERVER_HEADER]: "" }))).toBe(false);
      expect(isWebServer(req({ [WEB_SERVER_HEADER]: "anything" }))).toBe(false);
    } finally {
      env.revalidateSecret = saved;
    }
  });
});
