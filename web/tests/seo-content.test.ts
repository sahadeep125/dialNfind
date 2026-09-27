import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { CATEGORY_SEO } from "@/content/seo/categories";
import { SUBCATEGORY_SEO } from "@/content/seo/subcategories";
import { GUIDES, guidesForSubcategory, readingMinutes } from "@/lib/guides";
import { FAQ, FAQ_SECTIONS } from "@/lib/faq";
import { serviceHref } from "@/lib/service-href";
import { articleJsonLd } from "@/lib/structured-data";
import { proxy } from "@/proxy";

/** Categories and subcategories created by server/prisma/seed-data.ts (slugs as the server's slugify makes them). */
const SEEDED: Record<string, string[]> = {
  "electronics-repair": ["tv-repair", "mobile-phone-repair", "laptop-and-computer-repair", "home-theatre-and-audio-repair", "cctv-installation"],
  "home-appliances": ["ac-repair-and-service", "refrigerator-repair", "washing-machine-repair", "microwave-repair", "water-purifier-service", "geyser-repair"],
  electricians: ["wiring-and-rewiring", "fan-and-light-installation", "inverter-and-battery", "switchboard-repair", "electrical-safety-inspection"],
  plumbing: ["leak-repair", "bathroom-fitting", "water-tank-cleaning", "drain-unblocking", "motor-and-pump-repair"],
  carpentry: ["furniture-repair", "modular-kitchen", "door-and-window-work", "custom-furniture"],
  cleaning: ["home-deep-cleaning", "sofa-and-carpet-cleaning", "bathroom-cleaning", "kitchen-cleaning", "office-cleaning"],
  "pest-control": ["cockroach-control", "termite-treatment", "bed-bug-treatment", "mosquito-control", "rodent-control"],
  painting: ["interior-painting", "exterior-painting", "waterproofing", "texture-and-wallpaper"],
  "packers-movers": ["local-shifting", "intercity-relocation", "vehicle-transport", "office-relocation"],
  tutors: ["maths-tutor", "science-tutor", "english-tutor", "music-teacher", "competitive-exam-coaching"],
  "beauty-salon": ["salon-at-home-women", "men-s-grooming", "bridal-makeup", "spa-and-massage"],
  "vehicle-repair": ["car-service", "bike-service", "car-wash-and-detailing", "tyre-and-puncture", "car-ac-repair"],
};

// The root layout adds " | DialNFind" (13 characters); 50 keeps the full title near Google's ~60-character cut-off.
const MAX_TITLE = 50;
const MAX_DESCRIPTION = 160;

describe("service page copy", () => {
  it("covers every seeded category and subcategory, and nothing else", () => {
    expect(Object.keys(CATEGORY_SEO).sort()).toEqual(Object.keys(SEEDED).sort());
    expect(Object.keys(SUBCATEGORY_SEO).sort()).toEqual(Object.values(SEEDED).flat().sort());
  });

  it.each(Object.entries({ ...CATEGORY_SEO, ...SUBCATEGORY_SEO }))("%s has usable metadata and content", (_slug, copy) => {
    expect(copy.title.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(copy.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(copy.description.length).toBeGreaterThan(70);
    expect(copy.intro.length).toBeGreaterThan(0);
    expect(copy.faqs.length).toBeGreaterThanOrEqual(3);
  });

  it("gives every page a distinct title and description", () => {
    const all = Object.values({ ...CATEGORY_SEO, ...SUBCATEGORY_SEO });
    expect(new Set(all.map((c) => c.title)).size).toBe(all.length);
    expect(new Set(all.map((c) => c.description)).size).toBe(all.length);
  });
});

describe("guides", () => {
  it("has unique slugs, two per seeded category", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const category of Object.keys(SEEDED)) expect(GUIDES.filter((g) => g.category === category)).toHaveLength(2);
  });

  it.each(GUIDES.map((g) => [g.slug, g] as const))("%s is complete and points at real pages", (_slug, g) => {
    expect(g.metaTitle.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(g.title.length).toBeLessThanOrEqual(70);
    expect(g.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(g.dateModified >= g.datePublished).toBe(true);
    expect(g.sections.length).toBeGreaterThanOrEqual(4);
    expect(g.faqs.length).toBeGreaterThanOrEqual(4);
    expect(g.subcategories.length).toBeGreaterThan(0);
    for (const sub of g.subcategories) expect(SEEDED[g.category]).toContain(sub);
    expect(readingMinutes(g)).toBeGreaterThanOrEqual(3);
  });

  it("lists guides for a subcategory first", () => {
    expect(guidesForSubcategory("home-appliances", "water-purifier-service")[0].slug).toBe("ro-water-purifier-service-guide");
  });

  it("builds Article structured data", () => {
    const g = GUIDES[0];
    const data = articleJsonLd({ ...g, path: `/guides/${g.slug}` });
    expect(data).toMatchObject({
      "@type": "Article",
      headline: g.title,
      url: `https://dialnfind.com/guides/${g.slug}`,
      datePublished: g.datePublished,
      publisher: { "@id": "https://dialnfind.com/#organization" },
    });
  });
});

describe("help centre FAQ", () => {
  it("groups questions without repeats", () => {
    expect(FAQ_SECTIONS.length).toBeGreaterThanOrEqual(5);
    expect(FAQ.length).toBeGreaterThanOrEqual(25);
    expect(new Set(FAQ.map((f) => f.q)).size).toBe(FAQ.length);
  });
});

describe("subcategory addresses", () => {
  it("puts the subcategory in the path", () => {
    expect(serviceHref("electronics-repair")).toBe("/services/electronics-repair");
    expect(serviceHref("electronics-repair", "tv-repair")).toBe("/services/electronics-repair/tv-repair");
    expect(serviceHref("electronics-repair", null)).toBe("/services/electronics-repair");
  });

  it("permanently redirects old ?sub= links and keeps the other query values", () => {
    const res = proxy(new NextRequest("https://dialnfind.com/services/electronics-repair?sub=tv-repair&lat=26.7&sort=rating"));
    expect(res.status).toBe(308);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/services/electronics-repair/tv-repair");
    expect(location.searchParams.get("sub")).toBeNull();
    expect(location.searchParams.get("lat")).toBe("26.7");
    expect(location.searchParams.get("sort")).toBe("rating");
  });

  it("leaves other addresses alone", () => {
    for (const url of ["https://dialnfind.com/services/electronics-repair", "https://dialnfind.com/services/electronics-repair/tv-repair?sub=x"]) {
      expect(proxy(new NextRequest(url)).headers.get("location")).toBeNull();
    }
  });
});
