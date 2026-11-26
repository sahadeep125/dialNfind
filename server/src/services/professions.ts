import type { BusinessType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict } from "../lib/errors.js";

/**
 * Individual professionals first. An account is either an individual professional, listed under their
 * own name with one listing per profession ("Deep Saha – Plumber – Ghoraguli"), or a business with one
 * listing ("ABC Services – Plumbing & Electrical – Siliguri"). The account type is stored on each
 * listing (providers.business_type: individual | company); every listing of an account has the same one.
 */

/** How many professions one individual may list. */
export const MAX_LISTINGS_PER_ACCOUNT = 10;

type Named = { name: string; professionName?: string | null };
export type ServiceForLabel = { category: Named; subcategory?: Named | null };

/** What an individual offering this service is called: "AC Technician", "Plumber", else the service's own name. */
export function professionOfService(s: ServiceForLabel): string {
  return s.subcategory?.professionName || s.category.professionName || s.subcategory?.name || s.category.name;
}

/**
 * The title after an individual's name: the one they typed, else the one their main service gives.
 * Null for a business, or a listing with no services yet.
 */
export function professionLabel(p: { businessType: BusinessType; profession?: string | null }, primary: ServiceForLabel | null | undefined): string | null {
  if (p.businessType !== "individual") return null;
  return p.profession?.trim() || (primary ? professionOfService(primary) : null);
}

/** A business card's middle part: its categories, "Plumbing & Electricians" (two at most). */
export function categoryLabel(services: { category: { id: bigint; name: string } }[]): string | null {
  const names: string[] = [];
  for (const s of services) if (!names.includes(s.category.name)) names.push(s.category.name);
  if (!names.length) return null;
  return names.length > 2 ? `${names.slice(0, 2).join(" & ")} +${names.length - 2}` : names.join(" & ");
}

/** The area a card names: the locality, else the city. */
export function serviceAreaLabel(p: { locality: string | null; city: string }): string {
  return p.locality?.trim() || p.city;
}

/** An individual's listing covers one profession, so all of its services sit in one category. */
export function assertOneProfession(businessType: BusinessType, services: { categoryId: number | bigint }[]) {
  if (businessType !== "individual") return;
  if (new Set(services.map((s) => String(s.categoryId))).size > 1) {
    throw badRequest("An individual professional listing covers one profession. Create a separate listing for each other profession.");
  }
}

/** The label a new or edited listing would show, loading its main service's names. */
export async function professionFor(businessType: BusinessType, profession: string | null | undefined, primary: { categoryId: number | bigint; subcategoryId?: number | bigint | null } | null | undefined) {
  if (businessType !== "individual") return null;
  if (!primary) return profession?.trim() || null;
  const [category, subcategory] = await Promise.all([
    prisma.category.findUnique({ where: { id: BigInt(primary.categoryId) }, select: { name: true, professionName: true } }),
    primary.subcategoryId ? prisma.subcategory.findUnique({ where: { id: BigInt(primary.subcategoryId) }, select: { name: true, professionName: true } }) : null,
  ]);
  return professionLabel({ businessType, profession }, category && { category, subcategory });
}

/**
 * Checks that an account may own one more listing (or take over `excludeId`'s). Only individual
 * professionals may own several, every one of them individual, each for a different profession.
 */
export async function assertCanOwnAnother(
  userId: bigint,
  next: { businessType: BusinessType; profession?: string | null; primary?: { categoryId: number | bigint; subcategoryId?: number | bigint | null } | null },
  excludeId?: bigint,
) {
  const owned = await prisma.provider.findMany({
    where: { userId, ...(excludeId !== undefined ? { id: { not: excludeId } } : {}) },
    select: {
      businessName: true,
      businessType: true,
      profession: true,
      services: {
        orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
        take: 1,
        select: { category: { select: { name: true, professionName: true } }, subcategory: { select: { name: true, professionName: true } } },
      },
    },
  });
  if (!owned.length) return;
  if (next.businessType !== "individual" || owned.some((o) => o.businessType !== "individual")) {
    throw conflict(`This account already manages ${owned[0]!.businessName}. Only individual professionals can have more than one listing, one for each profession.`);
  }
  if (owned.length >= MAX_LISTINGS_PER_ACCOUNT) throw conflict(`An account can list up to ${MAX_LISTINGS_PER_ACCOUNT} professions`);
  const label = (await professionFor(next.businessType, next.profession, next.primary))?.toLowerCase();
  const same = owned.find((o) => professionLabel(o, o.services[0])?.toLowerCase() === label);
  if (label && same) throw conflict(`You already have a listing as ${professionLabel(same, same.services[0])}. Add services to that listing instead.`);
}

/** An account with several listings stays individual: none of them can become a business. */
export async function assertTypeChangeAllowed(provider: { id: bigint; userId: bigint | null; businessType: BusinessType }, nextType: BusinessType | undefined) {
  if (!nextType || nextType === provider.businessType) return;
  if (nextType === "company" && provider.userId !== null) {
    const others = await prisma.provider.count({ where: { userId: provider.userId, id: { not: provider.id } } });
    if (others) throw conflict("This account has more than one listing, so it stays an individual professional account. Remove the other listings first.");
  }
  if (nextType === "individual") {
    const services = await prisma.providerService.findMany({ where: { providerId: provider.id }, select: { categoryId: true } });
    assertOneProfession("individual", services);
  }
}
