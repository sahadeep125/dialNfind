import { SITE_NAME, SITE_URL } from "./config";
import type { ProviderDetail, Review } from "./types";

/** schema.org JSON-LD for search engines. Kept free of React so it can be unit tested. */
type Thing = Record<string, unknown>;

export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

export function organizationJsonLd(contact: { email: string | null; phone: string | null }): Thing {
  const contactPoint = contact.email || contact.phone
    ? [{ "@type": "ContactPoint", contactType: "customer support", areaServed: "IN", availableLanguage: ["en"], ...(contact.email ? { email: contact.email } : {}), ...(contact.phone ? { telephone: contact.phone } : {}) }]
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/icon.svg"),
    ...(contactPoint ? { contactPoint } : {}),
  };
}

export function websiteJsonLd(): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

export function itemListJsonLd(items: { name: string; path: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(item.path), name: item.name })),
  };
}

export function faqJsonLd(faq: { q: string; a: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** The most specific schema.org business type for a category, or LocalBusiness. */
const BUSINESS_TYPES: Record<string, string> = {
  electricians: "Electrician",
  plumbing: "Plumber",
  painting: "HousePainter",
  "packers-movers": "MovingCompany",
  "vehicle-repair": "AutoRepair",
  "beauty-salon": "BeautySalon",
  carpentry: "HomeAndConstructionBusiness",
  cleaning: "HomeAndConstructionBusiness",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function openingHours(p: ProviderDetail): Thing[] | undefined {
  if (p.is24x7) return [{ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS, opens: "00:00", closes: "23:59" }];
  const specs = p.hours
    .filter((h) => h.openTime && h.closeTime)
    .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[h.dayOfWeek], opens: h.openTime, closes: h.closeTime }));
  return specs.length ? specs : undefined;
}

function priceRange(p: ProviderDetail): string | undefined {
  const prices = p.services.map((s) => s.startingPrice).filter((n): n is number => typeof n === "number" && n > 0);
  if (!prices.length) return undefined;
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? `₹${lo}` : `₹${lo}-₹${hi}`;
}

export function providerJsonLd(p: ProviderDetail, reviews: Review[]): Thing {
  const url = absoluteUrl(`/providers/${p.slug}`);
  const images = [p.coverUrl, p.logoUrl, ...p.portfolio.map((i) => i.imageUrl)].filter(Boolean) as string[];
  return {
    "@context": "https://schema.org",
    "@type": BUSINESS_TYPES[p.primaryCategory?.slug ?? ""] ?? "LocalBusiness",
    "@id": `${url}#business`,
    name: p.businessName,
    url,
    ...(p.description || p.shortDescription ? { description: p.description || p.shortDescription } : {}),
    telephone: p.phone,
    ...(p.email ? { email: p.email } : {}),
    ...(images.length ? { image: images.slice(0, 5) } : {}),
    ...(p.logoUrl ? { logo: p.logoUrl } : {}),
    address: {
      "@type": "PostalAddress",
      ...(p.addressLine ? { streetAddress: p.addressLine } : {}),
      ...(p.locality ? { addressLocality: `${p.locality}, ${p.city}` } : { addressLocality: p.city }),
      addressRegion: p.state,
      ...(p.pincode ? { postalCode: p.pincode } : {}),
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude },
    areaServed: p.serviceAreas.length
      ? p.serviceAreas.map((a) => ({ "@type": "Place", name: a.areaName }))
      : { "@type": "GeoCircle", geoMidpoint: { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude }, geoRadius: p.serviceRadiusKm * 1000 },
    ...(p.website ? { sameAs: [p.website] } : {}),
    ...(priceRange(p) ? { priceRange: priceRange(p) } : {}),
    ...(openingHours(p) ? { openingHoursSpecification: openingHours(p) } : {}),
    ...(p.totalReviews > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(p.avgRating.toFixed(1)), reviewCount: p.totalReviews, bestRating: 5, worstRating: 1 } }
      : {}),
    ...(reviews.length
      ? {
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author.name },
            datePublished: r.createdAt.slice(0, 10),
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            ...(r.reviewText ? { reviewBody: r.reviewText } : {}),
          })),
        }
      : {}),
  };
}
