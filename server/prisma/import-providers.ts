/* Imports the real provider listings bundled in prisma/data/providers-*.json (built by dialnfind-provider-discovery,
 * see its README). Runs at the end of bootstrap.ts on every deploy, and on its own with `pnpm db:import-providers`.
 *
 * Every listing is created unclaimed, unverified and live, like the admin CSV import. The listing's email is often
 * missing and that is fine: the business signs up with its own email and claims the listing later.
 *
 * Safe to run again and again. Each source record ("osm:node/123", "overture:…") is remembered in provider_sources,
 * so a record is imported once: a listing the team deleted is not brought back, and one they edited is left alone.
 * A record whose phone already belongs to a listing is linked to that listing instead of creating a duplicate. */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";
import { normalizePhone } from "../src/lib/rules.js";
import { createListing, newListingSchema } from "../src/services/listings.js";
import { recalculateCategoryCounts } from "../src/services/ranking.js";

export const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const BUNDLE_FORMAT = "dialnfind-providers/1";

const bundleSchema = z.object({ format: z.literal(BUNDLE_FORMAT), providers: z.array(z.unknown()) });

const recordSchema = z.object({
  businessName: z.string(),
  description: z.string().nullish(),
  phone: z.string(),
  whatsappNumber: z.string().nullish(),
  email: z.string().nullish(),
  website: z.string().nullish(),
  addressLine: z.string().nullish(),
  locality: z.string().nullish(),
  city: z.string(),
  state: z.string(),
  pincode: z.string().nullish(),
  latitude: z.number(),
  longitude: z.number(),
  services: z.array(z.object({ category: z.string(), subcategory: z.string().nullish(), primary: z.boolean().optional() })).min(1),
  hours: z.array(z.object({ dayOfWeek: z.number(), openTime: z.string().nullable(), closeTime: z.string().nullable(), is24x7: z.boolean().optional() })).default([]),
  sources: z.array(z.object({ key: z.string().min(3).max(300), type: z.string().min(1).max(20), url: z.string().max(2000).nullish() })).min(1),
});
type BundleRecord = z.infer<typeof recordSchema>;

// Contact details a listing can do without: if one is malformed the listing is imported without it.
const DROPPABLE = ["description", "whatsappNumber", "email", "website", "addressLine", "locality", "pincode", "hours"] as const;

export interface ImportResult {
  files: number;
  imported: number;
  alreadyImported: number;
  linkedByPhone: number;
  skipped: number;
}

type Categories = Map<string, { id: bigint; subs: Map<string, bigint> }>;

async function activeCategories(): Promise<Categories> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, subcategories: { where: { isActive: true }, select: { id: true, slug: true } } },
  });
  return new Map(rows.map((c) => [c.slug, { id: c.id, subs: new Map(c.subcategories.map((s) => [s.slug, s.id])) }]));
}

/** Bundle record -> listing input, or the reason it can't be imported. */
export function toListing(record: BundleRecord, categories: Categories) {
  const services: { categoryId: number; subcategoryId: number | null; isPrimary: boolean }[] = [];
  for (const s of record.services) {
    const category = categories.get(s.category);
    if (!category) continue; // the team removed or renamed it
    const sub = s.subcategory ? category.subs.get(s.subcategory) : undefined;
    const entry = { categoryId: Number(category.id), subcategoryId: sub ? Number(sub) : null, isPrimary: false };
    if (!services.some((x) => x.categoryId === entry.categoryId && x.subcategoryId === entry.subcategoryId)) services.push(entry);
  }
  if (!services.length) return { error: "none of its categories exist" } as const;
  services[0].isPrimary = true;

  const input: Record<string, unknown> = {
    businessName: record.businessName,
    description: record.description ?? undefined,
    phone: record.phone,
    whatsappNumber: record.whatsappNumber ?? null,
    email: record.email ?? null,
    website: record.website ?? null,
    addressLine: record.addressLine ?? undefined,
    locality: record.locality ?? undefined,
    city: record.city,
    state: record.state,
    pincode: record.pincode ?? "",
    latitude: record.latitude,
    longitude: record.longitude,
    services,
    hours: record.hours.length ? record.hours : undefined,
  };
  let parsed = newListingSchema.safeParse(input);
  if (!parsed.success) {
    const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    if (![...bad].every((field) => (DROPPABLE as readonly string[]).includes(field))) {
      return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") } as const;
    }
    for (const field of bad) input[field] = field === "pincode" ? "" : field === "whatsappNumber" || field === "email" || field === "website" ? null : undefined;
    parsed = newListingSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") } as const;
  }
  return { listing: parsed.data } as const;
}

export function bundleFiles(dir = DATA_DIR): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names.filter((n) => /^providers-.+\.json$/.test(n)).sort().map((n) => path.join(dir, n));
}

export async function importProviderBundles(files = bundleFiles(), log: (line: string) => void = console.log): Promise<ImportResult> {
  const result: ImportResult = { files: files.length, imported: 0, alreadyImported: 0, linkedByPhone: 0, skipped: 0 };
  if (!files.length) return result;

  const categories = await activeCategories();
  const knownKeys = new Map((await prisma.providerSource.findMany({ select: { sourceKey: true, providerId: true } })).map((s) => [s.sourceKey, s.providerId]));
  const byPhone = new Map((await prisma.provider.findMany({ select: { id: true, phone: true } })).map((p) => [p.phone, p.id]));

  const remember = async (sources: BundleRecord["sources"], providerId: bigint | null) => {
    const fresh = sources.filter((s) => !knownKeys.has(s.key));
    if (!fresh.length) return;
    await prisma.providerSource.createMany({
      data: fresh.map((s) => ({ sourceKey: s.key, sourceType: s.type, sourceUrl: s.url ?? null, providerId })),
      skipDuplicates: true,
    });
    for (const s of fresh) knownKeys.set(s.key, providerId);
  };

  for (const file of files) {
    const bundle = bundleSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
    if (!bundle.success) {
      log(`Provider import: ${path.basename(file)} is not a ${BUNDLE_FORMAT} bundle; skipped`);
      continue;
    }
    for (const [index, raw] of bundle.data.providers.entries()) {
      const parsed = recordSchema.safeParse(raw);
      if (!parsed.success) {
        result.skipped++;
        log(`Provider import: ${path.basename(file)} #${index} is malformed; skipped`);
        continue;
      }
      const record = parsed.data;
      const seen = record.sources.find((s) => knownKeys.has(s.key));
      if (seen) {
        // Imported before (and maybe deleted or edited since): only remember any new sources for it.
        await remember(record.sources, knownKeys.get(seen.key) ?? null);
        result.alreadyImported++;
        continue;
      }
      const existing = byPhone.get(normalizePhone(record.phone) ?? record.phone);
      if (existing) {
        await remember(record.sources, existing);
        result.linkedByPhone++;
        continue;
      }
      const converted = toListing(record, categories);
      if ("error" in converted) {
        result.skipped++;
        log(`Provider import: ${record.businessName} skipped (${converted.error})`);
        continue;
      }
      const provider = await createListing(converted.listing, { ownerId: null, status: "active", refreshCategoryCounts: false });
      await remember(record.sources, provider.id);
      byPhone.set(provider.phone, provider.id);
      result.imported++;
      if (result.imported % 100 === 0) log(`Provider import: ${result.imported} listings so far...`);
    }
  }
  if (result.imported) await recalculateCategoryCounts();
  return result;
}

export function describe(result: ImportResult): string {
  return `${result.imported} providers imported, ${result.alreadyImported} already imported, ${result.linkedByPhone} matched an existing listing by phone, ${result.skipped} skipped`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importProviderBundles()
    .then((r) => console.log(`Provider import: ${describe(r)}`))
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
