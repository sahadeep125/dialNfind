import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { authed, json, mockFetch, settle } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createUser, seedPlans, subscribe } from "../helpers/factories.js";

const DAY = 24 * 60 * 60 * 1000;
const today = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

describe("dashboard", () => {
  it("shows free providers their counts but not analytics", async () => {
    await seedPlans();
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id });
    const customer = await createUser({ name: "Asha", phone: "+919000000000" });
    const l1 = await createLead(provider.id, { userId: customer.id, description: "TV", categoryId: cat.id, createdAt: new Date(Date.now() - 3000) });
    await createLead(provider.id, { channel: "whatsapp", subcategoryId: cat.subcategories[0]!.id, createdAt: new Date(Date.now() - 2000) });
    await createLead(provider.id, { createdAt: new Date(Date.now() - 1000) });
    await createReview(provider.id, customer.id);
    const res = await (await authed(user)).get("/api/v1/provider/dashboard").query({ days: 7 });
    expect(res.body).toMatchObject({ analyticsLocked: true, ranking: null, subscription: null, totals: { leads: 3, calls: 2, whatsapp: 1, views: null, impressions: null, leadsChangePct: null, unrepliedReviews: 1 } });
    expect(res.body.series).toHaveLength(7);
    const leads = res.body.recentLeads;
    expect(leads.find((l: { id: number }) => l.id === Number(l1.id))).toMatchObject({ locked: false, customerName: "Asha", customerPhone: "+919000000000", service: cat.name });
    expect(leads.filter((l: { locked: boolean }) => l.locked)).toEqual([expect.objectContaining({ customerName: "Upgrade to see this contact", customerPhone: null, description: null })]);
    expect(leads.find((l: { channel: string }) => l.channel === "whatsapp")).toMatchObject({ customerName: "Guest visitor", service: cat.subcategories[0]!.name });
    expect(res.body.recentReviews[0]).toMatchObject({ author: "Asha" });
  });
  it("shows pro providers trends, conversion and ranking", async () => {
    const plans = await seedPlans();
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id, rankingScore: 10 });
    await createProvider({ categoryId: cat.id, rankingScore: 50 });
    await subscribe(provider.id, plans.pro.id);
    await createLead(provider.id);
    await createLead(provider.id, { createdAt: new Date(Date.now() - 10 * DAY) });
    await createLead(provider.id, { createdAt: new Date(Date.now() - 10 * DAY) });
    await prisma.providerDailyStat.create({ data: { providerId: provider.id, date: today(), profileViews: 4, searchImpressions: 9 } });
    await prisma.providerDailyStat.create({ data: { providerId: provider.id, date: new Date(today().getTime() - 10 * DAY), profileViews: 2 } });
    const res = await (await authed(user)).get("/api/v1/provider/dashboard").query({ days: 7 });
    expect(res.body).toMatchObject({
      analyticsLocked: false,
      ranking: { position: 2, outOf: 2 },
      totals: { leads: 1, views: 4, impressions: 9, leadsChangePct: -50, viewsChangePct: 100, conversionPct: 25 },
      subscription: { planName: "Pro", status: "active", autoRenew: true },
    });
    expect(res.body.series.at(-1)).toMatchObject({ calls: 1, views: 4, impressions: 9 });
  });
  it("handles a pro provider with no history and no service", async () => {
    const plans = await seedPlans();
    const { user, provider } = await createOwner();
    await subscribe(provider.id, plans.pro.id);
    const res = await (await authed(user)).get("/api/v1/provider/dashboard");
    expect(res.body.totals).toMatchObject({ leadsChangePct: null, viewsChangePct: null, conversionPct: null });
    expect(res.body.ranking).toEqual({ position: 1, outOf: 0 });
    expect(res.body.series).toHaveLength(30);
  });
});

describe("provider leads", () => {
  async function setup() {
    await seedPlans();
    const cat = await createCategory({ name: "Appliance Repair" });
    const attr = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "Device", fieldType: "text" } });
    const { user, provider } = await createOwner();
    const customer = await createUser({ name: "Ravi", phone: "+919111111111" });
    const a = await createLead(provider.id, { userId: customer.id, description: "=cmd TV broken", categoryId: cat.id, customerReportedResponse: true, createdAt: new Date(Date.now() - 5 * DAY) });
    const b = await createLead(provider.id, { channel: "whatsapp", customerReportedResponse: false, providerStatus: "won", createdAt: new Date(Date.now() - 4 * DAY) });
    const c = await createLead(provider.id, { createdAt: new Date(Date.now() - 3 * DAY) });
    await prisma.attributeValue.create({ data: { attributeId: attr.id, entityType: "lead", entityId: a.id, value: "Sony" } });
    await createReview(provider.id, customer.id, { leadId: a.id, rating: 4 });
    return { user, provider, customer, a, b, c, cat };
  }

  it("lists, filters and locks leads over the free limit", async () => {
    const { user, a, c } = await setup();
    const api = await authed(user);
    const all = await api.get("/api/v1/provider/leads");
    expect(all.body).toMatchObject({ total: 3, leadLimit: 2 });
    const locked = all.body.leads.find((l: { id: number }) => l.id === Number(c.id));
    expect(locked).toMatchObject({ locked: true, details: [], customerName: "Upgrade to see this contact" });
    expect(all.body.leads.find((l: { id: number }) => l.id === Number(a.id))).toMatchObject({ reviewRating: 4, details: [{ label: "Device", value: "Sony" }], isGuest: false, service: "Appliance Repair" });
    const q = (query: Record<string, string>) => api.get("/api/v1/provider/leads").query(query).then((r) => r.body.total);
    expect(await q({ channel: "whatsapp" })).toBe(1);
    expect(await q({ status: "won" })).toBe(1);
    expect(await q({ q: "ravi" })).toBe(1);
    expect(await q({ q: "appliance" })).toBe(1);
    expect(await q({ from: new Date(Date.now() - 4.5 * DAY).toISOString() })).toBe(2);
    expect(await q({ to: new Date(Date.now() - 4.5 * DAY).toISOString().slice(0, 10) })).toBeGreaterThanOrEqual(1);
    expect(await q({ from: new Date(Date.now() - 10 * DAY).toISOString(), to: new Date().toISOString() })).toBe(3);
  });
  it("exports a safe CSV", async () => {
    const { user } = await setup();
    const res = await (await authed(user)).get("/api/v1/provider/leads/export.csv");
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers["content-disposition"]).toMatch(/dialnfind-leads-\d{4}-\d{2}-\d{2}\.csv/);
    const text = res.text;
    expect(text.startsWith("﻿\"Date\"")).toBe(true);
    expect(text).toContain(`"'=cmd TV broken"`);
    expect(text).toContain('"Responded"');
    expect(text).toContain('"No response"');
    expect(text).toContain('"WhatsApp"');
    expect(text).toContain('"Device: Sony"');
  });
  it("updates status and notes, and disputes within 30 days", async () => {
    const { user, a, b, provider } = await setup();
    const api = await authed(user);
    expect((await api.patch(`/api/v1/provider/leads/${a.id}`).send({})).status).toBe(400);
    expect((await api.patch(`/api/v1/provider/leads/${a.id}`).send({ status: "contacted", note: "Call back Monday" })).body.lead).toMatchObject({ providerStatus: "contacted", providerNote: "Call back Monday" });
    expect((await api.patch(`/api/v1/provider/leads/${a.id}`).send({ note: "" })).body.lead.providerNote).toBeNull();
    expect((await api.patch(`/api/v1/provider/leads/${a.id}`).send({ note: null })).body.lead.providerNote).toBeNull();
    const other = await createLead((await createProvider()).id);
    expect((await api.patch(`/api/v1/provider/leads/${other.id}`).send({ status: "won" })).status).toBe(404);

    const dispute = await api.post(`/api/v1/provider/leads/${a.id}/dispute`).send({ reason: "This was a spam caller" });
    expect(dispute.status).toBe(201);
    expect(dispute.body.lead.disputeStatus).toBe("open");
    expect((await api.post(`/api/v1/provider/leads/${a.id}/dispute`).send({ reason: "This was a spam caller" })).status).toBe(409);
    const old = await createLead(provider.id, { createdAt: new Date(Date.now() - 40 * DAY) });
    expect((await api.post(`/api/v1/provider/leads/${old.id}/dispute`).send({ reason: "This was a spam caller" })).body.error.message).toBe("Contacts can be reported within 30 days");
    expect((await api.post(`/api/v1/provider/leads/${other.id}/dispute`).send({ reason: "This was a spam caller" })).status).toBe(404);
    expect((await api.post(`/api/v1/provider/leads/${b.id}/dispute`).send({ reason: "short" })).status).toBe(400);
  });
});

describe("provider reviews", () => {
  it("lists, replies to and reports reviews", async () => {
    const { user, provider } = await createOwner({ slug: "shop" });
    const c1 = await createUser();
    const c2 = await createUser();
    const r1 = await createReview(provider.id, c1.id, { rating: 5, photos: { create: { photoUrl: "x" } } });
    const r2 = await createReview(provider.id, c2.id, { rating: 2, providerReply: "Sorry" });
    await createReview(provider.id, (await createUser()).id, { status: "removed" });
    const api = await authed(user);
    const list = await api.get("/api/v1/provider/reviews");
    expect(list.body.total).toBe(2);
    expect(list.body.summary.breakdown).toContainEqual({ rating: 5, count: 1 });
    expect((await api.get("/api/v1/provider/reviews").query({ filter: "unreplied" })).body.total).toBe(1);

    const reply = await api.put(`/api/v1/provider/reviews/${r1.id}/reply`).send({ reply: "Thank you!" });
    expect(reply.body.review.providerReply).toBe("Thank you!");
    await settle();
    expect(await prisma.notification.findFirstOrThrow({ where: { userId: c1.id } })).toMatchObject({ type: "review_reply" });
    await api.put(`/api/v1/provider/reviews/${r2.id}/reply`).send({ reply: "Updated reply" });
    expect((await api.put(`/api/v1/provider/reviews/${r2.id}/reply`).send({ reply: null })).body.review.providerReplyAt).toBeNull();
    await settle();
    expect(await prisma.notification.count({ where: { userId: c2.id } })).toBe(0);
    const foreign = await createReview((await createProvider()).id, c1.id);
    expect((await api.put(`/api/v1/provider/reviews/${foreign.id}/reply`).send({ reply: "Hi there" })).status).toBe(404);

    expect((await api.post(`/api/v1/provider/reviews/${r2.id}/report`).send({ reason: "This review is fake" })).status).toBe(201);
    expect((await api.post(`/api/v1/provider/reviews/${r2.id}/report`).send({ reason: "This review is fake" })).status).toBe(409);
    expect((await api.post(`/api/v1/provider/reviews/${foreign.id}/report`).send({ reason: "This review is fake" })).status).toBe(404);
    const after = await api.get("/api/v1/provider/reviews");
    expect(after.body.reviews.find((r: { id: number }) => r.id === Number(r2.id)).reported).toBe(true);
  });
});

describe("sponsored campaigns", () => {
  async function business(over: Parameters<typeof createOwner>[0] = {}) {
    const plans = await seedPlans();
    const cat = await createCategory({ name: "Plumbing" });
    const { user, provider } = await createOwner({ categoryId: cat.id, ...over });
    await subscribe(provider.id, plans.business.id);
    return { user, provider, cat, plans };
  }

  it("lists campaigns and pricing", async () => {
    const { user, provider, cat } = await business();
    await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(), endDate: new Date(), budget: 500, impressions: 10, clicks: 1 } });
    await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(Date.now() - DAY), endDate: new Date(), budget: 500 } });
    const res = await (await authed(user)).get("/api/v1/provider/sponsored");
    expect(res.body).toMatchObject({ locked: false, checkoutEnabled: true, pricing: { costPerClick: 5, minBudget: 500, city: "Mumbai", gstRate: 18 }, categories: [{ name: "Plumbing" }] });
    expect(res.body.listings.map((l: { ctrPct: number | null }) => l.ctrPct)).toEqual([10, null]);
    const free = await createOwner();
    expect((await (await authed(free.user)).get("/api/v1/provider/sponsored")).body.locked).toBe(true);
  });
  it("sends promotion requests after the checks pass", async () => {
    const { user, provider, cat } = await business();
    const api = await authed(user);
    const send = (body: Record<string, unknown>) => api.post("/api/v1/provider/sponsored/request").send({ categoryId: Number(cat.id), days: 7, budget: 500, ...body });
    expect((await send({ budget: 100 })).body.error.message).toBe("The minimum budget is Rs 500");
    const other = await createCategory();
    expect((await send({ categoryId: Number(other.id) })).body.error.message).toBe("You can only promote a category you offer");
    const ok = await send({ note: "Please start Monday" });
    expect(ok.status).toBe(201);
    expect(ok.body.ticket.reference).toMatch(/^DNF-/);
    const msg = await prisma.ticketMessage.findFirstOrThrow();
    expect(msg.body).toContain("Note from the provider: Please start Monday");
    await send({});
    await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(), endDate: new Date(Date.now() + DAY), budget: 500 } });
    expect((await send({})).status).toBe(409);
    await prisma.provider.update({ where: { id: provider.id }, data: { status: "pending" } });
    expect((await send({})).body.error.message).toBe("Your listing must be live before you can promote it");
    const free = await createOwner();
    expect((await (await authed(free.user)).post("/api/v1/provider/sponsored/request").send({ categoryId: Number(cat.id), days: 7, budget: 500 })).status).toBe(402);
  });
  it("checks out with Razorpay and starts the campaign on verification", async () => {
    const { user, provider, cat } = await business({ state: "Maharashtra" });
    await prisma.user.update({ where: { id: user.id }, data: { phone: "+919876543210" } });
    const api = await authed(user);
    const fetch = mockFetch(json({ id: "order_1", amount: 59000, currency: "INR", status: "created", notes: {} }));
    const res = await api.post("/api/v1/provider/sponsored/checkout").send({ categoryId: Number(cat.id), days: 14, budget: 500 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ orderId: "order_1", keyId: "rzp_test_key", amount: 590, description: "Sponsored in Plumbing, 14 days", prefill: { contact: "+919876543210" } });
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body)).amount).toBe(59000);

    const sig = (o: string, p: string) => crypto.createHmac("sha256", env.razorpay.keySecret).update(`${o}|${p}`).digest("hex");
    expect((await api.post("/api/v1/provider/sponsored/verify").send({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "bad" })).status).toBe(400);
    expect((await api.post("/api/v1/provider/sponsored/verify").send({ razorpay_order_id: "order_x", razorpay_payment_id: "pay_1", razorpay_signature: sig("order_x", "pay_1") })).status).toBe(404);
    const ok = await api.post("/api/v1/provider/sponsored/verify").send({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: sig("order_1", "pay_1") });
    expect(ok.body.campaignId).not.toBeNull();
    const stranger = await business();
    const s = await authed(stranger.user);
    expect((await s.post("/api/v1/provider/sponsored/verify").send({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: sig("order_1", "pay_1") })).status).toBe(404);
    expect(provider.id).toBeDefined();
  });
  it("asks for billing details and refuses without Razorpay", async () => {
    const { user, cat } = await business({ state: "Atlantis" });
    const api = await authed(user);
    const noPhone = await api.post("/api/v1/provider/sponsored/checkout").send({ categoryId: Number(cat.id), days: 7, budget: 500 });
    expect(noPhone.body.error.code).toBe("billing_details_required");
    const saved = env.razorpay.keyId;
    env.razorpay.keyId = "";
    expect((await api.post("/api/v1/provider/sponsored/checkout").send({ categoryId: Number(cat.id), days: 7, budget: 500 })).status).toBe(501);
    env.razorpay.keyId = saved;
  });
  it("uses the billing state and a missing phone at checkout", async () => {
    const { user, cat } = await business({ state: "Atlantis", billingStateCode: "27" });
    mockFetch(json({ id: "order_2", amount: 1, currency: "INR", status: "created", notes: {} }));
    const res = await (await authed(user)).post("/api/v1/provider/sponsored/checkout").send({ categoryId: Number(cat.id), days: 30, budget: 500 });
    expect(res.body.prefill).not.toHaveProperty("contact");
  });
  it("pauses and resumes campaigns", async () => {
    const { user, provider, cat, plans } = await business();
    const running = await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(), endDate: new Date(), budget: 500 } });
    const done = await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(), endDate: new Date(), budget: 500, status: "completed" } });
    const api = await authed(user);
    expect((await api.patch(`/api/v1/provider/sponsored/${running.id}`).send({ status: "paused" })).body.listing.status).toBe("paused");
    expect((await api.patch(`/api/v1/provider/sponsored/${running.id}`).send({ status: "active" })).body.listing.status).toBe("active");
    expect((await api.patch(`/api/v1/provider/sponsored/${done.id}`).send({ status: "active" })).body.error.message).toBe("This campaign has ended");
    expect((await api.patch("/api/v1/provider/sponsored/999").send({ status: "active" })).status).toBe(404);
    await prisma.providerSubscription.updateMany({ data: { status: "expired" } });
    expect((await api.patch(`/api/v1/provider/sponsored/${running.id}`).send({ status: "active" })).status).toBe(402);
    expect(plans).toBeDefined();
  });
});
