import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd, providerJsonLd } from "@/lib/structured-data";
import type { ProviderDetail, Review } from "@/lib/types";

// JSON-LD is loosely shaped by design; tests read it as nested records.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ld = Record<string, any>;

const provider = {
  id: 1,
  slug: "sharma-tv",
  businessName: "Sharma TV",
  shortDescription: "TV repair",
  description: "We fix TVs.",
  logoUrl: "https://img.example/logo.png",
  coverUrl: null,
  phone: "+919800000000",
  email: null,
  website: null,
  locality: "Sevoke Road",
  city: "Siliguri",
  state: "West Bengal",
  addressLine: "12 Main Road",
  pincode: "734001",
  latitude: 26.73,
  longitude: 88.43,
  avgRating: 4.46,
  totalReviews: 38,
  serviceRadiusKm: 10,
  serviceAreas: [],
  portfolio: [],
  is24x7: false,
  hours: [
    { dayOfWeek: 1, day: "Monday", label: "9 AM - 7 PM", openTime: "09:00", closeTime: "19:00", isToday: false },
    { dayOfWeek: 0, day: "Sunday", label: "Closed", openTime: null, closeTime: null, isToday: false },
  ],
  services: [
    { startingPrice: 249, priceUnit: "per_visit", category: { id: 1, name: "Electricians", slug: "electricians" }, subcategory: { id: 2, name: "Wiring", slug: "wiring" } },
    { startingPrice: 399, priceUnit: "per_visit", category: { id: 1, name: "Electricians", slug: "electricians" }, subcategory: null },
  ],
  primaryCategory: { id: 1, name: "Electricians", slug: "electricians" },
} as unknown as ProviderDetail;

const reviews = [
  { id: 1, rating: 5, reviewText: "Great </script> work", createdAt: "2026-09-01T10:00:00Z", author: { name: "Asha", photoUrl: null } },
] as unknown as Review[];

describe("providerJsonLd", () => {
  const ld = providerJsonLd(provider, reviews) as Ld;
  it("uses the specific business type for the category", () => {
    expect(ld["@type"]).toBe("Electrician");
  });
  it("includes address, geo, rating, price range and hours", () => {
    expect(ld.address).toMatchObject({ addressLocality: "Sevoke Road, Siliguri", postalCode: "734001", addressCountry: "IN" });
    expect(ld.geo).toMatchObject({ latitude: 26.73, longitude: 88.43 });
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 38 });
    expect(ld.priceRange).toBe("₹249-₹399");
    expect(ld.openingHoursSpecification).toEqual([{ "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "09:00", closes: "19:00" }]);
    expect(ld.review).toHaveLength(1);
  });
  it("lists the services with prices and the searches the page targets", () => {
    expect(ld.hasOfferCatalog.itemListElement[0]).toMatchObject({
      itemOffered: { "@type": "Service", name: "Wiring", serviceType: "Electricians", areaServed: { "@type": "City", name: "Siliguri" } },
      priceSpecification: { price: 249, priceCurrency: "INR" },
    });
    expect(ld.hasOfferCatalog.itemListElement[1].itemOffered.name).toBe("Electricians");
    expect(ld).not.toHaveProperty("keywords");
    const withSeo = providerJsonLd({ ...provider, description: null, shortDescription: "", seo: { title: "T", description: "Electrician in Siliguri.", keywords: ["electrician in Siliguri", "electrician near me"], focusKeyword: "electrician in Siliguri", service: "Electrician", noIndex: false } }, []) as Ld;
    expect(withSeo).toMatchObject({ keywords: "electrician in Siliguri, electrician near me", knowsAbout: "Electrician", description: "Electrician in Siliguri." });
  });
  it("leaves out the rating when there are no reviews", () => {
    const empty = providerJsonLd({ ...provider, totalReviews: 0 }, []) as Record<string, unknown>;
    expect(empty.aggregateRating).toBeUndefined();
    expect(empty.review).toBeUndefined();
  });
});

describe("other builders", () => {
  it("numbers breadcrumbs with absolute URLs", () => {
    const ld = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Plumbing", path: "/services/plumbing" }]) as Ld;
    expect(ld.itemListElement[1]).toMatchObject({ position: 2, item: "https://kaajva.in/services/plumbing" });
  });
  it("adds a contact point only when there are details", () => {
    const fallback = organizationJsonLd({ email: null, phone: null }) as Ld;
    expect(fallback.contactPoint[0]).toMatchObject({ email: "support@kaajva.in", telephone: "+918906609532" });
    expect(fallback.address).toMatchObject({ addressLocality: "Siliguri", addressRegion: "West Bengal", postalCode: "734006", addressCountry: "IN" });
    expect((organizationJsonLd({ email: "help@x.in", phone: null }) as Ld).contactPoint[0].email).toBe("help@x.in");
  });
  it("uses the enquiries email and office address from the admin settings", () => {
    const same = organizationJsonLd({ email: null, phone: null, address: "Ghogomali, Siliguri, West Bengal, India 734006" }) as Ld;
    expect(same.address).toMatchObject({ streetAddress: "Ghogomali", addressLocality: "Siliguri" });
    const moved = organizationJsonLd({ email: null, phone: null, infoEmail: "hello@x.in", address: "2 Hill Cart Road\nSiliguri 734001" }) as Ld;
    expect(moved.email).toBe("hello@x.in");
    expect(moved.contactPoint[1].email).toBe("hello@x.in");
    expect(moved.address).toEqual({ "@type": "PostalAddress", streetAddress: "2 Hill Cart Road, Siliguri 734001", postalCode: "734001", addressCountry: "IN" });
  });
  it("lists the official social profiles as sameAs", () => {
    const org = organizationJsonLd({ email: null, phone: null }) as Ld;
    expect(org.sameAs).toEqual(
      expect.arrayContaining(["https://www.facebook.com/kaajva", "https://www.youtube.com/@kaajva", "https://www.instagram.com/kaajvaofficial/", "https://x.com/kaajvaofficial"]),
    );
  });
  it("builds FAQ questions", () => {
    expect((faqJsonLd([{ q: "Q?", a: "A." }]) as Ld).mainEntity[0].acceptedAnswer.text).toBe("A.");
  });
});

describe("JsonLd", () => {
  it("escapes < so review text cannot close the script tag", () => {
    const html = renderToStaticMarkup(<JsonLd data={providerJsonLd(provider, reviews)} />);
    expect(html).not.toContain("</script> work");
    expect(html).toContain("\\u003c/script> work");
  });
});
