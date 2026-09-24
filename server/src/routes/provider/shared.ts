import { Prisma } from "@prisma/client";
import { z } from "zod";
import { badRequest } from "../../lib/errors.js";

type Tx = Prisma.TransactionClient;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24 hour)");

export const hoursSchema = z
  .array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: time.nullable(),
      closeTime: time.nullable(),
      is24x7: z.boolean().default(false),
    }),
  )
  .max(7);

export const serviceSchema = z.object({
  categoryId: z.number().int().positive(),
  subcategoryId: z.number().int().positive().nullable().optional(),
  startingPrice: z.number().min(0).max(1_000_000).nullable().optional(),
  priceUnit: z.enum(["per_visit", "per_hour", "fixed"]).default("per_visit"),
  isPrimary: z.boolean().default(false),
});

export const serviceAreaSchema = z.object({
  areaName: z.string().trim().min(2).max(80),
  pincode: z.string().trim().max(10).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export async function replaceHours(tx: Tx, providerId: bigint, hours: z.infer<typeof hoursSchema>) {
  const days = new Set(hours.map((h) => h.dayOfWeek));
  if (days.size !== hours.length) throw badRequest("Each day can only appear once");
  await tx.providerBusinessHour.deleteMany({ where: { providerId } });
  if (hours.length) {
    await tx.providerBusinessHour.createMany({
      data: hours.map((h) => ({
        providerId,
        dayOfWeek: h.dayOfWeek,
        openTime: h.is24x7 ? null : h.openTime,
        closeTime: h.is24x7 ? null : h.closeTime,
        is24x7: h.is24x7,
      })),
    });
  }
}

/** Providers may only link to existing, active, super-admin-owned categories. */
export async function replaceServices(tx: Tx, providerId: bigint, services: z.infer<typeof serviceSchema>[]) {
  const categoryIds = [...new Set(services.map((s) => BigInt(s.categoryId)))];
  const subIds = [...new Set(services.filter((s) => s.subcategoryId).map((s) => BigInt(s.subcategoryId!)))];
  const [cats, subs] = await Promise.all([
    tx.category.findMany({ where: { id: { in: categoryIds }, isActive: true }, select: { id: true } }),
    tx.subcategory.findMany({ where: { id: { in: subIds }, isActive: true }, select: { id: true, categoryId: true } }),
  ]);
  if (cats.length !== categoryIds.length) throw badRequest("One of the selected categories does not exist");
  const subMap = new Map(subs.map((s) => [s.id, s.categoryId]));
  for (const s of services) {
    if (s.subcategoryId && subMap.get(BigInt(s.subcategoryId)) !== BigInt(s.categoryId)) {
      throw badRequest("A selected service does not belong to its category");
    }
  }
  const hasPrimary = services.some((s) => s.isPrimary);
  await tx.providerService.deleteMany({ where: { providerId } });
  await tx.providerService.createMany({
    data: services.map((s, i) => ({
      providerId,
      categoryId: BigInt(s.categoryId),
      subcategoryId: s.subcategoryId ? BigInt(s.subcategoryId) : null,
      startingPrice: s.startingPrice ?? null,
      priceUnit: s.priceUnit,
      isPrimary: hasPrimary ? s.isPrimary : i === 0,
    })),
    skipDuplicates: true,
  });
}

export async function replaceServiceAreas(tx: Tx, providerId: bigint, areas: z.infer<typeof serviceAreaSchema>[]) {
  await tx.providerServiceArea.deleteMany({ where: { providerId } });
  if (areas.length) {
    await tx.providerServiceArea.createMany({ data: areas.map((a) => ({ ...a, providerId })) });
  }
}
