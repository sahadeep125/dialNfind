import { describe, expect, it } from "vitest";
import { isOptimizableImage } from "@/lib/image-hosts";
import { notificationHref } from "@/lib/notification-href";
import { buildSearchHref } from "@/lib/search-href";
import { clip } from "@/lib/seo";
import { formatPrice, initials, plural } from "@/lib/format";
import { DEFAULT_LOCATION } from "@/lib/default-location";

describe("isOptimizableImage", () => {
  it("allows the configured upload origin only", () => {
    expect(isOptimizableImage("http://localhost:4000/uploads/a.jpg")).toBe(true);
    expect(isOptimizableImage("https://cdn.elsewhere.example/a.jpg")).toBe(false);
    expect(isOptimizableImage("not a url")).toBe(false);
  });
});

describe("notificationHref", () => {
  it("opens the support ticket", () => {
    expect(notificationHref("support", { ticketId: 12 })).toBe("/dashboard/support/12");
  });
  it("opens the provider's reviews for a reply", () => {
    expect(notificationHref("review_reply", { providerSlug: "sharma-tv", reviewId: 3 })).toBe("/providers/sharma-tv#reviews");
  });
  it("opens the review form from a reminder, and the profile once a held review is decided", () => {
    expect(notificationHref("review_prompt", { providerSlug: "sharma-tv", leadId: 4 })).toBe("/providers/sharma-tv?review=1#reviews");
    expect(notificationHref("review", { providerSlug: "sharma-tv", reviewId: 3 })).toBe("/providers/sharma-tv#reviews");
    expect(notificationHref("review", { reviewId: 3 })).toBeNull();
  });
  it("falls back to my reviews, or nothing", () => {
    expect(notificationHref("review_reply", null)).toBe("/dashboard/reviews");
    expect(notificationHref("system", {})).toBeNull();
  });
});

describe("buildSearchHref", () => {
  it("carries the query and location", () => {
    const href = buildSearchHref("tv repair", DEFAULT_LOCATION, { sub: "tv-repair" });
    const url = new URL(href, "http://x");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("tv repair");
    expect(url.searchParams.get("sub")).toBe("tv-repair");
    expect(url.searchParams.get("lat")).toBe(String(DEFAULT_LOCATION.latitude));
  });
});

describe("clip", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(clip("  Hello   world ")).toBe("Hello world");
  });
  it("cuts at a word boundary with an ellipsis", () => {
    const out = clip("alpha beta gamma, delta epsilon", 20);
    expect(out).toBe("alpha beta gamma…");
    expect(out.length).toBeLessThanOrEqual(20);
  });
});

describe("format", () => {
  it("formats prices, initials and plurals", () => {
    expect(formatPrice(null)).toBeNull();
    expect(initials("Asha Rai")).toBe("AR");
    expect(plural(1, "review")).toBe("1 review");
    expect(plural(3, "review")).toBe("3 reviews");
  });
});
