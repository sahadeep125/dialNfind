import bcrypt from "bcryptjs";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";

let seq = 0;
const next = () => ++seq;

export const PASSWORD = "secret123";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

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

export async function createLead(providerId: bigint, overrides: Partial<Prisma.LeadUncheckedCreateInput> = {}) {
  return prisma.lead.create({ data: { providerId, channel: "call", ...overrides } });
}

export async function createReview(providerId: bigint, userId: bigint, overrides: Partial<Prisma.ReviewUncheckedCreateInput> = {}) {
  return prisma.review.create({ data: { providerId, userId, rating: 5, reviewText: "Great work, very quick", ...overrides } });
}
