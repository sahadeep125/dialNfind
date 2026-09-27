import { describe, expect, it, vi } from "vitest";
import { writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { uploadDir } from "../../src/storage/index.js";
import { issueInvoice } from "../../src/services/invoices.js";
import { externalSubscriptionUrl } from "../../src/routes/admin/records.js";
import { authed, json, mockFetch, sentMails, settle } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createStaff, createUser, seedPlans, subscribe } from "../helpers/factories.js";

const DAY = 24 * 60 * 60 * 1000;
const pub = (key: string) => `${env.publicUrl}/uploads/${key}`;

describe("admin providers", () => {
  it("lists and filters listings", async () => {
    const c = await authed(await createStaff(["providers"]));
    const cat = await createCategory({ name: "Plumbing" });
    await createProvider({ businessName: "Alpha Pipes", city: "Pune", categoryId: cat.id, verificationStatus: "verified" });
    await createOwner({ businessName: "Beta Taps", status: "pending", phone: "+919111111111" });
    const q = (query: Record<string, string>) => c.get("/api/v1/admin/providers").query(query).then((r) => r.body.total);
    expect(await q({})).toBe(2);
    expect(await q({ status: "pending" })).toBe(1);
    expect(await q({ verification: "verified" })).toBe(1);
    expect(await q({ claimed: "yes" })).toBe(1);
    expect(await q({ claimed: "no" })).toBe(1);
    expect(await q({ city: "pune" })).toBe(1);
    expect(await q({ q: "beta" })).toBe(1);
    expect(await q({ q: "9111" })).toBe(1);
  });
  it("changes status singly and in bulk, telling owners", async () => {
    const c = await authed(await createStaff(["providers"]));
    const { user, provider } = await createOwner({ status: "pending" });
    const other = await createProvider({ status: "pending" });
    expect((await c.patch(`/api/v1/admin/providers/${provider.id}`).send({ status: "active", verificationStatus: "partial" })).body.provider).toMatchObject({ status: "active", verificationStatus: "partial" });
    await c.patch(`/api/v1/admin/providers/${provider.id}`).send({ status: "active" });
    await c.patch(`/api/v1/admin/providers/${provider.id}`).send({ verificationStatus: "none" });
    await settle();
    expect(sentMails().filter((m) => m.to === user.email).map((m) => m.subject)).toEqual(["Your listing is live"]);
    expect((await c.patch("/api/v1/admin/providers/999").send({ status: "active" })).status).toBe(404);
    for (const action of ["suspend", "reject", "approve", "verify"]) {
      expect((await c.post("/api/v1/admin/providers/bulk").send({ ids: [Number(provider.id), Number(other.id), 999, Number(other.id)], action })).body).toEqual({ updated: 2 });
    }
    await settle();
    expect(sentMails().map((m) => m.subject)).toEqual(expect.arrayContaining(["Your listing is suspended", "Your listing was not approved"]));
  });
  it("creates listings and edits every part of them", async () => {
    const c = await authed(await createStaff(["providers"]));
    const cat = await createCategory();
    const created = await c.post("/api/v1/admin/providers").send({ businessName: "Gamma Fix", phone: "9876543210", city: "Delhi", state: "Delhi", latitude: 28.6, longitude: 77.2, services: [{ categoryId: Number(cat.id) }] });
    expect(created.status).toBe(201);
    expect(created.body.provider.status).toBe("active");
    const id = created.body.provider.id;
    expect((await c.post("/api/v1/admin/providers").send({ businessName: "Delta", phone: "9876543211", city: "Delhi", state: "Delhi", latitude: 1, longitude: 1, services: [{ categoryId: Number(cat.id) }], status: "pending" })).body.provider.status).toBe("pending");
    expect((await c.get(`/api/v1/admin/providers/${id}/profile`)).body.provider.businessName).toBe("Gamma Fix");
    expect((await c.patch(`/api/v1/admin/providers/${id}/profile`).send({ description: "Now with a description" })).body.provider.description).toBe("Now with a description");
    expect((await c.put(`/api/v1/admin/providers/${id}/hours`).send({ hours: [{ dayOfWeek: 0, openTime: null, closeTime: null, is24x7: true }] })).body.provider.businessHours).toHaveLength(1);
    expect((await c.put(`/api/v1/admin/providers/${id}/services`).send({ services: [{ categoryId: Number(cat.id), subcategoryId: Number(cat.subcategories[0]!.id) }] })).body.provider.services).toHaveLength(1);
    expect((await c.put(`/api/v1/admin/providers/${id}/service-areas`).send({ serviceAreas: [{ areaName: "Saket" }] })).body.provider.serviceAreas).toHaveLength(1);
    expect((await c.get("/api/v1/admin/providers/999/profile")).status).toBe(404);
  });
  it("gives and takes away ownership", async () => {
    const c = await authed(await createStaff(["providers"]));
    const listing = await createProvider({ businessName: "Omega" });
    await createUser({ email: "new@example.com" });
    const owner = await createOwner({ businessName: "Other Biz" }, { email: "busy@example.com" });
    await createUser({ email: "off@example.com", status: "suspended" });
    await createStaff("super", { email: "staff@example.com" });
    const give = (email: string, id = listing.id) => c.post(`/api/v1/admin/providers/${id}/owner`).send({ email });
    expect((await give("nobody@example.com")).status).toBe(404);
    expect((await give("off@example.com")).status).toBe(404);
    expect((await give("staff@example.com")).body.error.message).toBe("Team accounts cannot own a listing");
    expect((await give("busy@example.com")).body.error.message).toBe("This account already manages Other Biz");
    expect((await give("new@example.com")).body).toEqual({ ok: true });
    expect((await give("busy@example.com", owner.provider.id)).body).toEqual({ ok: true });
    await settle();
    expect(sentMails().map((m) => m.subject)).toEqual(["Omega is now yours", "Other Biz is now yours"]);
    expect((await c.delete(`/api/v1/admin/providers/${listing.id}/owner`)).body).toEqual({ ok: true });
    expect((await c.delete(`/api/v1/admin/providers/${listing.id}/owner`)).body.error.message).toBe("This listing has no owner");
  });
  it("deletes a listing after the name is typed, removing its files", async () => {
    const c = await authed(await createStaff(["providers"]));
    for (const f of ["logo.webp", "p.webp", "r.webp"]) await writeFile(path.join(uploadDir, f), "x");
    const { provider } = await createOwner({ businessName: "Zeta Repairs", logoUrl: pub("logo.webp") });
    await prisma.providerPortfolio.create({ data: { providerId: provider.id, title: "t", imageUrl: pub("p.webp") } });
    await createReview(provider.id, (await createUser()).id, { photos: { create: { photoUrl: pub("r.webp") } } });
    await prisma.verification.create({ data: { providerId: provider.id, type: "business" } });
    await prisma.providerClaim.create({ data: { providerId: provider.id, userId: (await createUser()).id } });
    await createLead(provider.id);
    expect((await c.delete(`/api/v1/admin/providers/${provider.id}`).send({ confirmName: "wrong" })).status).toBe(400);
    expect((await c.delete(`/api/v1/admin/providers/${provider.id}`)).status).toBe(400);
    expect((await c.delete(`/api/v1/admin/providers/${provider.id}`).send({ confirmName: " zeta repairs " })).body).toEqual({ ok: true });
    await settle();
    for (const f of ["logo.webp", "p.webp", "r.webp"]) await expect(stat(path.join(uploadDir, f))).rejects.toThrow();
    const log = await prisma.adminActivityLog.findFirstOrThrow({ where: { action: "provider.delete" } });
    expect(log.detailsJson).toMatchObject({ businessName: "Zeta Repairs", leads: 1, reviews: 1 });
    const unowned = await createProvider({ businessName: "Eta" });
    expect((await c.delete(`/api/v1/admin/providers/${unowned.id}`).send({ confirmName: "Eta" })).status).toBe(200);
  });
  it("imports listings from CSV, dry run first", async () => {
    const c = await authed(await createStaff(["providers"]));
    const cat = await createCategory({ name: "Plumbing", slug: "plumbing" }, ["Pipe Fitting"]);
    await createProvider({ phone: "+919000000001" });
    const header = "Business Name,phone,category,subcategory,city,state,locality,address,pincode,latitude,longitude,whatsapp,email,website,description,service-radius-km";
    const rows = [
      "Aqua Fix,9876543210,plumbing,Pipe Fitting,Mumbai,Maharashtra,Andheri,1 Road,400053,19.1,72.8,,a@b.co,https://a.co,Leaks,5",
      "Dup Phone,9000000001,Plumbing,,Mumbai,Maharashtra,,,,19.1,72.8,,,,,",
      "No Cat,9876543212,Carpentry,,Mumbai,Maharashtra,,,,19.1,72.8,,,,,",
      "Bad Sub,9876543213,plumbing,Roofing,Mumbai,Maharashtra,,,,19.1,72.8,,,,,",
      "Geo,9876543214,plumbing,,Pune,Maharashtra,Kothrud,,,,,,,,,",
      "Lost,9876543215,plumbing,,Nowhere,Nowhere,,,,,,,,,,",
      "X,12,plumbing,,Mumbai,Maharashtra,,,,19.1,72.8,,,,,",
      "Aqua Twin,9876543210,plumbing,,Mumbai,Maharashtra,,,,19.1,72.8,,,,,",
    ];
    mockFetch((url) => (url.includes("Kothrud") ? json([{ lat: "18.5", lon: "73.8", name: "Kothrud", display_name: "Kothrud", address: { city: "Pune" } }]) : json([])));
    const dry = await c.post("/api/v1/admin/providers/import").send({ csv: [header, ...rows].join("\n") });
    expect(dry.body).toMatchObject({ dryRun: true, total: 8, valid: 2, created: 0 });
    const errors = Object.fromEntries(dry.body.rows.map((r: { businessName: string; errors: string[] }) => [r.businessName, r.errors[0] ?? null]));
    expect(errors).toMatchObject({
      "Aqua Fix": null,
      "Dup Phone": "A listing with +919000000001 already exists",
      "No Cat": 'Unknown category "Carpentry"',
      "Bad Sub": '"Roofing" is not a service in Plumbing',
      Geo: null,
      Lost: "Add latitude and longitude; the address could not be found on the map",
      "Aqua Twin": "A listing with +919876543210 already exists",
    });
    expect(errors.X).toMatch(/businessName|phone/);
    expect(dry.body.rows.find((r: { businessName: string }) => r.businessName === "Geo").geocoded).toBe(true);
    expect(await prisma.provider.count()).toBe(1);

    const real = await c.post("/api/v1/admin/providers/import").send({ csv: [header, rows[0]].join("\n"), dryRun: false });
    expect(real.body).toMatchObject({ created: 1, valid: 1 });
    expect(await prisma.provider.count()).toBe(2);
    expect(cat.id).toBeDefined();
  }, 30_000);
  it("rejects unusable import files", async () => {
    const c = await authed(await createStaff(["providers"]));
    const send = (csv: string) => c.post("/api/v1/admin/providers/import").send({ csv });
    expect((await send("\n\n")).body.error.message).toBe("The file is empty");
    expect((await send("business_name,phone\n")).body.error.message).toMatch(/^Missing columns: category, city, state/);
    const big = ["business_name,phone,category,city,state", ...Array.from({ length: 501 }, (_, i) => `B${i},1,c,d,e`)].join("\n");
    expect((await send(big)).body.error.message).toBe("Import at most 500 rows at a time");
    expect((await c.post("/api/v1/admin/providers/import").send({ csv: "" })).status).toBe(400);
  });
});

describe("admin records", () => {
  it("lists leads and decides disputes, refunding promotions", async () => {
    const c = await authed(await createStaff(["leads"]));
    const cat = await createCategory();
    const { user, provider } = await createOwner();
    const listing = await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(), endDate: new Date(Date.now() + 2 * DAY), budget: 10, amountSpent: 10, clicks: 2, status: "completed" } });
    const charged = await createLead(provider.id, { disputeStatus: "open", disputedAt: new Date(), sponsoredListingId: listing.id, sponsoredCharge: 5, channel: "whatsapp" });
    const plain = await createLead(provider.id, { disputeStatus: "open", disputedAt: new Date() });
    await createLead(provider.id, { createdAt: new Date(Date.now() - 40 * DAY) });
    const q = (query: Record<string, string | number>) => c.get("/api/v1/admin/leads").query(query).then((r) => r.body);
    expect((await q({})).openDisputes).toBe(2);
    expect((await q({ dispute: "open" })).total).toBe(2);
    expect((await q({ dispute: "any" })).total).toBe(2);
    expect((await q({ channel: "whatsapp", providerId: Number(provider.id), days: 7 })).total).toBe(1);

    const accepted = await c.patch(`/api/v1/admin/leads/${charged.id}/dispute`).send({ decision: "accepted" });
    expect(accepted.body).toEqual({ ok: true, refund: 5 });
    expect(await prisma.sponsoredListing.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ status: "active", clicks: 1 });
    expect((await c.patch(`/api/v1/admin/leads/${charged.id}/dispute`).send({ decision: "accepted" })).status).toBe(400);
    expect((await c.patch(`/api/v1/admin/leads/${plain.id}/dispute`).send({ decision: "rejected" })).body).toEqual({ ok: true, refund: 0 });
    const noted = await createLead(provider.id, { disputeStatus: "open" });
    await c.patch(`/api/v1/admin/leads/${noted.id}/dispute`).send({ decision: "rejected", note: "Checked the call log" });
    const plainAccept = await createLead(provider.id, { disputeStatus: "open" });
    await c.patch(`/api/v1/admin/leads/${plainAccept.id}/dispute`).send({ decision: "accepted" });
    expect((await c.patch("/api/v1/admin/leads/999/dispute").send({ decision: "accepted" })).status).toBe(404);
    await settle();
    const bodies = (await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } })).map((n) => n.body);
    expect(bodies).toEqual([
      "It no longer counts in your numbers and Rs 5 went back to your promotion budget.",
      "We checked the contact and it looks genuine.",
      "Checked the call log",
      "It no longer counts in your numbers.",
    ]);
  });
  it("moderates reviews singly and in bulk", async () => {
    const c = await authed(await createStaff(["reviews"]));
    const p = await createProvider({ businessName: "Kappa" });
    const r1 = await createReview(p.id, (await createUser()).id, { rating: 1, reviewText: "Terrible service", photos: { create: { photoUrl: "x" } } });
    const r2 = await createReview(p.id, (await createUser()).id, { rating: 5 });
    await prisma.reportFlag.create({ data: { targetType: "review", targetId: r1.id, reason: "abuse" } });
    const list = await c.get("/api/v1/admin/reviews");
    expect(list.body.reviews.find((r: { id: number }) => r.id === Number(r1.id))).toMatchObject({ openReports: 1, photos: ["x"] });
    expect((await c.get("/api/v1/admin/reviews").query({ status: "published", rating: 1, q: "terrible" })).body.total).toBe(1);
    expect((await c.get("/api/v1/admin/reviews").query({ q: "kappa" })).body.total).toBe(2);
    expect((await c.patch(`/api/v1/admin/reviews/${r1.id}`).send({ status: "removed" })).body.review.status).toBe("removed");
    expect(await prisma.reportFlag.count({ where: { status: "open" } })).toBe(0);
    expect((await c.post("/api/v1/admin/reviews/bulk").send({ ids: [Number(r1.id), Number(r2.id), 999, Number(r2.id)], status: "published" })).body).toEqual({ updated: 2 });
  });
  it("lists payments, records offline ones and marks refunds", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["plans"]));
    const p = await createProvider({ state: "Maharashtra" });
    const sub = await subscribe(p.id, plans.pro.id);
    const created = await c.post("/api/v1/admin/transactions").send({ providerId: Number(p.id), type: "subscription", amount: 599, reference: "UPI9", note: "Paid by UPI" });
    expect(created.status).toBe(201);
    expect((await c.post("/api/v1/admin/transactions").send({ providerId: 999, type: "subscription", amount: 1, reference: "abc" })).status).toBe(404);
    const rzp = await prisma.transaction.create({ data: { providerId: p.id, subscriptionId: sub.id, type: "subscription", gateway: "razorpay", amount: 599, status: "success", gatewayPaymentId: "pay_r" } });
    const store = await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", gateway: "play_store", amount: 5, status: "success" } });
    const failed = await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", amount: 5, status: "failed" } });
    const list = await c.get("/api/v1/admin/transactions");
    expect(list.body).toMatchObject({ total: 4, revenue: 1203 });
    expect(list.body.transactions.find((t: { id: number }) => t.id === Number(created.body.transaction.id)).invoice.number).toMatch(/^DNF/);
    expect((await c.get("/api/v1/admin/transactions").query({ status: "success", type: "subscription", gateway: "manual", providerId: Number(p.id) })).body.total).toBe(1);
    // Revenue always sums successful payments, whatever the status filter.
    expect((await c.get("/api/v1/admin/transactions").query({ status: "refunded" })).body).toMatchObject({ total: 0, revenue: 1203 });

    const fetch = mockFetch(json({ id: "rfnd_1", amount: 59900, status: "processed" }));
    expect((await c.patch(`/api/v1/admin/transactions/${rzp.id}`).send({ status: "refunded", note: "Customer asked" })).body.transaction.status).toBe("refunded");
    expect(fetch.mock.calls[0]![0]).toBe("https://api.razorpay.com/v1/payments/pay_r/refund");
    expect((await c.patch(`/api/v1/admin/transactions/${created.body.transaction.id}`).send({ status: "failed", note: "Bounced" })).body.transaction.status).toBe("failed");
    expect((await prisma.invoice.findFirstOrThrow({ where: { transactionId: BigInt(created.body.transaction.id) } })).status).toBe("void");
    expect((await c.patch(`/api/v1/admin/transactions/${store.id}`).send({ status: "refunded", note: "x y z" })).body.error.message).toMatch(/Store purchases/);
    expect((await c.patch(`/api/v1/admin/transactions/${failed.id}`).send({ status: "refunded", note: "x y z" })).body.error.message).toMatch(/Only successful/);
    expect((await c.patch("/api/v1/admin/transactions/999").send({ status: "refunded", note: "x y z" })).status).toBe(404);
    const manual = await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", amount: 5, status: "success" } });
    expect((await c.patch(`/api/v1/admin/transactions/${manual.id}`).send({ status: "refunded", note: "Cash back" })).status).toBe(200);
  });
  it("lists subscriptions with links to the payment provider", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["plans"]));
    const p = await createProvider();
    await subscribe(p.id, plans.pro.id, { source: "razorpay", externalId: "sub_1", billingCycle: "yearly" });
    await subscribe(p.id, plans.business.id, { source: "app_store", externalId: "provider_1", status: "expired" });
    await subscribe(p.id, plans.free.id, { source: "admin", status: "cancelled" });
    const list = await c.get("/api/v1/admin/subscriptions");
    const bySource = Object.fromEntries(list.body.subscriptions.map((s: { source: string; externalUrl: string | null; amount: number }) => [s.source, [s.externalUrl, s.amount]]));
    expect(bySource).toEqual({
      razorpay: ["https://dashboard.razorpay.com/app/subscriptions/sub_1", 5990],
      app_store: ["https://app.revenuecat.com/projects/rc_project/customers/provider_1", 999],
      admin: [null, 0],
    });
    expect((await c.get("/api/v1/admin/subscriptions").query({ status: "expired", planId: Number(plans.business.id), source: "app_store" })).body.total).toBe(1);
    expect(externalSubscriptionUrl({ source: "play_store", externalId: null })).toBeNull();
    expect(externalSubscriptionUrl({ source: "play_store", externalId: "x" })).toContain("/customers/x");
  });
});

describe("admin operations", () => {
  it("builds the overview and analytics", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["analytics"]));
    const cat = await createCategory({ name: "Plumbing" });
    const { provider } = await createOwner({ categoryId: cat.id, city: "Pune" });
    await createProvider({ status: "pending" });
    await createLead(provider.id, { categoryId: cat.id });
    await createLead(provider.id, { channel: "whatsapp" });
    await createReview(provider.id, (await createUser()).id);
    await prisma.transaction.create({ data: { providerId: provider.id, type: "subscription", amount: 599, status: "success" } });
    await subscribe(provider.id, plans.pro.id);
    await prisma.supportTicket.create({ data: { name: "n", email: "e", subject: "s" } });
    const overview = await (await authed(await createStaff())).get("/api/v1/admin/overview");
    expect(overview.body).toMatchObject({ providers: 2, activeProviders: 1, pendingProviders: 1, leads30: 2, reviews30: 1, revenue30: 599, openTickets: 1, activeSubscriptions: 1 });
    expect(overview.body.leadSeries).toHaveLength(14);
    expect(overview.body.leadSeries.at(-1).value).toBe(2);

    const analytics = await c.get("/api/v1/admin/analytics").query({ days: 7 });
    expect(analytics.body.totals).toMatchObject({ leads: 2, reviews: 1, tickets: 1, revenue: 599 });
    expect(analytics.body.leadsByChannel).toHaveLength(2);
    expect(analytics.body.topCategories).toEqual([{ name: "Plumbing", count: 1 }]);
    expect(analytics.body.topCities).toEqual([{ city: "Pune", count: 2 }]);
    expect(analytics.body.topProviders[0]).toMatchObject({ id: Number(provider.id), leads: 2 });
    expect((await c.get("/api/v1/admin/analytics")).body.days).toBe(30);
    expect((await c.get("/api/v1/admin/analytics").query({ days: 8 })).status).toBe(400);
    await prisma.transaction.deleteMany();
    expect((await (await authed(await createStaff())).get("/api/v1/admin/overview")).body.revenue30).toBe(0);
  });
  it("shows a provider's full detail", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["providers"]));
    const { provider } = await createOwner();
    await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_1" });
    const txn = await prisma.transaction.create({ data: { providerId: provider.id, type: "lead_fee", amount: 10, status: "success" } });
    await issueInvoice(txn.id, { email: false });
    await createLead(provider.id);
    const res = await c.get(`/api/v1/admin/providers/${provider.id}`);
    expect(res.body).toMatchObject({ stats: { leads30: 1, leadsAll: 1, openTickets: 0 }, plan: { plan: { code: "pro" } } });
    expect(res.body.provider.subscriptions[0].externalUrl).toContain("sub_1");
    expect(res.body.provider.invoices[0].pdfUrl).toContain("sig=");
    expect(res.body.provider).not.toHaveProperty("location");
    expect((await c.get("/api/v1/admin/providers/999")).status).toBe(404);
  });
  it("grants and revokes plans", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["providers", "plans"]));
    const { provider } = await createOwner({ state: "Maharashtra" });
    const grant = (body: Record<string, unknown>, id = provider.id) => c.post(`/api/v1/admin/providers/${id}/subscription`).send({ planId: Number(plans.pro.id), months: 1, ...body });
    expect((await grant({}, 999n)).status).toBe(404);
    expect((await grant({ planId: 999 })).body.error.message).toBe("Choose an active plan");
    await prisma.subscriptionPlan.update({ where: { id: plans.business.id }, data: { isActive: false } });
    expect((await grant({ planId: Number(plans.business.id) })).body.error.message).toBe("Choose an active plan");
    const granted = await grant({ months: 12, payment: { amount: 5990, reference: "NEFT1" } });
    expect(granted.status).toBe(201);
    expect(granted.body.subscription).toMatchObject({ source: "admin", billingCycle: "yearly", autoRenew: false });
    expect(await prisma.transaction.count()).toBe(1);
    // A running web subscription is cancelled at Razorpay first.
    await prisma.providerSubscription.deleteMany();
    await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_1" });
    const fetch = mockFetch(json({}, 500));
    expect((await grant({})).status).toBe(201);
    expect(fetch.mock.calls[0]![0]).toContain("/subscriptions/sub_1/cancel");
    await prisma.providerSubscription.deleteMany();
    await subscribe(provider.id, plans.pro.id, { source: "play_store" });
    expect((await grant({})).status).toBe(409);

    expect((await c.delete(`/api/v1/admin/providers/${provider.id}/subscription`)).body.error.message).toMatch(/Store subscriptions/);
    await prisma.providerSubscription.deleteMany();
    expect((await c.delete(`/api/v1/admin/providers/${provider.id}/subscription`)).body.error.message).toBe("This provider is already on Free");
    await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_2" });
    mockFetch(json({ id: "sub_2" }));
    expect((await c.delete(`/api/v1/admin/providers/${provider.id}/subscription`).send({ note: "Refunded" })).body).toEqual({ ok: true });
    await subscribe(provider.id, plans.pro.id, { source: "admin" });
    expect((await c.delete(`/api/v1/admin/providers/${provider.id}/subscription`)).body).toEqual({ ok: true });
    await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_3", autoRenew: false });
    const noCancel = mockFetch(json({}));
    expect((await grant({})).status).toBe(201);
    expect(noCancel).not.toHaveBeenCalled();
  });
  it("edits subscriptions within what the source allows", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["plans"]));
    const { provider } = await createOwner();
    const admin = await subscribe(provider.id, plans.pro.id, { source: "admin" });
    const end = new Date(Date.now() + 60 * DAY).toISOString();
    expect((await c.patch(`/api/v1/admin/subscriptions/${admin.id}`).send({ endDate: end, autoRenew: true })).body.subscription.autoRenew).toBe(true);
    expect((await c.patch(`/api/v1/admin/subscriptions/${admin.id}`).send({ status: "active" })).status).toBe(200);
    expect((await c.patch(`/api/v1/admin/subscriptions/${admin.id}`).send({ status: "expired" })).body.subscription.status).toBe("cancelled");
    expect((await c.patch(`/api/v1/admin/subscriptions/${admin.id}`).send({ status: "cancelled" })).status).toBe(200);
    const rzp = await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_1" });
    expect((await c.patch(`/api/v1/admin/subscriptions/${rzp.id}`).send({ endDate: end })).body.error.message).toMatch(/Only cancelling/);
    expect((await c.patch(`/api/v1/admin/subscriptions/${rzp.id}`).send({ autoRenew: false })).status).toBe(400);
    mockFetch(json({ id: "sub_1" }));
    expect((await c.patch(`/api/v1/admin/subscriptions/${rzp.id}`).send({ status: "cancelled" })).body.subscription.status).toBe("cancelled");
    expect((await c.patch(`/api/v1/admin/subscriptions/${rzp.id}`).send({ status: "active" })).status).toBe(400);
    expect((await c.patch("/api/v1/admin/subscriptions/999").send({})).status).toBe(404);
    const pastDue = await subscribe(provider.id, plans.pro.id, { source: "admin", status: "past_due" });
    expect((await c.patch(`/api/v1/admin/subscriptions/${pastDue.id}`).send({ status: "cancelled" })).body.subscription.status).toBe("cancelled");
  });
  it("lists categories with inactive ones and their attribute options", async () => {
    const c = await authed(await createStaff(["categories"]));
    const cat = await createCategory({ isActive: false });
    await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "Device", fieldType: "select", optionsJson: ["TV"] } });
    await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "Note", fieldType: "text" } });
    const res = await c.get("/api/v1/admin/categories");
    expect(res.body.categories[0].attributes.map((a: { options: string[] }) => a.options)).toEqual([["TV"], []]);
  });
  it("previews and sends announcements to an audience", async () => {
    const c = await authed(await createStaff(["notifications"]));
    await createUser();
    await createOwner({ city: "Pune" });
    await createOwner({ city: "Delhi", verificationStatus: "verified" });
    await createUser({ status: "suspended" });
    const preview = (body: Record<string, unknown>) => c.post("/api/v1/admin/notifications/preview").send(body).then((r) => r.body.recipients);
    expect(await preview({ audience: "all" })).toBe(3);
    expect(await preview({ audience: "customers" })).toBe(1);
    expect(await preview({ audience: "providers" })).toBe(2);
    expect(await preview({ audience: "providers", city: "pune" })).toBe(1);
    expect(await preview({ audience: "unverified_providers" })).toBe(1);
    expect(await preview({ audience: "unverified_providers", city: "delhi" })).toBe(0);
    const sent = await c.post("/api/v1/admin/notifications/broadcast").send({ audience: "providers", title: "Hello", body: "New features" });
    expect(sent.body).toEqual({ recipients: 2 });
    expect((await c.post("/api/v1/admin/notifications/broadcast").send({ audience: "unverified_providers", city: "delhi", title: "Hello", body: "New features" })).body.error.message).toBe("No one matches this audience");
    const history = await c.get("/api/v1/admin/notifications/broadcasts");
    expect(history.body.broadcasts[0]).toMatchObject({ title: "Hello", recipients: 2, sentBy: expect.any(String) });
  });
});

describe("admin exports", () => {
  it("streams every export with the list filters", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff());
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id });
    const customer = await createUser();
    await createLead(provider.id, { userId: customer.id, subcategoryId: cat.subcategories[0]!.id, customerReportedResponse: true, disputeStatus: "open" });
    await createLead(provider.id, { categoryId: cat.id, customerReportedResponse: false });
    await createLead(provider.id);
    await createReview(provider.id, customer.id, { reviewText: "=HYPERLINK()" });
    const txn = await prisma.transaction.create({ data: { providerId: provider.id, type: "subscription", amount: 599, status: "success" } });
    await issueInvoice(txn.id, { email: false });
    await prisma.transaction.create({ data: { providerId: provider.id, type: "subscription", amount: 1, status: "failed" } });
    await subscribe(provider.id, plans.pro.id, { endDate: null });
    await createProvider();
    const csv = async (entity: string, query: Record<string, string> = {}) => {
      const res = await c.get(`/api/v1/admin/export/${entity}`).query(query).buffer(true).parse((r, cb) => {
        let data = "";
        r.on("data", (chunk: Buffer) => (data += chunk.toString()));
        r.on("end", () => cb(null, data));
      });
      expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
      return (res.body as string).replace(/^﻿/, "").trim().split("\r\n");
    };
    expect(await csv("providers")).toHaveLength(3);
    expect(await csv("providers", { claimed: "yes" })).toHaveLength(2);
    const users = await csv("users");
    expect(users[0]).toBe("id,name,email,phone,role,status,email_confirmed,business,created,last_sign_in");
    expect(users.some((l) => l.includes(user.email) && l.includes(",yes,"))).toBe(true);
    const leads = await csv("leads");
    expect(leads).toHaveLength(4);
    expect(leads.join("\n")).toContain("Guest");
    expect(leads.join("\n")).toContain(",yes,open");
    expect(leads.join("\n")).toContain(",no,");
    expect((await csv("reviews"))[1]).toContain("'=HYPERLINK()");
    expect(await csv("transactions", { status: "success" })).toHaveLength(2);
    expect(await csv("subscriptions")).toHaveLength(2);
    expect((await csv("invoices"))[1]).toMatch(/^DNF\//);
    expect(await prisma.adminActivityLog.count({ where: { action: "export" } })).toBe(8);

    expect((await c.get("/api/v1/admin/export/nothing")).status).toBe(404);
    const agent = await authed(await createStaff(["support"]));
    expect((await agent.get("/api/v1/admin/export/users")).status).toBe(403);
  });
  it("fetches large exports in batches", async () => {
    const c = await authed(await createStaff());
    await prisma.user.createMany({ data: Array.from({ length: 1001 }, (_, i) => ({ name: `U ${i}`, email: `bulk${i}@example.com` })) });
    const res = await c.get("/api/v1/admin/export/users").buffer(true).parse((r, cb) => {
      let data = "";
      r.on("data", (chunk: Buffer) => (data += chunk.toString()));
      r.on("end", () => cb(null, data));
    });
    expect((res.body as string).trim().split("\r\n")).toHaveLength(1 + 1002);
  }, 30_000);
});

describe("admin billing", () => {
  it("summarises recurring revenue", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["plans"]));
    const [a, b, d, e] = await Promise.all([createProvider(), createProvider(), createProvider(), createProvider()]);
    await subscribe(a.id, plans.pro.id, { source: "razorpay" });
    await subscribe(b.id, plans.pro.id, { source: "app_store", billingCycle: "yearly" });
    await subscribe(d.id, plans.business.id, { source: "admin" });
    await subscribe(e.id, plans.business.id, { source: "play_store", billingCycle: "yearly", status: "past_due" });
    const orphanPlan = await prisma.subscriptionPlan.create({ data: { code: "legacy", name: "Legacy", price: 100 } });
    await subscribe((await createProvider()).id, orphanPlan.id, { source: "razorpay" });
    await subscribe((await createProvider()).id, plans.pro.id, { source: "razorpay", status: "pending" });
    await subscribe((await createProvider()).id, plans.pro.id, { source: "razorpay", status: "cancelled", startDate: new Date(), createdAt: new Date() });
    await prisma.providerSubscription.updateMany({ where: { status: "cancelled" }, data: { cancelledAt: new Date() } });
    await prisma.transaction.create({ data: { providerId: a.id, type: "subscription", gateway: "razorpay", amount: 599, status: "success" } });
    await prisma.webhookEvent.create({ data: { source: "razorpay", eventId: "e", type: "x", payload: {} } });
    const res = await c.get("/api/v1/admin/billing/overview");
    // 599 + 5990/12 + 9990/12 + 100 (legacy monthly price)
    expect(res.body).toMatchObject({ mrr: Math.round(599 + 5990 / 12 + 9990 / 12 + 100), activeSubscriptions: 5, paidSubscriptions: 4, pastDue: 1, pendingCheckouts: 1, churned30: 1, failedWebhooks7d: 1, gateways: { razorpay: true, revenuecat: true } });
    expect(res.body.byPlan).toContainEqual({ label: "Pro", value: 2 });
    expect(res.body.bySource).toContainEqual({ label: "razorpay", value: 2 });
    expect(res.body.revenue30).toEqual([{ gateway: "razorpay", amount: 599, count: 1 }]);
    await prisma.planPrice.deleteMany();
    await prisma.providerSubscription.updateMany({ where: { planId: plans.pro.id, source: "app_store" }, data: { billingCycle: "yearly" } });
    expect((await c.get("/api/v1/admin/billing/overview")).body.mrr).toBeGreaterThan(0);
  });
  it("edits plan prices and syncs them to Razorpay", async () => {
    const plans = await seedPlans();
    const c = await authed(await createStaff(["plans"]));
    const put = (id: bigint, prices: unknown[]) => c.put(`/api/v1/admin/plans/${id}/prices`).send({ prices });
    const res = await put(plans.pro.id, [{ billingCycle: "monthly", amount: 699, iosProductId: "", androidProductId: null }, { billingCycle: "yearly", amount: 5990 }]);
    const byCycle = Object.fromEntries(res.body.prices.map((p: { billingCycle: string }) => [p.billingCycle, p]));
    expect(byCycle.monthly).toMatchObject({ amount: 699, razorpayPlanId: null, iosProductId: null });
    expect(byCycle.yearly.razorpayPlanId).toBe("plan_pro_y");
    expect(Number((await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: plans.pro.id } })).price)).toBe(699);
    const gold = await prisma.subscriptionPlan.create({ data: { code: "gold", name: "Gold", price: 1 } });
    expect((await put(gold.id, [{ billingCycle: "yearly", amount: 100 }])).body.prices).toHaveLength(1);
    expect((await put(plans.free.id, [{ billingCycle: "monthly", amount: 1 }])).body.error.message).toBe("The Free plan has no price");
    expect((await put(plans.free.id, [])).status).toBe(200);
    expect((await put(999n, [])).status).toBe(404);

    let n = 0;
    const fetch = mockFetch(() => json({ id: `plan_new_${++n}` }));
    const sync = await c.post("/api/v1/admin/plans/sync-razorpay");
    expect(sync.body.created.map((x: { plan: string; billingCycle: string }) => `${x.plan}:${x.billingCycle}`).sort()).toEqual(["Business:yearly", "Gold:yearly", "Pro:monthly"]);
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toMatchObject({ period: expect.any(String), item: { currency: "INR" } });
    const saved = env.razorpay.keyId;
    env.razorpay.keyId = "";
    expect((await c.post("/api/v1/admin/plans/sync-razorpay")).body.error.message).toBe("Add the Razorpay keys to the server first");
    env.razorpay.keyId = saved;
  });
  it("lists, voids and issues invoices", async () => {
    const c = await authed(await createStaff(["plans"]));
    const p = await createProvider({ businessName: "Invoice Co" });
    const t1 = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", amount: 118, status: "success" } });
    const inv = (await issueInvoice(t1.id, { email: false }))!;
    const q = (query: Record<string, string | number>) => c.get("/api/v1/admin/invoices").query(query).then((r) => r.body);
    expect(await q({})).toMatchObject({ total: 1, totals: { total: 118, taxable: 100, tax: 18 } });
    const today = new Date().toISOString().slice(0, 10);
    expect((await q({ q: "invoice co", status: "issued", from: today, to: today, providerId: Number(p.id) })).total).toBe(1);
    expect((await q({ q: inv.number })).total).toBe(1);
    expect((await q({ from: "2099-01-01" })).total).toBe(0);
    expect((await q({ to: "2000-01-01" })).total).toBe(0);
    expect((await c.post(`/api/v1/admin/invoices/${inv.id}/void`).send({ note: "Issued in error" })).body.invoice.status).toBe("void");
    expect((await q({ status: "issued" })).totals).toEqual({ total: 0, taxable: 0, tax: 0 });

    const bare = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", amount: 10, status: "success" } });
    expect((await c.post(`/api/v1/admin/transactions/${bare.id}/invoice`)).status).toBe(201);
    expect((await c.post(`/api/v1/admin/transactions/${bare.id}/invoice`)).body.error.message).toBe("This payment already has an invoice");
    const failed = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", amount: 10, status: "failed" } });
    expect((await c.post(`/api/v1/admin/transactions/${failed.id}/invoice`)).body.error.message).toBe("Only successful payments can be invoiced");
    const store = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", gateway: "app_store", amount: 10, status: "success" } });
    expect((await c.post(`/api/v1/admin/transactions/${store.id}/invoice`)).body.error.message).toBe("Store purchases are invoiced by Apple or Google");
    expect((await c.post("/api/v1/admin/transactions/999/invoice")).status).toBe(404);
    vi.spyOn(prisma.transaction, "findUnique").mockResolvedValueOnce({ ...bare, id: 1n, invoice: null, status: "success", gateway: "manual" } as never);
    vi.spyOn(prisma.transaction, "findUnique").mockResolvedValueOnce(null);
    expect((await c.post("/api/v1/admin/transactions/1/invoice")).body.invoice).toBeNull();
  });
  it("lists the webhook log and reprocesses events", async () => {
    await seedPlans();
    const c = await authed(await createStaff(["plans"]));
    const { provider } = await createOwner();
    const rzpEvent = await prisma.webhookEvent.create({
      data: { source: "razorpay", eventId: "e1", type: "subscription.activated", providerId: provider.id, payload: { event: "subscription.activated", payload: { subscription: { entity: { id: "sub_1", plan_id: "plan_pro_m", status: "active", current_end: null, notes: { providerId: String(provider.id) } } } } } },
    });
    const rcEvent = await prisma.webhookEvent.create({ data: { source: "revenuecat", eventId: "e2", type: "TEST", processedAt: new Date(), payload: { event: { id: "e2", type: "TEST", app_user_id: "x" } } } });
    const broken = await prisma.webhookEvent.create({ data: { source: "razorpay", eventId: "e3", type: "subscription.halted", payload: { event: "subscription.halted", payload: { subscription: { entity: { id: "sub_none", notes: [] } } } } } });
    const list = await c.get("/api/v1/admin/webhooks");
    expect(list.body.total).toBe(3);
    expect(list.body.events.find((e: { id: number }) => e.id === Number(rzpEvent.id)).provider.id).toBe(Number(provider.id));
    expect(list.body.events.find((e: { id: number }) => e.id === Number(rcEvent.id)).provider).toBeNull();
    expect((await c.get("/api/v1/admin/webhooks").query({ source: "revenuecat", status: "processed" })).body.total).toBe(1);
    expect((await c.get("/api/v1/admin/webhooks").query({ status: "failed" })).body.total).toBe(2);

    expect((await c.post(`/api/v1/admin/webhooks/${rzpEvent.id}/reprocess`)).body.event.providerId).toBe(Number(provider.id));
    expect((await c.post(`/api/v1/admin/webhooks/${rcEvent.id}/reprocess`)).body.event.providerId).toBeNull();
    const again = await c.post(`/api/v1/admin/webhooks/${broken.id}/reprocess`);
    expect(again.body.error.message).toMatch(/^Still failing: /);
    expect((await prisma.webhookEvent.findUniqueOrThrow({ where: { id: broken.id } })).error).toMatch(/does not belong/);
    vi.spyOn(prisma.providerSubscription, "findFirst").mockRejectedValueOnce("text error");
    expect((await c.post(`/api/v1/admin/webhooks/${rzpEvent.id}/reprocess`)).body.error.message).toBe("Still failing: text error");
    expect((await c.post("/api/v1/admin/webhooks/999/reprocess")).status).toBe(404);
  });
});
