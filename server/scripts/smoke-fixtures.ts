/* Accounts and activity for `pnpm smoke` (scripts/smoke.mjs) on a throwaway database: CI, or a local copy.
 * Run after `pnpm db:bootstrap`, which provides the super admin, categories and the imported listings.
 *
 * Creates a customer, a second customer, a provider who owns one imported electronics listing on the Business
 * plan with a running promotion, a lead and a review, and a provider without a listing. All use SMOKE_PASSWORD
 * (the mobile and web end-to-end tests read it as E2E_PASSWORD). Never run it against
 * production: it refuses when NODE_ENV=production. */
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { recalculateProvider } from "../src/services/ranking.js";

export const SMOKE_ACCOUNTS = {
  customer: "smoke.customer@example.com",
  other: "smoke.other@example.com",
  provider: "smoke.provider@example.com",
  // A business account that has not added or claimed a listing yet (provider app onboarding tests).
  newProvider: "smoke.newprovider@example.com",
};

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("smoke-fixtures is for CI and local test databases only.");
  const password = process.env.SMOKE_PASSWORD ?? "";
  if (password.length < 12) throw new Error("Set SMOKE_PASSWORD (12 or more characters).");
  if (await prisma.user.findUnique({ where: { email: SMOKE_ACCOUNTS.provider } })) {
    console.log("Smoke fixtures already present");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const account = (email: string, name: string, role: "customer" | "provider") =>
    prisma.user.create({ data: { email, name, role, passwordHash, emailVerifiedAt: new Date(), termsAcceptedAt: new Date() } });
  const customer = await account(SMOKE_ACCOUNTS.customer, "Smoke Customer", "customer");
  const other = await account(SMOKE_ACCOUNTS.other, "Smoke Other", "customer");
  const owner = await account(SMOKE_ACCOUNTS.provider, "Smoke Provider", "provider");
  await account(SMOKE_ACCOUNTS.newProvider, "Smoke New Provider", "provider");

  // An imported listing in the first category (Electronics Repair), claimed by the smoke provider.
  const category = await prisma.category.findFirstOrThrow({ orderBy: { displayOrder: "asc" }, include: { subcategories: { orderBy: { displayOrder: "asc" } } } });
  const listing = await prisma.provider.findFirstOrThrow({
    where: { userId: null, status: "active", services: { some: { categoryId: category.id } } },
    orderBy: { id: "asc" },
  });
  await prisma.provider.update({ where: { id: listing.id }, data: { userId: owner.id, claimedAt: new Date(), acceptsWhatsapp: true } });
  // Two services, so the smoke run can drop and restore one.
  for (const sub of category.subcategories.slice(0, 2)) {
    await prisma.providerService.upsert({
      where: { providerId_categoryId_subcategoryId: { providerId: listing.id, categoryId: category.id, subcategoryId: sub.id } },
      update: {},
      create: { providerId: listing.id, categoryId: category.id, subcategoryId: sub.id, startingPrice: new Prisma.Decimal(299) },
    });
  }

  const business = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "business" } });
  const day = 864e5;
  await prisma.providerSubscription.create({
    data: { providerId: listing.id, planId: business.id, source: "admin", startDate: new Date(Date.now() - day), endDate: new Date(Date.now() + 30 * day), status: "active", autoRenew: false },
  });
  await prisma.sponsoredListing.create({
    data: { providerId: listing.id, categoryId: category.id, targetLocation: listing.city, startDate: new Date(Date.now() - day), endDate: new Date(Date.now() + 20 * day), budget: 2000 },
  });
  await prisma.lead.create({ data: { userId: customer.id, providerId: listing.id, categoryId: category.id, channel: "call", source: "search" } });
  await prisma.review.create({ data: { providerId: listing.id, userId: other.id, rating: 5, reviewText: "Fixed our TV the same day and explained the fault clearly." } });
  await recalculateProvider(listing.id);
  console.log(`Smoke fixtures: ${Object.values(SMOKE_ACCOUNTS).join(", ")} (provider owns "${listing.businessName}")`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
