import { Prisma } from "@prisma/client";
import { isOpenNow, todayHoursLabel } from "../lib/hours.js";
import { num } from "../lib/serialize.js";
import { categoryLabel, professionLabel, serviceAreaLabel } from "./professions.js";

/** Relations needed to render a provider card anywhere in the product. */
export const providerCardInclude = {
  businessHours: true,
  services: {
    include: {
      category: { select: { id: true, name: true, slug: true, professionName: true } },
      subcategory: { select: { id: true, name: true, slug: true, professionName: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
  },
  badges: { include: { badge: true } },
  serviceAreas: { select: { areaName: true }, take: 6 },
} satisfies Prisma.ProviderInclude;

export type ProviderWithCard = Prisma.ProviderGetPayload<{ include: typeof providerCardInclude }>;

export function toProviderCard(
  p: ProviderWithCard,
  extras: { distanceKm?: number | null; isFavorite?: boolean } = {},
) {
  const primary = p.services.find((s) => s.isPrimary) ?? p.services[0];
  const prices = p.services.map((s) => num(s.startingPrice)).filter((v): v is number => v !== null && v > 0);
  const subcategories = [...new Set(p.services.map((s) => s.subcategory?.name).filter(Boolean))] as string[];
  const description = p.description ?? "";
  return {
    id: p.id,
    slug: p.slug,
    businessName: p.businessName,
    shortDescription: description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description,
    logoUrl: p.logoUrl,
    coverUrl: p.coverUrl,
    businessType: p.businessType,
    /**
     * What a card shows: "Deep Saha – Plumber – Ghoraguli" for an individual professional (profession),
     * "ABC Services – Plumbing & Electricians – Siliguri" for a business (categoryLabel).
     */
    profession: professionLabel(p, primary),
    categoryLabel: professionLabel(p, primary) ?? categoryLabel(p.services),
    serviceAreaLabel: serviceAreaLabel(p),
    yearsExperience: p.yearsExperience,
    phone: p.phone,
    whatsappNumber: p.acceptsWhatsapp ? (p.whatsappNumber ?? p.phone) : null,
    acceptsCalls: p.acceptsCalls,
    acceptsWhatsapp: p.acceptsWhatsapp,
    isAvailable: p.isAvailable,
    locality: p.locality,
    city: p.city,
    state: p.state,
    latitude: num(p.latitude),
    longitude: num(p.longitude),
    distanceKm: extras.distanceKm === undefined || extras.distanceKm === null ? null : Math.round(extras.distanceKm * 10) / 10,
    avgRating: num(p.avgRating) ?? 0,
    totalReviews: p.totalReviews,
    verificationStatus: p.verificationStatus,
    isClaimed: p.userId !== null,
    isOpenNow: p.isAvailable && isOpenNow(p.businessHours),
    todayHours: todayHoursLabel(p.businessHours),
    // False when the listing has no opening hours at all, so apps can say "Hours not listed" instead of "Closed".
    hasHours: p.businessHours.length > 0,
    primaryCategory: primary ? { id: primary.category.id, name: primary.category.name, slug: primary.category.slug } : null,
    subcategories,
    startingPrice: prices.length ? Math.min(...prices) : null,
    priceUnit: primary?.priceUnit ?? null,
    serviceAreas: p.serviceAreas.map((a) => a.areaName),
    badges: p.badges.map((b) => ({ id: b.badge.id, name: b.badge.name })),
    isFavorite: extras.isFavorite ?? false,
  };
}

export type ProviderCard = ReturnType<typeof toProviderCard>;
