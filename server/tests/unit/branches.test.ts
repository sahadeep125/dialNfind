/**
 * The defensive branches: fallbacks for rows or values that the database schema says cannot be missing,
 * logging setups other than the test one, and failures of fire-and-forget work. Each is reached with a
 * crafted input or a one-off spy.
 */
import { describe, expect, it, vi } from "vitest";
import { chmod, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Request, Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { createApp } from "../../src/app.js";
import { localNow } from "../../src/lib/hours.js";
import { guardAdminPath, requirePermission } from "../../src/lib/permissions.js";
import { currentUser, requireRole } from "../../src/middleware/auth.js";
import { errorHandler } from "../../src/middleware/error.js";
import { uploadDir } from "../../src/storage/index.js";
import { sweepOrphanFiles } from "../../src/jobs/orphan-files.js";
import { toProviderCard, providerCardInclude } from "../../src/services/presenter.js";
import { listingProfileSchema } from "../../src/services/listings.js";
import { newListingSchema } from "../../src/services/listings.js";
import { serviceAreaSchema } from "../../src/routes/provider/shared.js";
import { activateSponsoredOrder } from "../../src/services/sponsored-orders.js";
import { issueInvoice, renderInvoicePdf } from "../../src/services/invoices.js";
import { applySubscriptionChange, leadsThisMonth } from "../../src/services/entitlements.js";
import { searchProviders } from "../../src/services/search.js";
import { syncRazorpaySubscription } from "../../src/services/billing-sync.js";
import { externalSubscriptionUrl } from "../../src/routes/admin/records.js";
import { adminTeamRouter } from "../../src/routes/admin/team.js";
import supertest from "supertest";
import { api, authed, json, mockFetch, settle } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createStaff, createUser, seedPlans, subscribe } from "../helpers/factories.js";
import { tokenFor } from "../helpers/app.js";

const res = () => {
  const r = { status: vi.fn(), json: vi.fn() };
  r.status.mockReturnValue(r);
  return r as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
};

/** Calls one route's final handler directly, for branches the middleware in front of it never lets through. */
async function callRoute(router: Router, method: string, routePath: string, req: Partial<Request>) {
  const layer = router.stack.find((l) => l.route?.path === routePath && (l.route as unknown as { methods: Record<string, boolean> }).methods[method]);
  const r = res();
  const stack = layer!.route!.stack;
  await stack[stack.length - 1]!.handle(req as Request, r, () => undefined);
  return r;
}

/** Stubs one raw query (matched on its SQL) and passes every other one through. */
function stubRawQuery(match: string, rows: unknown[]) {
  const original = prisma.$queryRaw.bind(prisma);
  return vi.spyOn(prisma, "$queryRaw").mockImplementation(((strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.join("?").includes(match) ? Promise.resolve(rows) : original(strings, ...values)) as never);
}

describe("app logging", () => {
  it("logs one line per request in production and dev format elsewhere", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const saved = env.nodeEnv;
    try {
      env.nodeEnv = "production";
      await supertest(createApp()).get("/api/v1/health?secret=1");
      env.nodeEnv = "development";
      await supertest(createApp()).get("/api/v1/health");
    } finally {
      env.nodeEnv = saved;
    }
    const lines = write.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes('"GET /api/v1/health HTTP/1.1" 200') && !l.includes("secret"))).toBe(true);
    expect(lines.some((l) => l.includes("GET /api/v1/health"))).toBe(true);
  });
  it("turns on query logging with PRISMA_LOG=1", async () => {
    process.env.PRISMA_LOG = "1";
    vi.resetModules();
    try {
      const mod = await import("../../src/lib/prisma.js");
      expect(mod.prisma).toBeDefined();
    } finally {
      process.env.PRISMA_LOG = "";
      vi.resetModules();
    }
  });
});

describe("middleware and guards", () => {
  it("requireRole checks sign-in, role and confirmation", async () => {
    const customer = await createUser();
    const unconfirmed = await createUser({ verified: false, role: "provider" });
    const call = async (token: string | null, roles: Parameters<typeof requireRole>) => {
      const req = { headers: { authorization: token ? `Bearer ${token}` : undefined } } as unknown as Request;
      const next = vi.fn();
      await requireRole(...roles)(req, res(), next);
      return next;
    };
    await expect(call(null, ["customer"])).rejects.toMatchObject({ status: 401 });
    await expect(call(await tokenFor(customer), ["provider"])).rejects.toMatchObject({ status: 403 });
    await expect(call(await tokenFor(unconfirmed), ["provider"])).rejects.toMatchObject({ code: "email_unverified" });
    expect(await call(await tokenFor(customer), ["customer"])).toHaveBeenCalled();
    expect(() => currentUser({} as Request)).toThrow("Authentication required");
  });
  it("requirePermission reuses loaded permissions and guardAdminPath tolerates an empty path", async () => {
    const next = vi.fn();
    await requirePermission("users")({ permissions: new Set(["users"]) } as unknown as Request, res(), next);
    expect(next).toHaveBeenCalled();
    guardAdminPath({ path: "" } as Request, res(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
  it("errorHandler answers 500 for other Prisma errors", () => {
    const r = res();
    errorHandler(new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "x" }), {} as Request, r, () => undefined);
    expect(r.status).toHaveBeenCalledWith(500);
  });
  it("admin /me lists no permissions when none were loaded", async () => {
    const staff = await createStaff();
    const r = await callRoute(adminTeamRouter, "get", "/me", { user: { id: staff.id, role: staff.role, sessionId: "x", emailVerified: true } } as Partial<Request>);
    expect(r.json.mock.calls[0]![0].permissions).toEqual([]);
  });
});

describe("oauth", () => {
  it("reports an empty audience when a verified token names none", async () => {
    vi.resetModules();
    vi.doMock("jose", async (orig) => ({ ...(await orig<typeof import("jose")>()), jwtVerify: vi.fn(async () => ({ payload: { sub: "g-9" } })) }));
    try {
      const oauth = await import("../../src/lib/oauth.js");
      expect((await oauth.verifyGoogleIdToken("token")).audience).toBe("");
    } finally {
      vi.doUnmock("jose");
      vi.resetModules();
    }
  });
});

describe("hours", () => {
  it("copes with a 24 o'clock hour and missing parts", () => {
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, "formatToParts").mockReturnValueOnce([
      { type: "weekday", value: "Mon" }, { type: "hour", value: "24" }, { type: "minute", value: "05" },
    ]);
    expect(localNow()).toEqual({ day: 1, time: "00:05" });
    spy.mockReturnValueOnce([]);
    expect(localNow()).toEqual({ day: -1, time: ":" });
  });
});

describe("orphan sweep file errors", () => {
  it("treats a missing folder as empty and skips files it cannot delete", async () => {
    await rm(uploadDir, { recursive: true, force: true });
    expect(await sweepOrphanFiles()).toMatch(/^0 orphan files/);
    const dir = path.join(uploadDir, "locked");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "old.webp");
    await writeFile(file, "x");
    const old = new Date(Date.now() - 72 * 3600 * 1000);
    await utimes(file, old, old);
    await chmod(dir, 0o500);
    try {
      expect(await sweepOrphanFiles()).toMatch(/^1 orphan files .* removed$/);
    } finally {
      await chmod(dir, 0o700);
    }
  });
});

describe("schema fallbacks", () => {
  it("normalises blank pincodes to null", () => {
    expect(listingProfileSchema.shape.pincode.parse("")).toBeNull();
    expect(listingProfileSchema.shape.pincode.parse(null)).toBeNull();
    expect(listingProfileSchema.shape.pincode.parse("400001")).toBe("400001");
    expect(serviceAreaSchema.parse({ areaName: "Andheri", pincode: null }).pincode).toBeNull();
  });
  it("presents a card with no rating yet", async () => {
    const p = await createProvider();
    const loaded = await prisma.provider.findUniqueOrThrow({ where: { id: p.id }, include: providerCardInclude });
    expect(toProviderCard({ ...loaded, avgRating: null as never }).avgRating).toBe(0);
  });
  it("links subscriptions only for known sources", () => {
    expect(externalSubscriptionUrl({ source: "admin", externalId: "x" })).toBeNull();
  });
});

describe("service fallbacks", () => {
  it("activates an order and invoices a payment without an amount", async () => {
    const cat = await createCategory();
    const p = await createProvider();
    const order = await prisma.sponsoredOrder.create({ data: { providerId: p.id, categoryId: cat.id, days: 1, budget: 1, amount: 1, razorpayOrderId: "o" } });
    await activateSponsoredOrder({ ...order, amount: null as never }, "pay");
    const txn = await prisma.transaction.findFirstOrThrow();
    expect(Number(txn.amount)).toBe(0);
    await prisma.invoice.deleteMany();
    const find = prisma.transaction.findUnique.bind(prisma.transaction);
    vi.spyOn(prisma.transaction, "findUnique").mockImplementationOnce((async (args: never) => ({ ...(await find(args)), amount: null })) as never);
    expect(Number((await issueInvoice(txn.id, { email: false }))!.total)).toBe(0);
  });
  it("renders an invoice with missing tax amounts", async () => {
    const p = await createProvider();
    const txn = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", amount: 10, status: "success" } });
    const inv = (await issueInvoice(txn.id, { email: false }))!;
    expect((await renderInvoicePdf({ ...inv, igst: null, cgst: null, sgst: null } as never)).length).toBeGreaterThan(100);
  });
  it("names plans that are no longer in the table", async () => {
    await seedPlans();
    const { provider } = await createOwner();
    const change = { providerId: provider.id, billingCycle: "monthly" as const, source: "admin" as const, status: "active" as const, periodEnd: null, autoRenew: true };
    vi.spyOn(prisma.subscriptionPlan, "findMany").mockResolvedValue([]);
    await applySubscriptionChange({ ...change, planCode: "pro" });
    await applySubscriptionChange({ ...change, planCode: "free", status: "expired" });
    await settle();
    const titles = (await prisma.notification.findMany({ orderBy: { id: "asc" } })).map((n) => n.title);
    expect(titles).toEqual(["You are now on the pro plan", "Your paid plan has ended"]);
  });
  it("counts zero leads when the count query returns no row", async () => {
    stubRawQuery("COUNT(*)::bigint AS count FROM leads", []);
    expect(await leadsThisMonth(1n)).toBe(0);
  });
  it("search survives an empty count and a failed impression update", async () => {
    const cat = await createCategory({ slug: "c" });
    const p = await createProvider({ categoryId: cat.id });
    await prisma.sponsoredListing.create({ data: { providerId: p.id, categoryId: cat.id, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000), budget: 1 } });
    vi.spyOn(prisma.sponsoredListing, "updateMany").mockImplementationOnce((() => Promise.reject(new Error("db"))) as never);
    stubRawQuery("SELECT COUNT(*)::bigint AS count FROM providers", []);
    const result = await searchProviders({ category: "c", sort: "relevance", page: 1, pageSize: 5 });
    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(1);
    await settle();
  });
  it("syncs Razorpay events for subscriptions it has not stored", async () => {
    await seedPlans();
    const p = await createProvider();
    const sub = { id: "sub_new", plan_id: "plan_pro_m", current_start: null, current_end: null, ended_at: null, charge_at: null, paid_count: 0, notes: { providerId: String(p.id) } };
    // Created, with a captured payment already: recorded against no subscription.
    expect(await syncRazorpaySubscription({ ...sub, status: "created" }, { id: "pay_x", amount: 100, currency: "INR", status: "captured" })).toBeNull();
    expect((await prisma.transaction.findFirstOrThrow()).subscriptionId).toBeNull();
    expect(await syncRazorpaySubscription({ ...sub, id: "sub_p", status: "pending" })).toMatchObject({ status: "past_due", autoRenew: true });
  });
});

describe("route fallbacks", () => {
  it("leads: a failing promotion charge does not fail the contact", async () => {
    const cat = await createCategory({ slug: "c" });
    const p = await createProvider();
    vi.spyOn(prisma.sponsoredListing, "findFirst").mockRejectedValueOnce(new Error("db"));
    expect((await api().post("/api/v1/leads").send({ providerId: Number(p.id), channel: "call", categorySlug: "c" })).status).toBe(201);
    await settle();
    expect(cat.id).toBeDefined();
  });
  it("me: paged favorites with no count", async () => {
    const c = await authed(await createUser());
    vi.spyOn(prisma.favorite, "count").mockResolvedValueOnce(null as never);
    expect((await c.get("/api/v1/me/favorites").query({ page: 1 })).body.total).toBe(0);
  });
  it("providers: services without details and similar providers without coordinates", async () => {
    const cat = await createCategory();
    const p = await createProvider({ slug: "plain", categoryId: cat.id });
    expect((await api().get("/api/v1/providers/plain")).body.provider.services[0].details).toEqual([]);
    const find = prisma.provider.findUniqueOrThrow.bind(prisma.provider);
    vi.spyOn(prisma.provider, "findUniqueOrThrow").mockImplementationOnce((async (args: never) => ({ ...(await find(args)), latitude: null, longitude: null })) as never);
    expect((await api().get("/api/v1/providers/plain/similar")).status).toBe(200);
    expect(p.id).toBeDefined();
  });
  it("reviews: highlights skip reviews without text", async () => {
    const p = await createProvider();
    const r = await createReview(p.id, (await createUser()).id, { reviewText: "x".repeat(50) });
    const find = prisma.review.findMany.bind(prisma.review);
    vi.spyOn(prisma.review, "findMany").mockImplementationOnce((async (args: never) => (await find(args)).map((x) => ({ ...x, reviewText: null }))) as never);
    expect((await api().get("/api/v1/reviews/highlights")).body.reviews).toEqual([]);
    expect(r.id).toBeDefined();
  });
  it("webhooks: a subscription event with nothing stored reports no provider", async () => {
    await seedPlans();
    const p = await createProvider();
    const crypto = await import("node:crypto");
    const raw = JSON.stringify({ event: "subscription.authenticated", payload: { subscription: { entity: { id: "sub_q", plan_id: "plan_pro_m", status: "authenticated", notes: { providerId: String(p.id) } } } } });
    const sig = crypto.createHmac("sha256", env.razorpay.webhookSecret).update(raw).digest("hex");
    await api().post("/api/v1/webhooks/razorpay").set("content-type", "application/json").set("x-razorpay-signature", sig).set("x-razorpay-event-id", "q").send(raw);
    expect((await prisma.webhookEvent.findFirstOrThrow()).providerId).toBeNull();
  });
  it("admin: plan edits without a badge, attribute edits without a subcategory, and empty revenue", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff());
    expect((await c.patch(`/api/v1/admin/plans/${plans.pro.id}`).send({ name: "Pro+" })).body.plan.badgeId).toBe(Number(plans.badges.pro.id));
    const cat = await createCategory();
    const attr = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "A", fieldType: "text" } });
    expect((await c.patch(`/api/v1/categories/attributes/${attr.id}`).send({ label: "B" })).body.attribute.label).toBe("B");
    expect((await c.get("/api/v1/admin/transactions").query({ providerId: 999 })).body.revenue).toBe(0);
  });
  it("admin: granting Free with a payment records it without a subscription", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff());
    const p = await createProvider({ state: "Goa" });
    const res = await c.post(`/api/v1/admin/providers/${p.id}/subscription`).send({ planId: Number(plans.free.id), months: 1, payment: { amount: 10, reference: "CASH1" } });
    expect(res.body.subscription).toBeNull();
    expect((await prisma.transaction.findFirstOrThrow()).subscriptionId).toBeNull();
  });
  it("admin billing: overview and sync with missing amounts", async () => {
    await seedPlans();
    const c = await authed(await createStaff());
    const p = await createProvider();
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "pro" } });
    await subscribe(p.id, plan.id, { source: "razorpay" });
    const findLive = prisma.providerSubscription.findMany.bind(prisma.providerSubscription);
    vi.spyOn(prisma.providerSubscription, "findMany").mockImplementationOnce((async (args: never) => (await findLive(args)).map((s) => ({ ...s, planId: 999n, plan: { code: "x", name: "X", price: null } }))) as never);
    vi.spyOn(prisma.transaction, "groupBy").mockResolvedValueOnce([{ gateway: "manual", _sum: { amount: null }, _count: 1 }] as never);
    const overview = await c.get("/api/v1/admin/billing/overview");
    expect(overview.body).toMatchObject({ mrr: 0, revenue30: [{ gateway: "manual", amount: 0, count: 1 }] });
    const findPrices = prisma.planPrice.findMany.bind(prisma.planPrice);
    vi.spyOn(prisma.planPrice, "findMany").mockImplementationOnce((async (args: never) => (await findPrices(args)).slice(0, 1).map((x) => ({ ...x, amount: null }))) as never);
    await prisma.planPrice.updateMany({ data: { razorpayPlanId: null } });
    const fetch = mockFetch(json({ id: "plan_zero" }));
    await c.post("/api/v1/admin/plans/sync-razorpay");
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body)).item.amount).toBe(0);
  });
  it("admin import: short rows, rowless errors and skipped rows on a real run", async () => {
    const c = await authed(await createStaff());
    await createCategory({ name: "Plumbing", slug: "plumbing" });
    const csv = ["business_name,phone,category,city,state,latitude,longitude", "Short Row,9876543210,plumbing,Mumbai", "Good One,9876543211,plumbing,Mumbai,Maharashtra,19,72", "Bad,1,plumbing,Mumbai,Maharashtra,19,72"].join("\n");
    mockFetch(json([]));
    const real = await c.post("/api/v1/admin/providers/import").send({ csv, dryRun: false });
    expect(real.body).toMatchObject({ total: 3, created: 1 });
    vi.spyOn(newListingSchema, "safeParse").mockReturnValueOnce({ success: false, error: { issues: [{ path: [], message: "Broken row" }] } } as never);
    const dry = await c.post("/api/v1/admin/providers/import").send({ csv: ["business_name,phone,category,city,state,latitude,longitude", "X Y,9876543299,plumbing,Pune,Maharashtra,18,73"].join("\n") });
    expect(dry.body.rows[0].errors).toEqual(["row: Broken row"]);
  });
  it("provider portal: dashboard ranking fallback, leads without plans, notes untouched", async () => {
    const plans = await seedPlans();
    const { user, provider } = await createOwner();
    await subscribe(provider.id, plans.pro.id);
    const c = await authed(user);
    stubRawQuery("WITH mine AS", []);
    expect((await c.get("/api/v1/provider/dashboard")).body.ranking).toEqual({ position: 1, outOf: 1 });
    vi.restoreAllMocks();
    const lead = await createLead(provider.id, { providerNote: "keep" });
    expect((await c.patch(`/api/v1/provider/leads/${lead.id}`).send({ status: "won" })).body.lead).toMatchObject({ providerStatus: "won", providerNote: "keep" });
    await prisma.providerSubscription.deleteMany();
    await prisma.planPrice.deleteMany();
    await prisma.subscriptionPlan.deleteMany();
    expect((await c.get("/api/v1/provider/leads")).body.leadLimit).toBeNull();
  });
  it("provider portal: payments without invoices and service details for a service without a subcategory", async () => {
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id });
    await prisma.categoryAttribute.create({ data: { categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id, appliesTo: "provider", label: "Size", fieldType: "number" } });
    await prisma.transaction.create({ data: { providerId: provider.id, type: "subscription", amount: 1, status: "failed" } });
    const c = await authed(user);
    expect((await c.get("/api/v1/provider/billing")).body.transactions[0].invoiceNumber).toBeNull();
    const find = prisma.providerService.findMany.bind(prisma.providerService);
    vi.spyOn(prisma.providerService, "findMany").mockImplementationOnce((async (args: never) => (await find(args)).map((s) => ({ ...s, subcategory: null }))) as never);
    expect((await c.get("/api/v1/provider/attributes")).body.groups[0].title).toBe(cat.name);
  });
});
