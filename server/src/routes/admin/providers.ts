import { Router } from "express";
import { z } from "zod";
import type { Prisma, ProviderStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { pageMeta, paginationSchema } from "../../lib/pagination.js";
import { parseCsv } from "../../lib/csv.js";
import { currentUser } from "../../middleware/auth.js";
import { env } from "../../env.js";
import { logAdmin } from "../../services/audit.js";
import { notifyAndEmail } from "../../services/notify.js";
import { recalculateCategoryCounts, recalculateProvider } from "../../services/ranking.js";
import { createListing, listingProfileSchema, newListingSchema, updateListingProfile, type NewListing } from "../../services/listings.js";
import { searchPlaces } from "../../services/geocode.js";
import { storage } from "../../storage/index.js";
import { hoursSchema, replaceHours, replaceServiceAreas, replaceServices, serviceAreaSchema, serviceSchema } from "../provider/shared.js";
import { loadProfile } from "../provider/profile.js";

/** Listing management in the admin console: list, status, edit, create, import, ownership and delete. */
export const adminProvidersRouter = Router();

export const providerQuery = paginationSchema.extend({
  status: z.enum(["pending", "active", "rejected", "suspended"]).optional(),
  verification: z.enum(["none", "partial", "verified"]).optional(),
  claimed: z.enum(["yes", "no"]).optional(),
  city: z.string().trim().max(60).optional(),
  q: z.string().trim().max(100).optional(),
});

/** The list filters, shared with the CSV export. */
export function providerWhere(q: z.infer<typeof providerQuery>): Prisma.ProviderWhereInput {
  return {
    ...(q.status ? { status: q.status } : {}),
    ...(q.verification ? { verificationStatus: q.verification } : {}),
    ...(q.claimed ? { userId: q.claimed === "yes" ? { not: null } : null } : {}),
    ...(q.city ? { city: { equals: q.city, mode: "insensitive" as const } } : {}),
    ...(q.q ? { OR: [{ businessName: { contains: q.q, mode: "insensitive" as const } }, { phone: { contains: q.q } }] } : {}),
  };
}

adminProvidersRouter.get("/providers", async (req, res) => {
  const q = parse(providerQuery, req.query);
  const where = providerWhere(q);
  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        slug: true,
        businessName: true,
        city: true,
        locality: true,
        phone: true,
        logoUrl: true,
        status: true,
        verificationStatus: true,
        userId: true,
        avgRating: true,
        totalReviews: true,
        profileCompletenessPct: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        services: { where: { isPrimary: true }, take: 1, select: { category: { select: { name: true } } } },
      },
    }),
    prisma.provider.count({ where }),
  ]);
  res.json({ providers, ...pageMeta(q.page, q.pageSize, total) });
});

// Status ----------------------------------------------------------------------------------------

const STATUS_COPY: Record<ProviderStatus, [string, string]> = {
  active: ["Your listing is live", "Customers can now find and contact you on DialNFind."],
  suspended: ["Your listing is suspended", "Your listing is hidden from search. Contact support to resolve this."],
  rejected: ["Your listing was not approved", "Please review your details and contact support if you need help."],
  pending: ["Your listing is under review", "We will let you know once it is approved."],
};

/** Changes status or verification of one listing, tells the owner, and logs it. Used by single and bulk updates. */
async function setProviderStatus(adminId: bigint, id: bigint, change: { status?: ProviderStatus; verificationStatus?: VerificationStatus }) {
  const before = await prisma.provider.findUnique({ where: { id }, select: { status: true } });
  if (!before) throw notFound("Provider not found");
  const provider = await prisma.provider.update({ where: { id }, data: change });
  await logAdmin(adminId, "provider.update", "provider", id, change);
  if (change.status && change.status !== before.status) {
    const [title, body] = STATUS_COPY[change.status];
    void notifyAndEmail(provider.userId, "listing", title, body, { providerId: Number(id) }, { label: "Open your dashboard", url: env.providerUrl });
  }
  await recalculateProvider(id);
  return provider;
}

const providerStatusSchema = z.object({
  status: z.enum(["pending", "active", "rejected", "suspended"]).optional(),
  verificationStatus: z.enum(["none", "partial", "verified"]).optional(),
});

adminProvidersRouter.patch("/providers/:id", async (req, res) => {
  const body = parse(providerStatusSchema, req.body);
  const provider = await setProviderStatus(currentUser(req).id, idParam(req.params.id as string), body);
  await recalculateCategoryCounts();
  res.json({ provider: { id: provider.id, status: provider.status, verificationStatus: provider.verificationStatus } });
});

const BULK_ACTIONS = {
  approve: { status: "active" },
  suspend: { status: "suspended" },
  reject: { status: "rejected" },
  verify: { verificationStatus: "verified" },
} as const;

/** POST /admin/providers/bulk — the same change for up to 100 listings. */
adminProvidersRouter.post("/providers/bulk", async (req, res) => {
  const body = parse(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), action: z.enum(["approve", "suspend", "reject", "verify"]) }), req.body);
  const adminId = currentUser(req).id;
  let updated = 0;
  for (const id of new Set(body.ids)) {
    await setProviderStatus(adminId, BigInt(id), BULK_ACTIONS[body.action]).then(() => updated++, () => undefined);
  }
  await recalculateCategoryCounts();
  res.json({ updated });
});

// Create and edit --------------------------------------------------------------------------------

/** POST /admin/providers — adds an unclaimed listing, live straight away unless another status is given. */
adminProvidersRouter.post("/providers", async (req, res) => {
  const body = parse(newListingSchema.extend({ status: z.enum(["pending", "active"]).default("active") }), req.body);
  const { status, ...listing } = body;
  const provider = await createListing(listing, { ownerId: null, status });
  await logAdmin(currentUser(req).id, "provider.create", "provider", provider.id, { businessName: provider.businessName, city: provider.city });
  res.status(201).json({ provider: { id: provider.id, slug: provider.slug, status: provider.status } });
});

async function findProvider(id: string) {
  const provider = await prisma.provider.findUnique({ where: { id: idParam(id) } });
  if (!provider) throw notFound("Provider not found");
  return provider;
}

/** GET /admin/providers/:id/profile — the full editable profile, in the same shape the provider apps use. */
adminProvidersRouter.get("/providers/:id/profile", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  res.json({ provider: await loadProfile(provider.id) });
});

adminProvidersRouter.patch("/providers/:id/profile", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  const body = parse(listingProfileSchema.partial(), req.body);
  await updateListingProfile(provider, body);
  await logAdmin(currentUser(req).id, "provider.edit", "provider", provider.id, { fields: Object.keys(body) });
  res.json({ provider: await loadProfile(provider.id) });
});

adminProvidersRouter.put("/providers/:id/hours", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  const { hours } = parse(z.object({ hours: hoursSchema }), req.body);
  await prisma.$transaction((tx) => replaceHours(tx, provider.id, hours));
  await recalculateProvider(provider.id);
  await logAdmin(currentUser(req).id, "provider.edit", "provider", provider.id, { fields: ["hours"] });
  res.json({ provider: await loadProfile(provider.id) });
});

adminProvidersRouter.put("/providers/:id/services", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  const { services } = parse(z.object({ services: z.array(serviceSchema).min(1).max(30) }), req.body);
  await prisma.$transaction((tx) => replaceServices(tx, provider.id, services));
  await recalculateProvider(provider.id);
  await recalculateCategoryCounts();
  await logAdmin(currentUser(req).id, "provider.edit", "provider", provider.id, { fields: ["services"] });
  res.json({ provider: await loadProfile(provider.id) });
});

adminProvidersRouter.put("/providers/:id/service-areas", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  const { serviceAreas } = parse(z.object({ serviceAreas: z.array(serviceAreaSchema).max(50) }), req.body);
  await prisma.$transaction((tx) => replaceServiceAreas(tx, provider.id, serviceAreas));
  await recalculateProvider(provider.id);
  await logAdmin(currentUser(req).id, "provider.edit", "provider", provider.id, { fields: ["serviceAreas"] });
  res.json({ provider: await loadProfile(provider.id) });
});

// Ownership and delete ---------------------------------------------------------------------------

/** POST /admin/providers/:id/owner — gives the listing to an account (moving it from the current owner, if any). */
adminProvidersRouter.post("/providers/:id/owner", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email("Enter the new owner's email") }), req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { provider: { select: { id: true, businessName: true } } } });
  if (!user || user.status !== "active") throw notFound("No active account uses this email. Ask the owner to sign up first.");
  if (user.role === "admin" || user.role === "super_admin") throw badRequest("Team accounts cannot own a listing");
  if (user.provider && user.provider.id !== provider.id) throw conflict(`This account already manages ${user.provider.businessName}`);
  await prisma.$transaction([
    prisma.provider.update({ where: { id: provider.id }, data: { userId: user.id, claimedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { role: "provider" } }),
  ]);
  await logAdmin(currentUser(req).id, "provider.owner", "provider", provider.id, { from: provider.userId ? Number(provider.userId) : null, to: Number(user.id), email });
  void notifyAndEmail(user.id, "claim", `${provider.businessName} is now yours`, "The DialNFind team gave you access to this listing. Sign in to the provider app to manage it.", { providerId: Number(provider.id) }, { label: "Open the provider app", url: env.providerUrl });
  res.json({ ok: true });
});

/** DELETE /admin/providers/:id/owner — makes the listing unclaimed again; the account keeps working without it. */
adminProvidersRouter.delete("/providers/:id/owner", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  if (!provider.userId) throw badRequest("This listing has no owner");
  await prisma.provider.update({ where: { id: provider.id }, data: { userId: null, claimedAt: null } });
  await logAdmin(currentUser(req).id, "provider.owner_removed", "provider", provider.id, { from: Number(provider.userId) });
  res.json({ ok: true });
});

/**
 * DELETE /admin/providers/:id — removes the listing with its leads, reviews and history. The admin
 * types the business name to confirm; the audit log keeps a snapshot of the main details.
 */
adminProvidersRouter.delete("/providers/:id", async (req, res) => {
  const provider = await findProvider(req.params.id as string);
  const { confirmName } = parse(z.object({ confirmName: z.string() }), req.body ?? {});
  if (confirmName.trim().toLowerCase() !== provider.businessName.trim().toLowerCase()) throw badRequest("Type the business name exactly to confirm");
  const [portfolio, reviewPhotos, counts] = await Promise.all([
    prisma.providerPortfolio.findMany({ where: { providerId: provider.id }, select: { imageUrl: true } }),
    prisma.reviewPhoto.findMany({ where: { review: { providerId: provider.id } }, select: { photoUrl: true } }),
    prisma.provider.findUniqueOrThrow({ where: { id: provider.id }, select: { _count: { select: { leads: true, reviews: true } } } }),
  ]);
  await prisma.provider.delete({ where: { id: provider.id } });
  for (const url of [provider.logoUrl, provider.coverUrl, ...portfolio.map((p) => p.imageUrl), ...reviewPhotos.map((p) => p.photoUrl)]) if (url) void storage.remove(url);
  await recalculateCategoryCounts();
  await logAdmin(currentUser(req).id, "provider.delete", "provider", provider.id, {
    businessName: provider.businessName,
    phone: provider.phone,
    city: provider.city,
    ownerId: provider.userId ? Number(provider.userId) : null,
    leads: counts._count.leads,
    reviews: counts._count.reviews,
  });
  res.json({ ok: true });
});

// CSV import -------------------------------------------------------------------------------------

export const IMPORT_COLUMNS = [
  "business_name",
  "phone",
  "category",
  "subcategory",
  "city",
  "state",
  "locality",
  "address",
  "pincode",
  "latitude",
  "longitude",
  "whatsapp",
  "email",
  "website",
  "description",
  "service_radius_km",
] as const;
const REQUIRED = ["business_name", "phone", "category", "city", "state"];
const MAX_ROWS = 500;

interface ImportRow {
  row: number;
  businessName: string;
  city: string;
  errors: string[];
  geocoded: boolean;
  listing?: NewListing;
}

/**
 * POST /admin/providers/import — CSV with a header row (see IMPORT_COLUMNS). With dryRun, every row is
 * checked and nothing is saved. Rows without coordinates are placed with the geocoder (about one a second).
 */
adminProvidersRouter.post("/providers/import", async (req, res) => {
  const body = parse(z.object({ csv: z.string().min(1, "Choose a CSV file").max(2_000_000, "The file is too large"), dryRun: z.boolean().default(true) }), req.body);
  const [header, ...lines] = parseCsv(body.csv);
  if (!header) throw badRequest("The file is empty");
  const columns = header.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const missing = REQUIRED.filter((c) => !columns.includes(c));
  if (missing.length) throw badRequest(`Missing columns: ${missing.join(", ")}. Download the template to see the expected header.`);
  if (lines.length > MAX_ROWS) throw badRequest(`Import at most ${MAX_ROWS} rows at a time`);

  const [categories, subcategories, existing] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } }),
    prisma.subcategory.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true, categoryId: true } }),
    prisma.provider.findMany({ select: { phone: true } }),
  ]);
  const findBy = <T extends { slug: string; name: string }>(list: T[], v: string) => list.find((x) => x.slug === v.toLowerCase() || x.name.toLowerCase() === v.toLowerCase());
  const phones = new Set(existing.map((p) => p.phone));

  const rows: ImportRow[] = [];
  for (const [i, values] of lines.entries()) {
    const get = (c: string) => (values[columns.indexOf(c)] ?? "").trim();
    const errors: string[] = [];
    const category = findBy(categories, get("category"));
    if (!category) errors.push(`Unknown category "${get("category")}"`);
    const subName = get("subcategory");
    const sub = subName ? findBy(subcategories.filter((s) => s.categoryId === category?.id), subName) : undefined;
    if (subName && category && !sub) errors.push(`"${subName}" is not a service in ${category.name}`);

    let latitude = get("latitude") === "" ? NaN : Number(get("latitude"));
    let longitude = get("longitude") === "" ? NaN : Number(get("longitude"));
    let geocoded = false;
    if ((!Number.isFinite(latitude) || !Number.isFinite(longitude)) && !errors.length) {
      const query = [get("address"), get("locality"), get("city"), get("state"), get("pincode")].filter(Boolean).join(", ");
      const [place] = await searchPlaces(query, 1);
      if (place) {
        latitude = place.latitude;
        longitude = place.longitude;
        geocoded = true;
      } else errors.push("Add latitude and longitude; the address could not be found on the map");
    }

    const candidate = {
      businessName: get("business_name"),
      description: get("description") || undefined,
      phone: get("phone"),
      whatsappNumber: get("whatsapp"),
      email: get("email"),
      website: get("website") || null,
      addressLine: get("address") || undefined,
      locality: get("locality") || undefined,
      city: get("city"),
      state: get("state"),
      pincode: get("pincode"),
      latitude,
      longitude,
      serviceRadiusKm: get("service_radius_km") ? Number(get("service_radius_km")) : undefined,
      services: category ? [{ categoryId: Number(category.id), subcategoryId: sub ? Number(sub.id) : null, isPrimary: true }] : [],
    };
    const parsed = newListingSchema.safeParse(candidate);
    if (!parsed.success && !errors.length) {
      for (const issue of parsed.error.issues.slice(0, 3)) errors.push(`${issue.path.join(".") || "row"}: ${issue.message}`);
    }
    if (parsed.success && phones.has(parsed.data.phone)) errors.push(`A listing with ${parsed.data.phone} already exists`);
    if (parsed.success && !errors.length) phones.add(parsed.data.phone);
    rows.push({ row: i + 2, businessName: candidate.businessName, city: candidate.city, errors, geocoded, listing: parsed.success && !errors.length ? parsed.data : undefined });
  }

  let created = 0;
  if (!body.dryRun) {
    for (const r of rows) {
      if (!r.listing) continue;
      await createListing(r.listing, { ownerId: null, status: "active" });
      created++;
    }
    await logAdmin(currentUser(req).id, "provider.import", "provider", undefined, { rows: rows.length, created });
  }
  res.json({
    dryRun: body.dryRun,
    total: rows.length,
    valid: rows.filter((r) => r.listing).length,
    created,
    rows: rows.map(({ listing: _l, ...r }) => r),
  });
});
