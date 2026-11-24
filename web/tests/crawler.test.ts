import { beforeEach, describe, expect, it, vi } from "vitest";

const dns = vi.hoisted(() => ({
  reverse: vi.fn<(ip: string) => Promise<string[]>>(),
  resolve4: vi.fn<(name: string) => Promise<string[]>>(),
  resolve6: vi.fn<(name: string) => Promise<string[]>>(),
}));
vi.mock("node:dns/promises", () => ({
  Resolver: class {
    reverse = dns.reverse;
    resolve4 = dns.resolve4;
    resolve6 = dns.resolve6;
  },
}));

import { clearCrawlerCache, isVerifiedCrawler } from "@/lib/crawler";

const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const req = (ua: string, ip = "66.249.66.1") => new Headers({ "user-agent": ua, "x-forwarded-for": ip });

describe("isVerifiedCrawler", () => {
  beforeEach(() => {
    clearCrawlerCache();
    dns.reverse.mockReset();
    dns.resolve4.mockReset();
    dns.resolve6.mockReset();
  });

  it("accepts Googlebot whose reverse name is Google's and resolves back, and checks each address once", async () => {
    dns.reverse.mockResolvedValue(["crawl-66-249-66-1.googlebot.com"]);
    dns.resolve4.mockResolvedValue(["66.249.66.1"]);
    expect(await isVerifiedCrawler(req(GOOGLEBOT))).toBe(true);
    expect(await isVerifiedCrawler(req(GOOGLEBOT))).toBe(true);
    expect(dns.reverse).toHaveBeenCalledTimes(1);
  });

  it("refuses a faked user agent, a foreign reverse name, a name that resolves elsewhere and DNS errors", async () => {
    expect(await isVerifiedCrawler(req("Mozilla/5.0 Chrome/140"))).toBe(false);
    expect(dns.reverse).not.toHaveBeenCalled();

    dns.reverse.mockResolvedValueOnce(["vm-1.googleusercontent.com"]);
    expect(await isVerifiedCrawler(req(GOOGLEBOT, "34.1.1.1"))).toBe(false);
    dns.reverse.mockResolvedValueOnce(["googlebot.com.evil.example"]);
    expect(await isVerifiedCrawler(req(GOOGLEBOT, "34.1.1.2"))).toBe(false);

    dns.reverse.mockResolvedValueOnce(["crawl-1.googlebot.com"]);
    dns.resolve4.mockResolvedValueOnce(["66.249.66.9"]);
    expect(await isVerifiedCrawler(req(GOOGLEBOT, "34.1.1.3"))).toBe(false);

    dns.reverse.mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "ETIMEOUT" }));
    expect(await isVerifiedCrawler(req(GOOGLEBOT, "34.1.1.4"))).toBe(false);
    expect(await isVerifiedCrawler(new Headers({ "user-agent": GOOGLEBOT }))).toBe(false);
  });

  it("verifies Bing over IPv6 too", async () => {
    dns.reverse.mockResolvedValue(["msnbot-1.search.msn.com."]);
    dns.resolve6.mockResolvedValue(["2001:db8::1"]);
    expect(await isVerifiedCrawler(req("Mozilla/5.0 (compatible; bingbot/2.0)", "2001:db8::1"))).toBe(true);
  });
});

describe("api() for a verified crawler", () => {
  it("adds the website's secret only for a verified crawler that is not signed in", async () => {
    const { api } = await import("@/lib/api");
    const { request } = await import("./next-state");
    const { mockApi } = await import("./helpers");
    const fetch = mockApi({ "/search/providers": { results: [] } });
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    clearCrawlerCache();
    dns.reverse.mockResolvedValue(["crawl-66-249-66-1.googlebot.com"]);
    dns.resolve4.mockResolvedValue(["66.249.66.1"]);
    const sent = (i: number) => (fetch.mock.calls[i]![1] as RequestInit).headers as Headers;

    request.headers = req(GOOGLEBOT);
    await api("/search/providers");
    expect(sent(0).get("x-web-secret")).toBe("s3cret");

    request.headers = req("Mozilla/5.0 Chrome/140");
    await api("/search/providers");
    expect(sent(1).get("x-web-secret")).toBeNull();
    vi.unstubAllEnvs();
  });
});
