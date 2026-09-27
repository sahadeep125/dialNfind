import bcrypt from "bcryptjs";
import type { BillingCycle, Prisma, SubscriptionSource, SubscriptionStatus, UserRole } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";

let seq = 0;
const next = () => ++seq;

export const PASSWORD = "secret123";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

/** Badges, the three plans (with store and Razorpay price ids) and admin roles, like prisma/bootstrap.ts. */
export async function seedPlans(): Promise<Awaited<ReturnType<typeof createPlans>>> {
  const existing = await prisma.subscriptionPlan.findMany({ where: { code: { in: ["free", "pro", "business"] } } });
  if (existing.length === 3) {
    const by = (code: string) => existing.find((p) => p.code === code)!;
    const badge = (name: string) => prisma.badge.findUniqueOrThrow({ where: { name } });
    return { free: by("free"), pro: by("pro"), business: by("business"), badges: { pro: await badge("Pro Partner"), business: await badge("Business Partner") } };
  }
  return createPlans();
}

async function createPlans() {
  const badges = {
    pro: await prisma.badge.create({ data: { name: "Pro Partner" } }),
    business: await prisma.badge.create({ data: { name: "Business Partner" } }),
  };
  const free = await prisma.subscriptionPlan.create({
    data: { code: "free", name: "Free", price: 0, leadAccessLimit: 2, photoLimit: 3, featuresJson: ["Listing"] },
  });
  const pro = await prisma.subscriptionPlan.create({
    data: {
      code: "pro", name: "Pro", price: 599, leadAccessLimit: null, photoLimit: 30, analyticsEnabled: true, rankingBoost: 0.025, badgeId: badges.pro.id,
      featuresJson: ["Unlimited leads"],
      prices: {
        create: [
          { billingCycle: "monthly", amount: 599, razorpayPlanId: "plan_pro_m", iosProductId: "dnf_pro_monthly", androidProductId: "dnf_pro:monthly" },
          { billingCycle: "yearly", amount: 5990, razorpayPlanId: "plan_pro_y", iosProductId: "dnf_pro_yearly", androidProductId: "dnf_pro:yearly" },
        ],
      },
    },
  });
  const business = await prisma.subscriptionPlan.create({
    data: {
      code: "business", name: "Business", price: 999, leadAccessLimit: null, photoLimit: null, analyticsEnabled: true, rankingBoost: 0.04, badgeId: badges.business.id,
      prices: {
        create: [
          { billingCycle: "monthly", amount: 999, razorpayPlanId: "plan_biz_m", iosProductId: "dnf_business_monthly", androidProductId: "dnf_business:monthly" },
          { billingCycle: "yearly", amount: 9990, iosProductId: "dnf_business_yearly", androidProductId: "dnf_business:yearly" },
        ],
      },
    },
  });
  return { free, pro, business, badges };
}

export async function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> & { role?: UserRole; verified?: boolean } = {}) {
  const { verified = true, ...data } = overrides;
  const n = next();
  return prisma.user.create({
    data: {
      name: `Test User ${String.fromCharCode(65 + (n % 26))}`,
      email: `user${n}@example.com`,
      passwordHash,
      emailVerifiedAt: verified ? new Date() : null,
      termsAcceptedAt: new Date(),
      ...data,
    },
  });
}

export async function createStaff(permissions: string[] | "super" = "super", overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  if (permissions === "super") return createUser({ role: "super_admin", ...overrides });
  const role = await prisma.adminRole.create({ data: { name: `Role ${next()}`, permissions } });
  return createUser({ role: "admin", adminRoleId: role.id, ...overrides });
}

export async function createCategory(overrides: Partial<Prisma.CategoryUncheckedCreateInput> = {}, subcategories: string[] = ["TV Repair", "AC Repair"]) {
  const n = next();
  const name = overrides.name ?? `Category ${n}`;
  return prisma.category.create({
    data: {
      name,
      slug: overrides.slug ?? `category-${n}`,
      ...overrides,
      subcategories: { create: subcategories.map((s, i) => ({ name: s, slug: `${s.toLowerCase().replace(/\W+/g, "-")}-${n}`, displayOrder: i })) },
    },
    include: { subcategories: { orderBy: { displayOrder: "asc" } } },
  });
}

/** Mumbai by default (19.076, 72.8777). */
export async function createProvider(
  overrides: Partial<Prisma.ProviderUncheckedCreateInput> & { categoryId?: bigint; subcategoryId?: bigint | null } = {},
) {
  const { categoryId, subcategoryId, ...data } = overrides;
  const n = next();
  return prisma.provider.create({
    data: {
      slug: `provider-${n}`,
      businessName: `Provider ${n}`,
      phone: "+919876543210",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.076,
      longitude: 72.8777,
      status: "active",
      ...data,
      ...(categoryId ? { services: { create: { categoryId, subcategoryId: subcategoryId ?? null, isPrimary: true, startingPrice: 300 } } } : {}),
    },
  });
}

/** A provider-role user with their own listing. */
export async function createOwner(overrides: Parameters<typeof createProvider>[0] = {}, userOverrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser({ role: "provider", ...userOverrides });
  const provider = await createProvider({ userId: user.id, claimedAt: new Date(), ...overrides });
  return { user, provider };
}

export async function subscribe(
  providerId: bigint,
  planId: bigint,
  overrides: { status?: SubscriptionStatus; source?: SubscriptionSource; billingCycle?: BillingCycle; externalId?: string | null; endDate?: Date | null; autoRenew?: boolean; graceUntil?: Date | null; startDate?: Date; createdAt?: Date } = {},
) {
  return prisma.providerSubscription.create({
    data: {
      providerId,
      planId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "active",
      ...overrides,
    },
  });
}

export async function createLead(providerId: bigint, overrides: Partial<Prisma.LeadUncheckedCreateInput> = {}) {
  return prisma.lead.create({ data: { providerId, channel: "call", ...overrides } });
}

export async function createReview(providerId: bigint, userId: bigint, overrides: Partial<Prisma.ReviewUncheckedCreateInput> = {}) {
  return prisma.review.create({ data: { providerId, userId, rating: 5, reviewText: "Great work, very quick", ...overrides } });
}
