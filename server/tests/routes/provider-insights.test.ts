import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { authed, settle } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createUser } from "../helpers/factories.js";

const DAY = 24 * 60 * 60 * 1000;
const today = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

describe("dashboard", () => {
  it("shows every provider their counts and full lead details", async () => {
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id });
    const customer = await createUser({ name: "Asha", phone: "+919000000000" });
    const l1 = await createLead(provider.id, { userId: customer.id, description: "TV", categoryId: cat.id, createdAt: new Date(Date.now() - 3000) });
    await createLead(provider.id, { channel: "whatsapp", subcategoryId: cat.subcategories[0]!.id, createdAt: new Date(Date.now() - 2000) });
    await createLead(provider.id, { createdAt: new Date(Date.now() - 1000) });
    await createReview(provider.id, customer.id);
    const res = await (await authed(user)).get("/api/v1/provider/dashboard").query({ days: 7 });
    expect(res.body).toMatchObject({ ranking: { position: 1, outOf: 1 }, totals: { leads: 3, calls: 2, whatsapp: 1, views: 0, impressions: 0, leadsChangePct: null, unrepliedReviews: 1 } });
    expect(res.body).not.toHaveProperty("analyticsLocked");
    expect(res.body).not.toHaveProperty("plan");
    expect(res.body.series).toHaveLength(7);
    const leads = res.body.recentLeads;
    expect(leads.find((l: { id: number }) => l.id === Number(l1.id))).toMatchObject({ customerName: "Asha", customerPhone: "+919000000000", service: cat.name, description: "TV" });
    expect(leads.every((l: object) => !("locked" in l))).toBe(true);
    expect(leads.find((l: { channel: string }) => l.channel === "whatsapp")).toMatchObject({ customerName: "Guest visitor", service: cat.subcategories[0]!.name });
    expect(res.body.recentReviews[0]).toMatchObject({ author: "Asha" });
  });
  it("shows trends, conversion and ranking", async () => {
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id, rankingScore: 10 });
    await createProvider({ categoryId: cat.id, rankingScore: 50 });
    await createLead(provider.id);
    await createLead(provider.id, { createdAt: new Date(Date.now() - 10 * DAY) });
    await createLead(provider.id, { createdAt: new Date(Date.now() - 10 * DAY) });
    await prisma.providerDailyStat.create({ data: { providerId: provider.id, date: today(), profileViews: 4, searchImpressions: 9 } });
    await prisma.providerDailyStat.create({ data: { providerId: provider.id, date: new Date(today().getTime() - 10 * DAY), profileViews: 2 } });
    const res = await (await authed(user)).get("/api/v1/provider/dashboard").query({ days: 7 });
    expect(res.body).toMatchObject({
      ranking: { position: 2, outOf: 2 },
      totals: { leads: 1, views: 4, impressions: 9, leadsChangePct: -50, viewsChangePct: 100, conversionPct: 25 },
    });
    expect(res.body.series.at(-1)).toMatchObject({ calls: 1, views: 4, impressions: 9 });
  });
  it("handles a provider with no history and no service", async () => {
    const { user } = await createOwner();
    const res = await (await authed(user)).get("/api/v1/provider/dashboard");
    expect(res.body.totals).toMatchObject({ leadsChangePct: null, viewsChangePct: null, conversionPct: null });
    expect(res.body.ranking).toEqual({ position: 1, outOf: 0 });
    expect(res.body.series).toHaveLength(30);
  });
});

describe("provider leads", () => {
  async function setup() {
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

  it("lists and filters every lead in full", async () => {
    const { user, a, c } = await setup();
    const api = await authed(user);
    const all = await api.get("/api/v1/provider/leads");
    expect(all.body).toMatchObject({ total: 3 });
    expect(all.body).not.toHaveProperty("leadLimit");
    expect(all.body.leads.find((l: { id: number }) => l.id === Number(c.id))).toMatchObject({ customerName: "Guest visitor", details: [] });
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
    expect(res.headers["content-disposition"]).toMatch(/kaajva-leads-\d{4}-\d{2}-\d{2}\.csv/);
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
