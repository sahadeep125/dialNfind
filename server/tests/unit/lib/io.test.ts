import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import jwt from "jsonwebtoken";
import { slugify, uniqueProviderSlug } from "../../../src/lib/slug.js";
import { signToken, verifyToken } from "../../../src/lib/jwt.js";
import { processImage } from "../../../src/lib/images.js";
import {
  checkFileSignature, PRIVATE_FILES_URL, privateFileUrl, signedLink, signFileUrl, signPrivateUrls,
} from "../../../src/lib/private-files.js";
import { limits } from "../../../src/lib/rate-limit.js";
import { env } from "../../../src/env.js";
import { createProvider } from "../../helpers/factories.js";

describe("slug", () => {
  it("slugifies names", () => {
    expect(slugify("Sharma & Sons TV Répair!")).toBe("sharma-and-sons-tv-repair");
    expect(slugify("---")).toBe("");
  });
  it("finds a free provider slug", async () => {
    expect(await uniqueProviderSlug("Sharma TV", "Mumbai")).toBe("sharma-tv-mumbai");
    const p = await createProvider({ slug: "sharma-tv-mumbai" });
    await createProvider({ slug: "sharma-tv-mumbai-2" });
    expect(await uniqueProviderSlug("Sharma TV", "Mumbai")).toBe("sharma-tv-mumbai-3");
    expect(await uniqueProviderSlug("Sharma TV", "Mumbai", p.id)).toBe("sharma-tv-mumbai");
    expect(await uniqueProviderSlug("!!!", "")).toBe("provider");
  });
});

describe("jwt", () => {
  it("signs and verifies session tokens", () => {
    const t = signToken(5n, "customer", "sid-1", new Date(Date.now() + 60_000));
    expect(verifyToken(t)).toMatchObject({ sub: "5", role: "customer", sid: "sid-1" });
    // Already expired sessions still get at least one second.
    expect(verifyToken(signToken(5n, "customer", "sid", new Date(0)))).not.toBeNull();
  });
  it("rejects bad tokens", () => {
    expect(verifyToken("garbage")).toBeNull();
    expect(verifyToken(jwt.sign("plain-string", env.jwtSecret))).toBeNull();
    expect(verifyToken(jwt.sign({ sub: "1" }, env.jwtSecret))).toBeNull();
  });
});

describe("images", () => {
  const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#336699" } }).png().toBuffer();
  const rule = { maxWidth: 400, maxHeight: 400, minSide: 100, quality: 80 };

  it("re-encodes and shrinks to webp", async () => {
    const out = await processImage(await png(800, 600), rule);
    expect(out).toMatchObject({ width: 400, height: 300 });
    expect((await sharp(out.data).metadata()).format).toBe("webp");
  });
  it("rejects unreadable, tiny and huge images", async () => {
    await expect(processImage(Buffer.from("nope"), rule)).rejects.toThrow("could not be read");
    await expect(processImage(await png(50, 200), rule)).rejects.toThrow("too small (50 × 200 px)");
    const meta = vi.spyOn(sharp.prototype, "metadata").mockResolvedValueOnce({ width: 10_000, height: 10_000, autoOrient: { width: 1, height: 1 } } as never);
    await expect(processImage(await png(200, 200), rule)).rejects.toThrow("too large");
    meta.mockRestore();
  });
  it("reports files that fail while encoding", async () => {
    const good = await png(200, 200);
    vi.spyOn(sharp.prototype, "toBuffer").mockRejectedValueOnce(new Error("corrupt"));
    await expect(processImage(good, rule)).rejects.toThrow("could not be read");
  });
});

describe("private files", () => {
  it("signs, checks and rewrites private links", () => {
    const url = `${PRIVATE_FILES_URL}docs/a.pdf`;
    const signed = signFileUrl(`${url}?old=1`);
    const u = new URL(signed);
    expect(u.pathname).toBe("/api/v1/files/docs/a.pdf");
    expect(checkFileSignature("docs/a.pdf", u.searchParams.get("exp")!, u.searchParams.get("sig")!)).toBe(true);
    expect(checkFileSignature("docs/b.pdf", u.searchParams.get("exp")!, u.searchParams.get("sig")!)).toBe(false);
    expect(checkFileSignature("docs/a.pdf", u.searchParams.get("exp")!, "short")).toBe(false);
    expect(checkFileSignature("docs/a.pdf", "1", u.searchParams.get("sig")!)).toBe(false);
    expect(checkFileSignature("docs/a.pdf", "x", "y")).toBe(false);
    expect(checkFileSignature("docs/a.pdf", u.searchParams.get("exp")!, undefined)).toBe(false);

    const link = new URL(signedLink("/api/v1/invoice-files", "3.pdf"));
    expect(checkFileSignature("3.pdf", link.searchParams.get("exp")!, link.searchParams.get("sig")!)).toBe(true);

    const body = signPrivateUrls({ a: url, b: ["x", url], c: 1, d: null }) as { a: string; b: string[]; c: number; d: null };
    expect(body.a).toContain("sig=");
    expect(body.b[0]).toBe("x");
    expect(body.b[1]).toContain("sig=");
    expect(body.c).toBe(1);
    expect(body.d).toBeNull();
  });
  it("only accepts documents uploaded here", () => {
    expect(privateFileUrl.parse(`${PRIVATE_FILES_URL}x.pdf?exp=1&sig=2`)).toBe(`${PRIVATE_FILES_URL}x.pdf`);
    expect(privateFileUrl.safeParse("https://evil.test/x.pdf").success).toBe(false);
  });
});

describe("rate limits", () => {
  it("counts per address and email and answers 429", async () => {
    const original = env.rateLimitMultiplier;
    env.rateLimitMultiplier = 0.1; // auth: 1 attempt
    try {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn(), getHeader: vi.fn(), headersSent: false, append: vi.fn() };
      const req = (email?: unknown) => ({ ip: "10.0.0.1", body: { email }, app: { get: () => false }, headers: {}, get: () => undefined });
      const next = vi.fn();
      await limits.auth(req(" A@B.co ") as never, res as never, next);
      expect(next).toHaveBeenCalledTimes(1);
      await limits.auth(req("a@b.co") as never, res as never, next);
      expect(res.status).toHaveBeenCalledWith(429);
      // A different email is counted separately; a missing one and a missing ip still get a key.
      await limits.auth(req(42) as never, res as never, next);
      await limits.auth({ ...req(), ip: undefined } as never, res as never, next);
      expect(next).toHaveBeenCalledTimes(3);
    } finally {
      env.rateLimitMultiplier = original;
    }
  });
});
