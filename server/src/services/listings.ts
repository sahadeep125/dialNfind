import { z } from "zod";
import type { Provider, ProviderStatus } from "@prisma/client";
import { email, optionalPhone, optionalUrl, phone, pincode } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { uniqueProviderSlug } from "../lib/slug.js";
import { optionalUploadedImageUrl, releaseFile } from "../storage/references.js";
import { hoursSchema, replaceHours, replaceServiceAreas, replaceServices, serviceAreaSchema, serviceSchema } from "../routes/provider/shared.js";
import { recalculateCategoryCounts, recalculateProvider } from "./ranking.js";
import { refreshProviderSlugs } from "./web-cache.js";
import { seoFieldsSchema } from "./seo.js";
import { assertOneProfession, assertTypeChangeAllowed, professionFor } from "./professions.js";

/** "Plumber" after an individual's name. Empty means the main service names it. */
const professionField = z.union([z.literal(""), z.null(), z.string().trim().min(2).max(80)]).transform((v) => v || null);

/** Everything needed to create a listing: provider onboarding, admin "Add listing" and CSV import. */
export const newListingSchema = z.object({
  /** The person's full name for an individual professional, the business name for a business. */
  businessName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  /** "individual" for an independent professional, "company" for a business (the default, as before). */
  businessType: z.enum(["individual", "company"]).default("company"),
  profession: professionField.optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  phone,
  whatsappNumber: optionalPhone,
  email: z.union([z.literal(""), z.null(), email]).optional(),
  website: optionalUrl.optional(),
  addressLine: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.union([z.literal(""), pincode]).transform((v) => v || null).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().int().min(1).max(100).default(10),
  acceptsCalls: z.boolean().default(true),
  acceptsWhatsapp: z.boolean().default(true),
  services: z.array(serviceSchema).min(1, "Pick at least one service"),
  serviceAreas: z.array(serviceAreaSchema).max(50).default([]),
  hours: hoursSchema.optional(),
});
export type NewListing = z.infer<typeof newListingSchema>;

/** Creates a listing. Without an owner it is an unclaimed listing that a business can claim later.
 * Bulk imports pass refreshCategoryCounts: false and recount once at the end. */
export async function createListing(
  input: NewListing,
  options: { ownerId: bigint | null; status: ProviderStatus; refreshCategoryCounts?: boolean },
): Promise<Provider> {
  const { services, serviceAreas, hours, ...profile } = input;
  assertOneProfession(profile.businessType, services);
  if (profile.businessType !== "individual") profile.profession = null;
  const slug = await uniqueProviderSlug(await slugName(profile.businessName, profile.businessType, profile.profession, services[0]), profile.city);
  const provider = await prisma.$transaction(async (tx) => {
    const created = await tx.provider.create({
      data: {
        ...profile,
        email: profile.email || null,
        website: profile.website || null,
        slug,
        userId: options.ownerId,
        claimedAt: options.ownerId ? new Date() : null,
        status: options.status,
      },
    });
    await replaceServices(tx, created.id, services);
    await replaceServiceAreas(tx, created.id, serviceAreas);
    if (hours) await replaceHours(tx, created.id, hours);
    return created;
  });
  await recalculateProvider(provider.id);
  if (options.refreshCategoryCounts !== false) await recalculateCategoryCounts();
  return provider;
}

/**
 * The name part of a listing's address. An individual's listings share their name, so the profession
 * goes in too: /providers/deep-saha-plumber-siliguri and /providers/deep-saha-electrician-siliguri.
 */
async function slugName(
  name: string,
  businessType: "individual" | "company",
  profession: string | null | undefined,
  primary: { categoryId: number | bigint; subcategoryId?: number | bigint | null } | null | undefined,
): Promise<string> {
  const label = await professionFor(businessType, profession, primary);
  return label ? `${name} ${label}` : name;
}

/** The editable profile, shared by the provider apps and the admin console. */
export const listingProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).nullable(),
  businessType: z.enum(["individual", "company"]),
  profession: professionField,
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  selfReportedCompletedJobs: z.number().int().min(0).max(1_000_000).nullable(),
  phone,
  whatsappNumber: optionalPhone,
  email: z.union([z.literal(""), z.null(), email]).transform((v) => v || null),
  website: optionalUrl,
  logoUrl: optionalUploadedImageUrl,
  coverUrl: optionalUploadedImageUrl,
  addressLine: z.string().trim().max(200).nullable(),
  locality: z.string().trim().max(80).nullable(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.union([z.null(), z.union([z.literal(""), pincode]).transform((v) => v || null)]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().int().min(1).max(100),
  acceptsCalls: z.boolean(),
  acceptsWhatsapp: z.boolean(),
  isAvailable: z.boolean(),
  ...seoFieldsSchema.shape,
});

/** The admin team may also hide a profile from search engines; providers' requests drop this field. */
export const adminListingProfileSchema = listingProfileSchema.extend({ seoNoIndex: z.boolean() });

/**
 * Saves profile changes: a new name, city, account type or profession gets a new slug, and replaced logo
 * or cover files are deleted. A listing switched to "business" drops its profession title.
 */
export async function updateListingProfile(provider: Provider, body: Partial<z.infer<typeof adminListingProfileSchema>>) {
  await assertTypeChangeAllowed(provider, body.businessType);
  const businessType = body.businessType ?? provider.businessType;
  if (businessType !== "individual" && (provider.profession !== null || body.profession !== undefined)) body = { ...body, profession: null };
  const profession = body.profession !== undefined ? body.profession : provider.profession;
  const renamed =
    (body.businessName && body.businessName !== provider.businessName) ||
    (body.city && body.city !== provider.city) ||
    businessType !== provider.businessType ||
    (businessType === "individual" && (profession ?? null) !== (provider.profession ?? null));
  let slug: string | undefined;
  if (renamed) {
    const primary = await prisma.providerService.findFirst({ where: { providerId: provider.id }, orderBy: [{ isPrimary: "desc" }, { id: "asc" }], select: { categoryId: true, subcategoryId: true } });
    slug = await uniqueProviderSlug(await slugName(body.businessName ?? provider.businessName, businessType, profession, primary), body.city ?? provider.city, provider.id);
    if (slug === provider.slug) slug = undefined;
  }
  await prisma.provider.update({ where: { id: provider.id }, data: { ...body, ...(slug ? { slug } : {}) } });
  for (const key of ["logoUrl", "coverUrl"] as const) {
    if (body[key] !== undefined && provider[key] && body[key] !== provider[key]) void releaseFile(provider[key]);
  }
  // The old address stops existing; recalculateProvider refreshes the new one.
  if (slug) refreshProviderSlugs([provider.slug]);
  await recalculateProvider(provider.id);
}
