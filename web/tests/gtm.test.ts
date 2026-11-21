// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

type W = Window & { dataLayer?: Record<string, unknown>[] };

async function freshGtm(id = "GTM-TEST") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", id);
  (window as W).dataLayer = undefined;
  document.head.innerHTML = "";
  return import("@/lib/gtm");
}

afterEach(() => vi.unstubAllEnvs());

describe("gtm", () => {
  it("does nothing without a container id", async () => {
    const g = await freshGtm("");
    g.loadGtm();
    g.pushGtmEvent("contact_clicked", { provider_id: 1, channel: "call" });
    expect((window as W).dataLayer).toBeUndefined();
    expect(document.querySelector("script")).toBeNull();
  });

  it("loads the container once", async () => {
    const g = await freshGtm();
    g.loadGtm();
    expect(document.querySelector("script")?.getAttribute("src")).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-TEST");
    expect((window as W).dataLayer?.[0]).toMatchObject({ event: "gtm.js" });
  });

  it("maps contact taps and number reveals to contact_provider", async () => {
    const g = await freshGtm();
    expect(g.toGtmEvent("contact_clicked", { provider_id: 7, channel: "whatsapp", source: "profile", category: "plumber" })).toEqual({
      event: "contact_provider",
      params: { channel: "whatsapp", provider_id: 7, category: "plumber", contact_source: "profile" },
    });
    expect(g.toGtmEvent("phone_number_revealed", { provider_id: 7, source: "search" })?.params.channel).toBe("reveal");
    expect(g.toGtmEvent("signed_up", { role: "customer", method: "google" })?.event).toBe("sign_up");
    expect(g.toGtmEvent("favorite_toggled", {})).toBeNull();
  });

  it("clears the previous event's parameters and drops nulls", async () => {
    const g = await freshGtm();
    g.pushGtmEvent("search_submitted", { query: "ac repair", city: "Siliguri" });
    g.pushGtmEvent("category_viewed", { category: "electrician", subcategory: null });
    const last = (window as W).dataLayer?.at(-1);
    expect(last).toMatchObject({ event: "view_category", category: "electrician", search_term: undefined, city: undefined });
    expect(last?.subcategory).toBeUndefined();
    expect(last && "phone" in last).toBe(false);
  });
});
