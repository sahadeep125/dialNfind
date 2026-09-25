import { Prisma } from "@prisma/client";
import { isOpenNow, todayHoursLabel } from "../lib/hours.js";
import { num } from "../lib/serialize.js";
import { planTier } from "../lib/plans.js";

/** Relations needed to render a provider card anywhere in the product. */
export const providerCardInclude = {
  businessHours: true,
  services: {
    include: { category: { select: { id: true, name: true, slug: true } }, subcategory: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
  },
  badges: { include: { badge: true } },
  serviceAreas: { select: { areaName: true }, take: 6 },
  // The live plan, for the partner badge and plan-gated contact options.
  subscriptions: {
    where: { status: { in: ["active", "past_due"] } },
    select: { plan: { select: { code: true, photoLimit: true } } },
    orderBy: { startDate: "desc" },
    take: 1,
  },
} satisfies Prisma.ProviderInclude;

/** The provider's plan code and portfolio photo limit (free when no live subscription). */
export function cardPlan(p: { subscriptions: { plan: { code: string; photoLimit: number | null } }[] }, freePhotoLimit: number | null = 3) {
  const plan = p.subscriptions[0]?.plan;
  return { code: plan?.code ?? "free", photoLimit: plan ? plan.photoLimit : freePhotoLimit };
}

export type ProviderWithCard = Prisma.ProviderGetPayload<{ include: typeof providerCardInclude }>;

export function toProviderCard(
  p: ProviderWithCard,
  extras: { distanceKm?: number | null; isFavorite?: boolean; isSponsored?: boolean } = {},
) {
  const primary = p.services.find((s) => s.isPrimary) ?? p.services[0];
  const prices = p.services.map((s) => num(s.startingPrice)).filter((v): v is number => v !== null && v > 0);
  const subcategories = [...new Set(p.services.map((s) => s.subcategory?.name).filter(Boolean))] as string[];
  const description = p.description ?? "";
  const tier = planTier(cardPlan(p).code);
  // The WhatsApp button is a paid feature; free listings show Call only.
  const whatsapp = tier !== null && p.acceptsWhatsapp;
  return {
    id: p.id,
    slug: p.slug,
    businessName: p.businessName,
    shortDescription: description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description,
    logoUrl: p.logoUrl,
    coverUrl: p.coverUrl,
    businessType: p.businessType,
    yearsExperience: p.yearsExperience,
    phone: p.phone,
    whatsappNumber: whatsapp ? (p.whatsappNumber ?? p.phone) : null,
    acceptsCalls: p.acceptsCalls,
    acceptsWhatsapp: whatsapp,
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
    primaryCategory: primary ? primary.category : null,
    subcategories,
    startingPrice: prices.length ? Math.min(...prices) : null,
    priceUnit: primary?.priceUnit ?? null,
    serviceAreas: p.serviceAreas.map((a) => a.areaName),
    badges: p.badges.map((b) => ({ id: b.badge.id, name: b.badge.name })),
    isFavorite: extras.isFavorite ?? false,
    isSponsored: extras.isSponsored ?? false,
    planTier: tier,
  };
}

export type ProviderCard = ReturnType<typeof toProviderCard>;
