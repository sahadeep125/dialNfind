import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../../src/lib/prisma.js";
import { env } from "../../../src/env.js";
import { createListing, newListingSchema, updateListingProfile } from "../../../src/services/listings.js";
import { hoursSchema, replaceHours, replaceServiceAreas, replaceServices } from "../../../src/routes/provider/shared.js";
import { ownProvider } from "../../../src/routes/provider/common.js";
import { anonymiseUser, closeBusinessAccount } from "../../../src/services/accounts.js";
import { cleanName, signInWithIdentity, storeAppleRefreshToken } from "../../../src/services/social-auth.js";
import { openTicket, supportStaffIds, ticketRef } from "../../../src/services/tickets.js";
import { purgeGeocodeCache, reversePlace, searchPlaces } from "../../../src/services/geocode.js";
import { recordProfileView, resolveTerm, searchProviders } from "../../../src/services/search.js";
import { uploadDir } from "../../../src/storage/index.js";
import {
  createCategory, createLead, createOwner, createProvider, createReview, createStaff, createUser, seedPlans, subscribe,
} from "../../helpers/factories.js";
import { json, mockFetch, sentMails, settle } from "../../helpers/app.js";

const upload = async (name: string) => {
  await writeFile(path.join(uploadDir, name), "x");
  return `${env.publicUrl}/uploads/${name}`;
};
const exists = (name: string) => import("node:fs/promises").then((fs) => fs.stat(path.join(uploadDir, name)).then(() => true, () => false));

describe("provider shared helpers", () => {
  it("validates hours", () => {
    expect(hoursSchema.safeParse([{ dayOfWeek: 1, openTime: "09:00", closeTime: null }]).success).toBe(false);
    expect(hoursSchema.safeParse([{ dayOfWeek: 1, openTime: "10:00", closeTime: "09:00" }]).success).toBe(false);
    expect(hoursSchema.safeParse([{ dayOfWeek: 1, openTime: null, closeTime: null, is24x7: true }]).success).toBe(true);
    expect(hoursSchema.safeParse([{ dayOfWeek: 1, openTime: null, closeTime: null }]).success).toBe(true);
  });
  it("replaces hours, areas and services", async () => {
    const cat = await createCategory();
    const other = await createCategory();
    const inactive = await createCategory({ isActive: false });
    const [tv, ac] = cat.subcategories;
    const p = await createProvider();
    await prisma.$transaction(async (tx) => {
      await replaceHours(tx, p.id, [{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", is24x7: false }, { dayOfWeek: 2, openTime: "09:00", closeTime: "18:00", is24x7: true }]);
      await replaceHours(tx, p.id, []);
      await replaceHours(tx, p.id, [{ dayOfWeek: 2, openTime: "09:00", closeTime: "18:00", is24x7: true }]);
      await expect(replaceHours(tx, p.id, [{ dayOfWeek: 1, openTime: null, closeTime: null, is24x7: false }, { dayOfWeek: 1, openTime: null, closeTime: null, is24x7: false }])).rejects.toThrow("only appear once");
    });
    expect(await prisma.providerBusinessHour.findMany()).toEqual([expect.objectContaining({ dayOfWeek: 2, openTime: null, is24x7: true })]);

    await prisma.$transaction((tx) => replaceServiceAreas(tx, p.id, [{ areaName: "Andheri", pincode: null }]));
    await prisma.$transaction((tx) => replaceServiceAreas(tx, p.id, []));
    expect(await prisma.providerServiceArea.count()).toBe(0);

    const svc = (categoryId: bigint, subcategoryId?: bigint | null, isPrimary = false) => ({ categoryId: Number(categoryId), subcategoryId: subcategoryId ? Number(subcategoryId) : null, priceUnit: "per_visit" as const, isPrimary });
    await expect(prisma.$transaction((tx) => replaceServices(tx, p.id, [svc(inactive.id)]))).rejects.toThrow("does not exist");
    await expect(prisma.$transaction((tx) => replaceServices(tx, p.id, [svc(other.id, tv!.id)]))).rejects.toThrow("does not belong");

    // No primary chosen: the first one becomes primary; duplicates are skipped.
    await prisma.$transaction((tx) => replaceServices(tx, p.id, [svc(cat.id, tv!.id), svc(cat.id, tv!.id), svc(cat.id, ac!.id), svc(cat.id)]));
    const services = await prisma.providerService.findMany({ orderBy: { id: "asc" } });
    expect(services.map((s) => s.isPrimary)).toEqual([true, false, false]);

    const wide = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "provider", label: "Wide", fieldType: "text" } });
    const narrow = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, subcategoryId: tv!.id, appliesTo: "provider", label: "Narrow", fieldType: "text" } });
    await prisma.attributeValue.createMany({
      data: [
        { attributeId: wide.id, entityType: "provider_service", entityId: services[0]!.id, value: "moves" },
        { attributeId: narrow.id, entityType: "provider_service", entityId: services[0]!.id, value: "dropped" },
      ],
    });
    // TV removed: its category-wide answer moves to the AC service, its TV-only answer is dropped. Other category has no heir.
    await prisma.$transaction((tx) => replaceServices(tx, p.id, [svc(cat.id, ac!.id, true), svc(other.id)]));
    const values = await prisma.attributeValue.findMany();
    expect(values).toEqual([expect.objectContaining({ value: "moves", entityId: services[1]!.id })]);
    await prisma.$transaction((tx) => replaceServices(tx, p.id, [svc(other.id)]));
    expect(await prisma.attributeValue.count()).toBe(0);
  });
  it("ownProvider requires a provider with a listing", async () => {
    const customer = await createUser();
    await expect(ownProvider({ user: { id: customer.id, role: "customer" } } as never)).rejects.toThrow("Provider account required");
    const bare = await createUser({ role: "provider" });
    await expect(ownProvider({ user: { id: bare.id, role: "provider" } } as never)).rejects.toThrow("not set up a business profile");
    const { user, provider } = await createOwner();
    expect((await ownProvider({ user: { id: user.id, role: "provider" } } as never)).id).toBe(provider.id);
    const admin = await createStaff();
    await expect(ownProvider({ user: { id: admin.id, role: "super_admin" } } as never)).rejects.toThrow("not set up");
  });
});

describe("listings", () => {
  it("creates owned and unclaimed listings", async () => {
    const cat = await createCategory();
    const owner = await createUser({ role: "provider" });
    const input = newListingSchema.parse({
      businessName: "Sharma TV", phone: "9876543210", email: "", website: "", city: "Mumbai", state: "Maharashtra", pincode: "",
      latitude: 19, longitude: 72, services: [{ categoryId: Number(cat.id) }], hours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" }],
    });
    const owned = await createListing(input, { ownerId: owner.id, status: "active" });
    expect(owned).toMatchObject({ slug: "sharma-tv-mumbai", userId: owner.id, email: null, website: null, pincode: null });
    expect(owned.claimedAt).toBeInstanceOf(Date);
    const { hours: _h, ...noHours } = input;
    const unclaimed = await createListing({ ...noHours, email: "a@b.co", website: "https://x.co" }, { ownerId: null, status: "pending" });
    expect(unclaimed).toMatchObject({ slug: "sharma-tv-mumbai-2", userId: null, claimedAt: null, email: "a@b.co" });
    expect((await prisma.category.findUniqueOrThrow({ where: { id: cat.id } })).providerCount).toBe(1);
  });
  it("updates the profile, renaming the slug and releasing replaced images", async () => {
    const oldLogo = await upload("logo-old.webp");
    const oldCover = await upload("cover-old.webp");
    const p = await createProvider({ businessName: "Old", city: "Pune", slug: "old-pune", logoUrl: oldLogo, coverUrl: oldCover });
    await updateListingProfile(p, { businessName: "New", logoUrl: await upload("logo-new.webp"), coverUrl: oldCover });
    await settle();
    let row = await prisma.provider.findUniqueOrThrow({ where: { id: p.id } });
    expect(row.slug).toBe("new-pune");
    expect(await exists("logo-old.webp")).toBe(false);
    expect(await exists("cover-old.webp")).toBe(true);
    await updateListingProfile(row, { city: "Delhi" });
    row = await prisma.provider.findUniqueOrThrow({ where: { id: p.id } });
    expect(row.slug).toBe("new-delhi");
    await updateListingProfile(row, { businessName: "New", description: "same name" });
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: p.id } })).slug).toBe("new-delhi");
    await updateListingProfile({ ...row, logoUrl: null }, { logoUrl: null });
  });
});

describe("accounts", () => {
  it("closes a business: suspends it and stops renewals", async () => {
    const plans = await seedPlans();
    const cat = await createCategory();
    const { user, provider } = await createOwner();
    await prisma.pushToken.create({ data: { userId: user.id, token: "t", platform: "ios" } });
    await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_1" });
    await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(), endDate: new Date(), budget: 500 } });
    const fetch = mockFetch(json({ id: "sub_1" }));
    expect(await closeBusinessAccount(user.id)).toEqual({ storeSubscription: null });
    expect(fetch.mock.calls[0]![0]).toBe("https://api.razorpay.com/v1/subscriptions/sub_1/cancel");
    const p = await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } });
    expect(p).toMatchObject({ status: "suspended", isAvailable: false });
    expect(await prisma.pushToken.count()).toBe(0);
    expect((await prisma.sponsoredListing.findFirstOrThrow()).status).toBe("completed");
    expect((await prisma.providerSubscription.findFirstOrThrow()).autoRenew).toBe(false);
  });
  it("reports store subscriptions and survives a failed Razorpay cancel", async () => {
    const plans = await seedPlans();
    const a = await createOwner();
    await subscribe(a.provider.id, plans.pro.id, { source: "app_store" });
    expect(await closeBusinessAccount(a.user.id)).toEqual({ storeSubscription: "app_store" });
    const b = await createOwner();
    await subscribe(b.provider.id, plans.pro.id, { source: "play_store" });
    expect(await closeBusinessAccount(b.user.id)).toEqual({ storeSubscription: "play_store" });
    const c = await createOwner();
    await subscribe(c.provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_c" });
    mockFetch(json({ error: { description: "nope" } }, 400));
    expect(await closeBusinessAccount(c.user.id)).toEqual({ storeSubscription: null });
    expect(console.error).toHaveBeenCalledWith("[accounts] Razorpay cancel failed", expect.anything());
    // Not configured, not renewing, or no provider at all: nothing to cancel.
    const d = await createOwner();
    await subscribe(d.provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_d", autoRenew: false });
    expect(await closeBusinessAccount(d.user.id)).toEqual({ storeSubscription: null });
    const customer = await createUser();
    expect(await closeBusinessAccount(customer.id)).toEqual({ storeSubscription: null });
    const saved = env.razorpay.keyId;
    env.razorpay.keyId = "";
    const e = await createOwner();
    await subscribe(e.provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_e" });
    expect(await closeBusinessAccount(e.user.id)).toEqual({ storeSubscription: null });
    env.razorpay.keyId = saved;
  });
  it("anonymises a user and cleans up after them", async () => {
    const photo = await upload("me.webp");
    const reviewPhoto = await upload("review.webp");
    const user = await createUser({ role: "provider", profilePhotoUrl: photo });
    const owned = await createProvider({ userId: user.id, claimedAt: new Date() });
    const reviewed = await createProvider();
    const review = await createReview(reviewed.id, user.id, { photos: { create: { photoUrl: reviewPhoto } } });
    await prisma.userOAuthAccount.createMany({
      data: [
        { userId: user.id, provider: "apple", providerUserId: "a1", refreshToken: "rt", clientId: "com.dialnfind.app" },
        { userId: user.id, provider: "apple", providerUserId: "a2", refreshToken: "rt2", clientId: null },
      ],
    });
    await anonymiseUser(user.id);
    await settle();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after).toMatchObject({ status: "deleted", role: "customer", name: "Deleted user", email: `deleted-${user.id}@deleted.invalid`, passwordHash: null });
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: owned.id } })).userId).toBeNull();
    expect(await prisma.review.findUnique({ where: { id: review.id } })).toBeNull();
    expect(await prisma.userOAuthAccount.count()).toBe(0);
    expect(await exists("me.webp")).toBe(false);
    expect(await exists("review.webp")).toBe(false);

    const boss = await createStaff();
    await anonymiseUser(boss.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: boss.id } })).role).toBe("super_admin");
  });
});

describe("social auth", () => {
  const identity = (over: Partial<{ sub: string; email: string | null; emailVerified: boolean; name: string | null; picture: string | null; audience: string }> = {}) => ({
    sub: "g-1", email: "new@example.com", emailVerified: true, name: "Asha Rao", picture: "https://pic", audience: "google-web", ...over,
  });

  it("cleans names", () => {
    expect(cleanName("  123 Ravi 😀 Kumar!! ")).toBe("Ravi Kumar");
    expect(cleanName("7")).toBeNull();
    expect(cleanName(null)).toBeNull();
  });
  it("creates, links and signs in accounts", async () => {
    const created = await signInWithIdentity({ provider: "google", identity: identity(), role: "provider", name: "  " });
    expect(created.isNewUser).toBe(true);
    expect(created.user).toMatchObject({ role: "provider", name: "Asha Rao", profilePhotoUrl: "https://pic", passwordHash: null });

    const again = await signInWithIdentity({ provider: "google", identity: identity({ email: null, audience: "" }), role: "customer" });
    expect(again).toMatchObject({ isNewUser: false, user: { id: created.user.id } });
    const link = await prisma.userOAuthAccount.findFirstOrThrow();
    expect(link).toMatchObject({ email: "new@example.com", clientId: "google-web" });

    const fallback = await signInWithIdentity({ provider: "apple", identity: identity({ sub: "a-9", email: "x@y.co", name: null, audience: "" }), role: "customer" });
    expect(fallback.user.name).toBe("DialNFind user");

    const existing = await createUser({ email: "old@example.com", verified: false });
    const linked = await signInWithIdentity({ provider: "apple", identity: identity({ sub: "a-1", email: "old@example.com" }), role: "customer", name: "Given" });
    expect(linked).toMatchObject({ isNewUser: false, user: { id: existing.id } });
    expect(linked.user.emailVerifiedAt).toBeInstanceOf(Date);
    await settle();
    expect(sentMails().map((m) => m.subject)).toContain("Sign in with Apple was added to your account");
    const verified = await createUser({ email: "v@example.com" });
    const kept = await signInWithIdentity({ provider: "google", identity: identity({ sub: "g-v", email: "v@example.com", audience: "" }), role: "customer" });
    expect(kept.user.emailVerifiedAt).toEqual(verified.emailVerifiedAt);
  });
  it("refuses unusable identities and accounts", async () => {
    await expect(signInWithIdentity({ provider: "apple", identity: identity({ email: null }), role: "customer" })).rejects.toThrow("Apple did not share");
    await expect(signInWithIdentity({ provider: "google", identity: identity({ email: null }), role: "customer" })).rejects.toThrow("Google account did not share");
    await expect(signInWithIdentity({ provider: "google", identity: identity({ emailVerified: false }), role: "customer" })).rejects.toThrow("verify your email");
    await createStaff("super", { email: "staff@example.com" });
    await expect(signInWithIdentity({ provider: "google", identity: identity({ email: "staff@example.com" }), role: "customer" })).rejects.toThrow("Staff accounts");
    const suspended = await createUser({ email: "s@example.com", status: "suspended" });
    await expect(signInWithIdentity({ provider: "google", identity: identity({ email: "s@example.com" }), role: "customer" })).rejects.toThrow("not active");
    await prisma.userOAuthAccount.create({ data: { userId: suspended.id, provider: "google", providerUserId: "g-s" } });
    await expect(signInWithIdentity({ provider: "google", identity: identity({ sub: "g-s" }), role: "customer" })).rejects.toThrow("not active");
  });
  it("retries once after a concurrent first sign-in", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" });
    const create = vi.spyOn(prisma.user, "create").mockRejectedValueOnce(conflict);
    const result = await signInWithIdentity({ provider: "google", identity: identity(), role: "customer" });
    expect(result.isNewUser).toBe(true);
    create.mockRejectedValue(conflict);
    await expect(signInWithIdentity({ provider: "google", identity: identity({ sub: "g-2", email: "n2@example.com" }), role: "customer" })).rejects.toBe(conflict);
    create.mockRejectedValue(new Error("other"));
    await expect(signInWithIdentity({ provider: "google", identity: identity({ sub: "g-3", email: "n3@example.com" }), role: "customer" })).rejects.toThrow("other");
  });
  it("stores Apple refresh tokens", async () => {
    const u = await createUser();
    await prisma.userOAuthAccount.create({ data: { userId: u.id, provider: "apple", providerUserId: "a" } });
    await storeAppleRefreshToken("a", "rt", "client");
    expect(await prisma.userOAuthAccount.findFirstOrThrow()).toMatchObject({ refreshToken: "rt", clientId: "client" });
  });
});

describe("tickets", () => {
  it("formats references and finds support staff", async () => {
    expect(ticketRef(12)).toBe("DNF-000012");
    expect(await supportStaffIds(5n)).toEqual([5n]);
    const boss = await createStaff();
    const agent = await createStaff(["support"]);
    await createStaff(["users"]);
    await createStaff("super", { status: "suspended" });
    expect((await supportStaffIds(null)).sort()).toEqual([boss.id, agent.id].sort());
  });
  it("opens tickets with priority by plan", async () => {
    const plans = await seedPlans();
    await createStaff();
    const customer = await createUser();
    const t1 = await openTicket(customer.id, { subject: "Help", category: "general", message: "Hi" });
    expect(t1).toMatchObject({ priority: "normal", source: "web", providerId: null, reference: ticketRef(t1.id) });
    const { user, provider } = await createOwner();
    await subscribe(provider.id, plans.business.id);
    const t2 = await openTicket(user.id, { subject: "Billing", category: "billing", message: "Hi", attachments: ["a"] });
    expect(t2).toMatchObject({ priority: "high", source: "provider_app", providerId: provider.id });
    const other = await createOwner();
    expect((await openTicket(other.user.id, { subject: "x", category: "general", message: "y" })).priority).toBe("normal");
    await settle();
    expect(await prisma.notification.count({ where: { type: "support" } })).toBe(3);
  });
});

describe("geocode", () => {
  const row = { lat: "19.0761234", lon: "72.8777", name: "Andheri", display_name: "Andheri, Mumbai", address: { city: "Mumbai", state: "Maharashtra", postcode: "400053" } };

  it("searches places through the throttled, cached geocoder", async () => {
    expect(await searchPlaces("ab")).toEqual([]);
    const fetch = mockFetch(json([
      row,
      { lat: "x", lon: "1", display_name: "bad" },
      { lat: "1", lon: "2", display_name: "town", address: { town: "Karjat" } },
      { lat: "1", lon: "2", display_name: "state only", name: "Somewhere", address: { state: "Goa" } },
      { lat: "1", lon: "2", display_name: "nothing" },
      { lat: "1", lon: "2", display_name: "road", address: { road: "MG Road", village: "V" } },
    ]));
    const places = await searchPlaces("  Andheri   East ");
    expect(places).toEqual([
      { name: "Andheri", city: "Mumbai", state: "Maharashtra", label: "Andheri, Mumbai", latitude: 19.076123, longitude: 72.8777, pincode: "400053" },
      { name: "Karjat", city: "Karjat", state: "", label: "Karjat", latitude: 1, longitude: 2, pincode: null },
      { name: "Somewhere", city: "", state: "Goa", label: "Somewhere, Goa", latitude: 1, longitude: 2, pincode: null },
      { name: "MG Road", city: "V", state: "", label: "MG Road, V", latitude: 1, longitude: 2, pincode: null },
    ]);
    expect(String(fetch.mock.calls[0]![0])).toContain("countrycodes=in");
    // Cached: no second request.
    expect(await searchPlaces("andheri east")).toHaveLength(4);
    expect(fetch).toHaveBeenCalledTimes(1);
    // Stale cache entries are refreshed; a second request waits for the throttle gap.
    await prisma.geocodeCache.updateMany({ data: { createdAt: new Date(0) } });
    const saved = env.geocoder.country;
    env.geocoder.country = "";
    expect(await searchPlaces("andheri east")).toHaveLength(4);
    expect(await searchPlaces("somewhere else")).toHaveLength(4);
    env.geocoder.country = saved;
    expect(String(fetch.mock.calls[1]![0])).not.toContain("countrycodes");
    // The stale "search:in:" entry is left; the blank-country searches were stored under new keys.
    expect(await purgeGeocodeCache()).toBe(1);
    await prisma.geocodeCache.updateMany({ data: { createdAt: new Date(0) } });
    expect(await purgeGeocodeCache()).toBe(2);
  }, 30_000);
  it("reverse geocodes and degrades to empty answers", async () => {
    mockFetch(json(row), json({ error: "Unable to geocode" }), json({}, 503));
    expect(await reversePlace(19.0761, 72.8777)).toMatchObject({ name: "Andheri" });
    expect(await reversePlace(10, 10)).toBeNull();
    expect(await reversePlace(11, 11)).toBeNull();
    expect(console.warn).toHaveBeenCalledWith("[geocode] reverse failed", "Geocoder answered 503");
    expect(await searchPlaces("some town")).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith("[geocode] search failed", "Geocoder answered 503");
    vi.spyOn(prisma.geocodeCache, "upsert").mockRejectedValueOnce(new Error("db"));
    mockFetch(json([row]));
    expect(await searchPlaces("cache write fails")).toHaveLength(1);
    env.geocoder.enabled = false;
    expect(await searchPlaces("anything")).toEqual([]);
    expect(await reversePlace(1, 1)).toBeNull();
    env.geocoder.enabled = true;
  }, 30_000);
});

describe("search", () => {
  async function directory() {
    const plans = await seedPlans();
    const cat = await createCategory({ name: "Appliance Repair", slug: "appliance-repair" }, ["TV Repair", "Washing Machine Repair"]);
    const plumbing = await createCategory({ name: "Plumbing", slug: "plumbing" }, ["Pipe Fitting"]);
    const [tv, wm] = cat.subcategories;
    const near = await createProvider({ businessName: "Sharma Electronics", categoryId: cat.id, subcategoryId: tv!.id, rankingScore: 50, avgRating: 4.5, totalReviews: 10, verificationStatus: "verified", locality: "Andheri" });
    const far = await createProvider({ businessName: "Pune Fixers", latitude: 18.52, longitude: 73.85, city: "Pune", categoryId: cat.id, subcategoryId: wm!.id, rankingScore: 80, avgRating: 3, totalReviews: 50, serviceRadiusKm: 200 });
    const plumber = await createProvider({ businessName: "Quick Pipes", description: "Leak and tap fixes", categoryId: plumbing.id, rankingScore: 10, isAvailable: false });
    await createProvider({ businessName: "Hidden", status: "pending", categoryId: cat.id });
    await prisma.providerServiceArea.create({ data: { providerId: plumber.id, areaName: "Bandra West", latitude: 19.06, longitude: 72.83 } });
    await prisma.providerBusinessHour.create({ data: { providerId: near.id, dayOfWeek: 0, is24x7: true } });
    await subscribe(near.id, plans.pro.id);
    return { cat, plumbing, tv: tv!, near, far, plumber };
  }
  const base = { sort: "relevance" as const, page: 1, pageSize: 10 };

  it("resolves free text to a category or subcategory", async () => {
    const { cat, tv, plumbing } = await directory();
    expect(await resolveTerm("   ")).toEqual({ category: null, subcategory: null });
    expect(await resolveTerm("tv repair near me")).toMatchObject({ category: { id: cat.id }, subcategory: { id: tv.id } });
    expect(await resolveTerm("plumbing")).toMatchObject({ category: { id: plumbing.id }, subcategory: null });
    expect(await resolveTerm("zzzzqqq")).toEqual({ category: null, subcategory: null });
  });

  it("filters by category, text, place and flags", async () => {
    const { cat, tv, near, far, plumber } = await directory();
    const user = await createUser();
    await prisma.favorite.create({ data: { userId: user.id, providerId: near.id } });
    const sponsored = await prisma.sponsoredListing.create({ data: { providerId: near.id, categoryId: cat.id, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000), budget: 500 } });

    const all = await searchProviders({ ...base, userId: user.id });
    expect(all.total).toBe(3);
    expect(all.radiusKm).toBe(15);
    expect(all.results[0]).toMatchObject({ id: far.id });

    const bySub = await searchProviders({ ...base, subcategory: tv.slug, userId: user.id });
    expect(bySub.results.map((r) => r.id)).toEqual([near.id]);
    expect(bySub.results[0]).toMatchObject({ isFavorite: true, isSponsored: true });
    expect(bySub.resolved.subcategory).toMatchObject({ slug: tv.slug });
    await settle();
    expect((await prisma.sponsoredListing.findUniqueOrThrow({ where: { id: sponsored.id } })).impressions).toBe(1);
    expect((await prisma.providerDailyStat.findFirstOrThrow({ where: { providerId: near.id } })).searchImpressions).toBeGreaterThan(0);

    expect((await searchProviders({ ...base, subcategory: "missing" })).total).toBe(3);
    expect((await searchProviders({ ...base, category: "missing" })).total).toBe(3);
    const byCat = await searchProviders({ ...base, category: cat.slug, q: "sharma" });
    expect(byCat.results.map((r) => r.id)).toEqual([near.id]);
    expect((await searchProviders({ ...base, q: "tv repair" })).results.map((r) => r.id)).toEqual([near.id]);
    expect((await searchProviders({ ...base, q: "leak" })).results.map((r) => r.id)).toEqual([plumber.id]);

    const mumbai = { lat: 19.076, lng: 72.8777 };
    const nearby = await searchProviders({ ...base, ...mumbai, sort: "distance" });
    // Pune is 120 km away: beyond the 100 km reach even though it travels 200 km.
    expect(nearby.results.map((r) => r.id)).toEqual([near.id, plumber.id]);
    expect(nearby.results[0]!.distanceKm).toBe(0);
    const tight = await searchProviders({ ...base, lat: 19.2, lng: 72.95, radiusKm: 1 });
    expect(tight.total).toBe(0);
    const area = await searchProviders({ ...base, lat: 19.061, lng: 72.831, radiusKm: 1 });
    expect(area.results.map((r) => r.id)).toEqual([plumber.id]);
    const travels = await searchProviders({ ...base, lat: 18.9, lng: 73.5 });
    expect(travels.results.map((r) => r.id)).toContain(far.id);

    expect((await searchProviders({ ...base, city: "pune" })).results.map((r) => r.id)).toEqual([far.id]);
    expect((await searchProviders({ ...base, area: "bandra" })).results.map((r) => r.id)).toEqual([plumber.id]);
    expect((await searchProviders({ ...base, area: "andheri" })).results.map((r) => r.id)).toEqual([near.id]);
    expect((await searchProviders({ ...base, minRating: 4 })).results.map((r) => r.id)).toEqual([near.id]);
    expect((await searchProviders({ ...base, verified: true })).results.map((r) => r.id)).toEqual([near.id]);
    expect((await searchProviders({ ...base, openNow: true })).results.map((r) => r.id)).toEqual([near.id]);
    expect((await searchProviders({ ...base, sort: "rating" })).results[0]!.id).toBe(near.id);
    expect((await searchProviders({ ...base, sort: "reviews" })).results[0]!.id).toBe(far.id);
    expect((await searchProviders({ ...base, sort: "distance" })).results[0]!.id).toBe(far.id);
    expect((await searchProviders({ ...base, page: 2, pageSize: 2 })).results).toHaveLength(1);
    expect((await searchProviders({ ...base, q: "zzzz qqq" })).total).toBe(0);
  });

  it("skips rows deleted between the id query and the load, and logs failed stats", async () => {
    const { near } = await directory();
    const find = vi.spyOn(prisma.provider, "findMany").mockResolvedValueOnce([]);
    expect((await searchProviders(base)).results).toEqual([]);
    find.mockRestore();
    vi.spyOn(prisma, "$executeRaw").mockRejectedValue(new Error("stats down"));
    await searchProviders(base);
    await recordProfileView(near.id);
    await settle();
    expect(console.warn).toHaveBeenCalledWith("Failed to record impressions", expect.any(Error));
    expect(console.warn).toHaveBeenCalledWith("Failed to record profile view", expect.any(Error));
  });
  it("counts profile views", async () => {
    const p = await createProvider();
    await recordProfileView(p.id);
    await recordProfileView(p.id);
    expect((await prisma.providerDailyStat.findFirstOrThrow()).profileViews).toBe(2);
  });
  it("has a lead helper", async () => {
    const p = await createProvider();
    expect((await createLead(p.id)).channel).toBe("call");
  });
});
