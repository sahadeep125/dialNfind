import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";
import { clientIp, forwardClientIp } from "@/lib/client-ip";
import { crossSiteRejection } from "@/lib/same-origin";

describe("safeRedirect", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirect("/providers/abc?x=1")).toBe("/providers/abc?x=1");
  });
  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "", null, undefined])("falls back for %s", (next) => {
    expect(safeRedirect(next)).toBe("/dashboard");
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
  });
  it("uses the rightmost x-forwarded-for entry, which our proxy added", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.1, 3.3.3.3" }))).toBe("3.3.3.3");
  });
  it("forwards the address as a single hop", () => {
    const to = new Headers();
    forwardClientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 4.4.4.4" }), to);
    expect(to.get("x-forwarded-for")).toBe("4.4.4.4");
  });
});

describe("crossSiteRejection", () => {
  const post = (headers: Record<string, string>) => new Request("http://localhost:3000/api/proxy/contact", { method: "POST", headers });
  it("allows GET from anywhere", () => {
    expect(crossSiteRejection(new Request("http://localhost:3000/x", { headers: { origin: "https://evil.example" } }))).toBeNull();
  });
  it("allows same-origin POST", () => {
    expect(crossSiteRejection(post({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBeNull();
  });
  it("rejects a POST from another origin", () => {
    expect(crossSiteRejection(post({ origin: "https://evil.example", host: "localhost:3000" }))?.status).toBe(403);
  });
  it("rejects when the browser says cross-site", () => {
    expect(crossSiteRejection(post({ "sec-fetch-site": "cross-site" }))?.status).toBe(403);
  });
  it("allows non-browser clients without Origin", () => {
    expect(crossSiteRejection(post({}))).toBeNull();
  });
});
