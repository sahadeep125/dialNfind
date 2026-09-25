import { z } from "zod";
import type { Provider, ProviderStatus } from "@prisma/client";
import { email, optionalPhone, optionalUrl, phone, pincode } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { uniqueProviderSlug } from "../lib/slug.js";
import { storage } from "../storage/index.js";
import { hoursSchema, replaceHours, replaceServiceAreas, replaceServices, serviceAreaSchema, serviceSchema } from "../routes/provider/shared.js";
import { recalculateCategoryCounts, recalculateProvider } from "./ranking.js";

/** Everything needed to create a listing: provider onboarding, admin "Add listing" and CSV import. */
export const newListingSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  businessType: z.enum(["individual", "company"]).default("individual"),
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

/** Creates a listing. Without an owner it is an unclaimed listing that a business can claim later. */
export async function createListing(input: NewListing, options: { ownerId: bigint | null; status: ProviderStatus }): Promise<Provider> {
  const { services, serviceAreas, hours, ...profile } = input;
  const slug = await uniqueProviderSlug(profile.businessName, profile.city);
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
  await recalculateCategoryCounts();
  return provider;
}

/** The editable business profile, shared by the provider apps and the admin console. */
export const listingProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).nullable(),
  businessType: z.enum(["individual", "company"]),
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  selfReportedCompletedJobs: z.number().int().min(0).max(1_000_000).nullable(),
  phone,
  whatsappNumber: optionalPhone,
  email: z.union([z.literal(""), z.null(), email]).transform((v) => v || null),
  website: optionalUrl,
  logoUrl: optionalUrl,
  coverUrl: optionalUrl,
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
});

/** Saves profile changes: a new name or city gets a new slug, and replaced logo or cover files are deleted. */
export async function updateListingProfile(provider: Provider, body: Partial<z.infer<typeof listingProfileSchema>>) {
  const renamed = (body.businessName && body.businessName !== provider.businessName) || (body.city && body.city !== provider.city);
  const slug = renamed ? await uniqueProviderSlug(body.businessName ?? provider.businessName, body.city ?? provider.city, provider.id) : undefined;
  await prisma.provider.update({ where: { id: provider.id }, data: { ...body, ...(slug ? { slug } : {}) } });
  for (const key of ["logoUrl", "coverUrl"] as const) {
    if (body[key] !== undefined && provider[key] && body[key] !== provider[key]) void storage.remove(provider[key]!);
  }
  await recalculateProvider(provider.id);
}
