import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/lib/prisma.js";
import { clearSettingsCache } from "../../src/services/settings.js";
import { env } from "../../src/env.js";
import { uploadDir } from "../../src/storage/index.js";
import { PRIVATE_FILES_URL, privateDir, signedLink, signFileUrl } from "../../src/lib/private-files.js";
import { issueInvoice } from "../../src/services/invoices.js";
import { api, authed, json, mockFetch, sentMails, settle } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createStaff, createUser, seedPlans, subscribe } from "../helpers/factories.js";

const img = (w = 800, h = 800) => sharp({ create: { width: w, height: h, channels: 3, background: "#aa3300" } }).jpeg().toBuffer();
const pub = (key: string) => `${env.publicUrl}/uploads/${key}`;

describe("app shell", () => {
  it("answers health, root, 404 and malformed JSON", async () => {
    expect((await api().get("/api/v1/health")).body).toEqual({ ok: true });
    expect((await api().get("/")).body).toMatchObject({ name: "DialNFind API" });
    const missing = await api().get("/api/v1/nope");
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toBe("No route for GET /api/v1/nope");
    const bad = await api().post("/api/v1/auth/login").set("content-type", "application/json").send("{bad");
    expect(bad.body.error).toMatchObject({ code: "bad_request", message: "Malformed JSON body" });
    const big = await api().post("/api/v1/auth/login").set("content-type", "application/json").send(JSON.stringify({ x: "a".repeat(1_100_000) }));
    expect(big.status).toBe(413);
    expect((await api().get("/api/v1/health").set("Origin", "http://localhost:3000")).headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
  it("maps Prisma errors and unexpected errors", async () => {
    const user = await createUser();
    const c = await authed(user);
    // P2025: record to update not found.
    const admin = await authed(await createStaff());
    expect((await admin.patch("/api/v1/categories/999").send({ name: "Nope" })).status).toBe(404);
    const cat = await createCategory({ slug: "taken" });
    expect((await admin.post("/api/v1/categories").send({ name: "Dup", slug: "taken" })).status).toBe(409);
    vi.spyOn(prisma.notification, "findMany").mockRejectedValueOnce(new Error("boom"));
    const res = await c.get("/api/v1/me/notifications");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal");
    expect(cat.id).toBeDefined();
  });
  it("serves public uploads and signed private files only", async () => {
    await writeFile(path.join(uploadDir, "a.webp"), "img");
    const got = await api().get("/uploads/a.webp");
    expect(got.status).toBe(200);
    expect(got.headers["cache-control"]).toContain("immutable");

    await writeFile(path.join(privateDir, "doc.pdf"), "%PDF-1");
    const url = new URL(signFileUrl(`${PRIVATE_FILES_URL}doc.pdf`));
    const ok = await api().get(`${url.pathname}${url.search}`);
    expect(ok.status).toBe(200);
    expect(ok.headers["cache-control"]).toBe("private, no-store");
    expect((await api().get(url.pathname)).status).toBe(403);
    const missing = new URL(signFileUrl(`${PRIVATE_FILES_URL}nope.pdf`));
    expect((await api().get(`${missing.pathname}${missing.search}`)).status).toBe(404);
    const nested = new URL(signFileUrl(`${PRIVATE_FILES_URL}a/b.pdf`));
    expect((await api().get(`${nested.pathname}${nested.search}`)).status).toBe(404);
    // Signed, but pointing outside the folder.
    const escape = new URL(signFileUrl(`${PRIVATE_FILES_URL}..%2Fsecret`));
    expect((await api().get(`/api/v1/files/..%2Fsecret${escape.search}`)).status).toBe(403);
  });
  it("serves invoice PDFs through signed links", async () => {
    const p = await createProvider();
    const txn = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", amount: 10, status: "success" } });
    const inv = (await issueInvoice(txn.id, { email: false }))!;
    const link = new URL(signedLink("/api/v1/invoice-files", `${inv.id}.pdf`));
    const res = await api().get(`${link.pathname}${link.search}`).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain(inv.number.replace(/\//g, "-"));
    expect((await api().get(link.pathname)).status).toBe(403);
    const bad = new URL(signedLink("/api/v1/invoice-files", "x.pdf"));
    expect((await api().get(`/api/v1/invoice-files/x.pdf${bad.search}`)).status).toBe(403);
    const none = new URL(signedLink("/api/v1/invoice-files", "999.pdf"));
    expect((await api().get(`${none.pathname}${none.search}`)).status).toBe(404);
  });
});

describe("categories", () => {
  it("lists active categories and shows one", async () => {
    const cat = await createCategory({ slug: "tv", displayOrder: 1 });
    await prisma.subcategory.update({ where: { id: cat.subcategories[1]!.id }, data: { isActive: false } });
    await createCategory({ slug: "off", isActive: false });
    const list = await api().get("/api/v1/categories");
    expect(list.body.categories).toHaveLength(1);
    expect(list.body.categories[0].subcategories).toHaveLength(1);
    expect((await api().get("/api/v1/categories/tv")).body.category.slug).toBe("tv");
    expect((await api().get("/api/v1/categories/off")).status).toBe(404);
    expect((await api().get("/api/v1/categories/none")).status).toBe(404);
  });
  it("lets staff with the categories module manage the catalogue", async () => {
    expect((await api().post("/api/v1/categories").send({})).status).toBe(401);
    expect((await (await authed(await createUser())).post("/api/v1/categories").send({})).status).toBe(403);
    expect((await (await authed(await createStaff(["users"]))).post("/api/v1/categories").send({})).status).toBe(403);
    const staff = await createStaff(["categories"]);
    const c = await authed(staff);
    const created = await c.post("/api/v1/categories").send({ name: "Home Cleaning" });
    expect(created.status).toBe(201);
    expect(created.body.category.slug).toBe("home-cleaning");
    const id = created.body.category.id;
    await writeFile(path.join(uploadDir, "icon.webp"), "x");
    await c.patch(`/api/v1/categories/${id}`).send({ iconUrl: pub("icon.webp") });
    await c.patch(`/api/v1/categories/${id}`).send({ iconUrl: "lucide:broom" });
    await c.patch(`/api/v1/categories/${id}`).send({ name: "Cleaning" });
    await settle();
    await expect(import("node:fs/promises").then((fs) => fs.stat(path.join(uploadDir, "icon.webp")))).rejects.toThrow();

    const sub = await c.post(`/api/v1/categories/${id}/subcategories`).send({ name: "Deep Clean" });
    expect(sub.body.subcategory.slug).toBe("deep-clean");
    const subId = sub.body.subcategory.id;
    await c.post(`/api/v1/categories/${id}/subcategories`).send({ name: "Sofa", slug: "sofa-x" });
    expect((await c.patch(`/api/v1/categories/subcategories/${subId}`).send({ iconUrl: "lucide:x" })).body.subcategory.iconUrl).toBe("lucide:x");
    await c.patch(`/api/v1/categories/subcategories/${subId}`).send({ name: "Deep Cleaning" });

    const attr = await c.post(`/api/v1/categories/${id}/attributes`).send({ subcategoryId: subId, appliesTo: "lead", label: "Rooms", fieldType: "number" });
    expect(attr.body.attribute).toMatchObject({ subcategoryId: subId, isRequired: false });
    const attr2 = await c.post(`/api/v1/categories/${id}/attributes`).send({ appliesTo: "provider", label: "Brands", fieldType: "multiselect", options: ["A"], isRequired: true, displayOrder: 2 });
    const aid = attr2.body.attribute.id;
    expect((await c.patch(`/api/v1/categories/attributes/${aid}`).send({ options: ["A", "B"], subcategoryId: subId })).body.attribute.optionsJson).toEqual(["A", "B"]);
    expect((await c.patch(`/api/v1/categories/attributes/${aid}`).send({ subcategoryId: null, label: "Brand" })).body.attribute.subcategoryId).toBeNull();
    expect((await c.delete(`/api/v1/categories/attributes/${aid}`)).body).toEqual({ ok: true });
    expect((await c.delete(`/api/v1/categories/subcategories/${subId}`)).body).toEqual({ ok: true });
    expect((await c.delete(`/api/v1/categories/${id}`)).body).toEqual({ ok: true });
    expect(await prisma.adminActivityLog.count()).toBeGreaterThan(8);
    expect((await c.patch("/api/v1/categories/abc").send({})).status).toBe(400);
  });
});

describe("search routes", () => {
  it("searches, logs queries and paginates", async () => {
    const cat = await createCategory({ name: "Appliance Repair", slug: "appliance-repair" }, ["TV Repair"]);
    const p = await createProvider({ businessName: "Sharma TV", categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id });
    const user = await createUser();
    const c = await authed(user);
    const res = await c.get("/api/v1/search/providers").query({ q: "tv repair", city: "Mumbai", openNow: "false", verified: "0", pageSize: 5 });
    expect(res.body).toMatchObject({ page: 1, pageSize: 5, total: 1, totalPages: 1 });
    expect(res.body.results[0].id).toBe(Number(p.id));
    await api().get("/api/v1/search/providers").query({ q: "tv", lat: 19.07, lng: 72.87, location: "Andheri" });
    await api().get("/api/v1/search/providers").query({ q: "zzz", area: "Bandra" });
    await api().get("/api/v1/search/providers").query({ q: "nolog", log: "false" });
    await api().get("/api/v1/search/providers").query({ q: "page2", page: 2 });
    await api().get("/api/v1/search/providers").query({ openNow: true });
    await settle();
    const logged = await prisma.searchQuery.findMany({ orderBy: { id: "asc" } });
    expect(logged.map((l) => [l.rawQuery, l.parsedLocationText, l.userId])).toEqual([
      ["tv repair", "Mumbai", user.id],
      ["tv", "Andheri", null],
      ["zzz", "Bandra", null],
    ]);
    expect(logged[0]!.parsedSubcategoryId).toBe(cat.subcategories[0]!.id);
    vi.spyOn(prisma.searchQuery, "create").mockImplementationOnce((() => Promise.reject(new Error("db"))) as never);
    await api().get("/api/v1/search/providers").query({ q: "fails" });
    await settle();
    expect(console.warn).toHaveBeenCalledWith("Failed to log search", expect.any(Error));
    expect((await api().get("/api/v1/search/providers").query({ sort: "bad" })).status).toBe(400);
  });
  it("suggests and lists popular terms", async () => {
    const cat = await createCategory({ name: "Appliance Repair", slug: "appliance-repair" }, ["TV Repair"]);
    await createProvider({ businessName: "TV World" });
    const s = await api().get("/api/v1/search/suggest").query({ q: "tv" });
    expect(s.body.suggestions.map((x: { type: string }) => x.type)).toEqual(["service", "provider"]);
    const s2 = await api().get("/api/v1/search/suggest").query({ q: "appliance" });
    expect(s2.body.suggestions).toContainEqual({ type: "category", label: "Appliance Repair", slug: cat.slug });
    expect((await api().get("/api/v1/search/suggest")).status).toBe(400);
    await prisma.searchQuery.createMany({ data: [{ rawQuery: "TV" }, { rawQuery: "tv" }, { rawQuery: "tv" }, { rawQuery: "ac" }] });
    expect((await api().get("/api/v1/search/popular")).body.terms).toEqual([{ term: "tv", count: 3 }, { term: "ac", count: 1 }]);
  });
});

describe("locations", () => {
  it("combines directory places with geocoder results", async () => {
    const p = await createProvider({ city: "Mumbai", state: "Maharashtra" });
    await prisma.providerServiceArea.create({ data: { providerId: p.id, areaName: "Andheri", latitude: 19.11, longitude: 72.84 } });
    await prisma.providerServiceArea.create({ data: { providerId: p.id, areaName: "Bandra" } });
    const all = await api().get("/api/v1/locations");
    expect(all.body.locations.map((l: { label: string }) => l.label)).toEqual(["Mumbai, Maharashtra", "Andheri, Mumbai", "Bandra, Mumbai"]);
    mockFetch(json([
      { lat: "19.1", lon: "72.8", name: "Andheri", display_name: "dup", address: { city: "Mumbai" } },
      { lat: "19.2", lon: "72.9", name: "Andheri East", display_name: "x", address: { city: "Mumbai", state: "MH" } },
    ]));
    const q = await api().get("/api/v1/locations").query({ q: "andh" });
    expect(q.body.locations.map((l: { kind: string; name: string }) => [l.kind, l.name])).toEqual([["area", "Andheri"], ["place", "Andheri East"]]);
    // Two letters: directory only.
    expect((await api().get("/api/v1/locations").query({ q: "mu" })).body.locations).toHaveLength(3);
  });
  it("stops adding places at twelve results", async () => {
    const p = await createProvider({ city: "Pune" });
    await prisma.providerServiceArea.createMany({ data: Array.from({ length: 11 }, (_, i) => ({ providerId: p.id, areaName: `Pune Area ${i}` })) });
    mockFetch(json([{ lat: "1", lon: "1", name: "Pune Place A", display_name: "a" }, { lat: "1", lon: "1", name: "Pune Place B", display_name: "b" }]));
    const res = await api().get("/api/v1/locations").query({ q: "pune" });
    expect(res.body.locations).toHaveLength(12);
    const full = await createProvider({ city: "Pune" });
    await prisma.providerServiceArea.create({ data: { providerId: full.id, areaName: "Pune Area 99" } });
    expect((await api().get("/api/v1/locations").query({ q: "pune" })).body.locations).toHaveLength(12);
  });
  it("reverse geocodes the current location", async () => {
    mockFetch(json({ lat: "19.1", lon: "72.8", name: "Juhu", display_name: "Juhu", address: { city: "Mumbai", state: "MH" } }), json({ error: "none" }));
    expect((await api().get("/api/v1/locations/reverse").query({ lat: 19.1, lng: 72.8 })).body.location).toMatchObject({ name: "Juhu", kind: "current", latitude: 19.1 });
    expect((await api().get("/api/v1/locations/reverse").query({ lat: 1, lng: 1 })).body.location.label).toBe("Current location");
    expect((await api().get("/api/v1/locations/reverse").query({ lat: 100, lng: 1 })).status).toBe(400);
  });
});

describe("misc routes", () => {
  it("turns the contact form into a ticket", async () => {
    await createStaff();
    const res = await api().post("/api/v1/contact").send({ name: "Guest", email: "g@example.com", phone: "", subject: "Listing my business", message: "Please add my shop" });
    expect(res.status).toBe(201);
    expect(res.body.reference).toMatch(/^DNF-/);
    const { user } = await createOwner();
    await (await authed(user)).post("/api/v1/contact").send({ name: "Owner", email: "o@example.com", message: "Something else here" });
    const customer = await createUser();
    await (await authed(customer)).post("/api/v1/contact").send({ name: "Cust", email: "c@example.com", phone: "9876543210", message: "Something else here" });
    const tickets = await prisma.supportTicket.findMany({ orderBy: { id: "asc" } });
    expect(tickets.map((t) => [t.category, t.subject, t.providerId !== null])).toEqual([
      ["listing", "Listing my business", false],
      ["general", "Message from the contact form", true],
      ["general", "Message from the contact form", false],
    ]);
    await settle();
    expect(sentMails().filter((m) => m.subject.startsWith("We got your request"))).toHaveLength(3);
    expect((await api().post("/api/v1/contact").send({ name: "x" })).status).toBe(400);
  });
  it("serves app config, plans and stats", async () => {
    await prisma.setting.create({ data: { key: "support_phone", value: "+911234" } });
    expect((await api().get("/api/v1/app-config")).body.config).toMatchObject({ site_name: "DialNFind", support_phone: "+911234", terms_url: null, min_review_length: 10 });
    await seedPlans();
    expect((await api().get("/api/v1/plans")).body.plans.map((p: { code: string }) => p.code)).toEqual(["free", "pro", "business"]);
    await createCategory();
    const p = await createProvider();
    await createProvider({ city: "Pune" });
    await createReview(p.id, (await createUser()).id);
    expect((await api().get("/api/v1/stats")).body).toEqual({ providers: 2, categories: 1, cities: 2, reviews: 1 });
  });
});

describe("provider profiles", () => {
  async function profile() {
    const plans = await seedPlans();
    const cat = await createCategory({ slug: "repairs" });
    const attr = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "provider", label: "Brands", fieldType: "multiselect" } });
    const p = await createProvider({ slug: "sharma", categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id });
    const svc = await prisma.providerService.findFirstOrThrow({ where: { providerId: p.id } });
    const svc2 = await prisma.providerService.create({ data: { providerId: p.id, categoryId: cat.id, subcategoryId: cat.subcategories[1]!.id } });
    await prisma.attributeValue.createMany({ data: [{ attributeId: attr.id, entityType: "provider_service", entityId: svc.id, value: '["LG"]' }, { attributeId: attr.id, entityType: "provider_service", entityId: svc2.id, value: '["LG"]' }] });
    await prisma.providerBusinessHour.create({ data: { providerId: p.id, dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" } });
    await prisma.providerServiceArea.create({ data: { providerId: p.id, areaName: "Andheri" } });
    for (let i = 0; i < 5; i++) await prisma.providerPortfolio.create({ data: { providerId: p.id, title: `P${i}`, imageUrl: pub(`p${i}.webp`), categoryId: i === 4 ? cat.id : null, isCover: i === 4 } });
    await prisma.verification.create({ data: { providerId: p.id, type: "business", status: "approved", verifiedAt: new Date() } });
    return { plans, cat, p };
  }

  it("shows the full profile with plan-limited photos", async () => {
    const { plans, p } = await profile();
    const user = await createUser();
    await prisma.favorite.create({ data: { userId: user.id, providerId: p.id } });
    await createReview(p.id, user.id, { rating: 4, photos: { create: { photoUrl: pub("r.webp") } } });
    const res = await (await authed(user)).get("/api/v1/providers/sharma");
    const body = res.body.provider;
    expect(body).toMatchObject({ isFavorite: true, is24x7: false, portfolio: expect.any(Array), serviceDetails: [{ label: "Brands", value: "LG" }] });
    expect(body.portfolio).toHaveLength(3);
    expect(body.portfolio[0].category).not.toBeNull();
    expect(body.hours).toHaveLength(7);
    expect(body.hours[1].label).toBe("9 AM - 6 PM");
    expect(body.ratingBreakdown).toContainEqual({ rating: 4, count: 1 });
    expect(body.myReview.photos).toEqual([pub("r.webp")]);
    expect(body.services[0].details).toEqual([{ label: "Brands", value: "LG" }]);
    await settle();
    expect((await prisma.providerDailyStat.findFirstOrThrow()).profileViews).toBe(1);

    await subscribe(p.id, plans.business.id);
    await prisma.providerBusinessHour.create({ data: { providerId: p.id, dayOfWeek: 2, is24x7: true } });
    const guest = (await api().get("/api/v1/providers/sharma").query({ view: "false" })).body.provider;
    expect(guest.portfolio).toHaveLength(5);
    expect(guest.is24x7).toBe(true);
    expect(guest.hours[0].label).toBe("Open 24 hours");
    expect(guest.myReview).toBeNull();
    expect(guest.isFavorite).toBe(false);
    await settle();
    expect((await prisma.providerDailyStat.findFirstOrThrow()).profileViews).toBe(1);
  });
  it("shows everything when the free plan is missing", async () => {
    const p = await createProvider({ slug: "nofree" });
    for (let i = 0; i < 4; i++) await prisma.providerPortfolio.create({ data: { providerId: p.id, title: `P${i}`, imageUrl: pub(`p${i}.webp`) } });
    expect((await api().get("/api/v1/providers/nofree")).body.provider.portfolio).toHaveLength(4);
    await createProvider({ slug: "pending", status: "pending" });
    expect((await api().get("/api/v1/providers/pending")).status).toBe(404);
    expect((await api().get("/api/v1/providers/none")).status).toBe(404);
  });
  it("lists featured, sitemap, reviews and similar providers", async () => {
    const { cat, p } = await profile();
    const other = await createProvider({ slug: "other", categoryId: cat.id });
    await createProvider({ slug: "none-category" });
    expect((await api().get("/api/v1/providers/featured").query({ lat: 19.07, lng: 72.87, limit: 2 })).body.results).toHaveLength(2);
    expect((await (await authed(await createUser())).get("/api/v1/providers/featured")).body.results).toHaveLength(3);
    const map = await api().get("/api/v1/providers/sitemap").query({ pageSize: 2 });
    expect(map.body).toMatchObject({ total: 3, totalPages: 2 });
    expect(map.body.results[0]).toHaveProperty("slug");

    const u1 = await createUser({ name: "Asha" });
    const u2 = await createUser();
    const lead = await createLead(p.id, { userId: u1.id });
    await createReview(p.id, u1.id, { rating: 2, leadId: lead.id, photos: { create: { photoUrl: pub("x.webp") } } });
    await createReview(p.id, u2.id, { rating: 5 });
    await createReview(p.id, (await createUser()).id, { rating: 3, status: "removed" });
    const recent = await api().get("/api/v1/providers/sharma/reviews");
    expect(recent.body.total).toBe(2);
    expect(recent.body.reviews.find((r: { rating: number }) => r.rating === 2)).toMatchObject({ isVerifiedContact: true, photos: [pub("x.webp")], author: { name: "Asha" } });
    expect((await api().get("/api/v1/providers/sharma/reviews").query({ sort: "highest" })).body.reviews[0].rating).toBe(5);
    expect((await api().get("/api/v1/providers/sharma/reviews").query({ sort: "lowest" })).body.reviews[0].rating).toBe(2);
    expect((await api().get("/api/v1/providers/sharma/reviews").query({ rating: 5 })).body.total).toBe(1);

    const similar = await api().get("/api/v1/providers/sharma/similar");
    expect(similar.body.results.map((r: { id: number }) => r.id)).toEqual([Number(other.id)]);
    expect((await (await authed(u2)).get("/api/v1/providers/none-category/similar")).body.results.length).toBeGreaterThan(0);
  });
  it("records reports and visits", async () => {
    await profile();
    expect((await api().post("/api/v1/providers/sharma/report").send({ reason: "Wrong number" })).status).toBe(201);
    const u = await createUser();
    expect((await (await authed(u)).post("/api/v1/providers/sharma/report").send({ reason: "Closed down" })).status).toBe(201);
    expect((await api().post("/api/v1/providers/sharma/report").send({ reason: "x" })).status).toBe(400);
    expect(await prisma.reportFlag.count()).toBe(2);
    expect((await api().post("/api/v1/providers/sharma/visit")).body).toEqual({
      isFavorite: false,
      myReview: null,
      reviewEligibility: { canReview: false, reason: "sign_in", availableAt: null },
    });
    const p = await prisma.provider.findUniqueOrThrow({ where: { slug: "sharma" } });
    await prisma.favorite.create({ data: { userId: u.id, providerId: p.id } });
    await createReview(p.id, u.id, { photos: { create: { photoUrl: pub("v.webp") } } });
    const visit = await (await authed(u)).post("/api/v1/providers/sharma/visit");
    expect(visit.body).toMatchObject({ isFavorite: true, myReview: { rating: 5, photos: [pub("v.webp")], status: "published" }, reviewEligibility: null });
    expect(visit.body.myReview).not.toHaveProperty("ipHash");
    const other = await (await authed(await createUser())).post("/api/v1/providers/sharma/visit");
    expect(other.body).toEqual({ isFavorite: false, myReview: null, reviewEligibility: { canReview: false, reason: "no_contact", availableAt: null } });
  });
});

describe("leads", () => {
  it("records calls and notifies the owner", async () => {
    const plans = await seedPlans();
    const cat = await createCategory({ slug: "repairs" });
    const attr = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "Device", fieldType: "select", optionsJson: ["TV", "AC"] } });
    const optional = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "Notes", fieldType: "text" } });
    const { user, provider } = await createOwner({ whatsappNumber: "+919999999999" });
    const customer = await createUser();
    const c = await authed(customer);
    const res = await c.post("/api/v1/leads").send({
      providerId: Number(provider.id), channel: "call", categorySlug: "repairs", description: "TV not working",
      details: [{ attributeId: Number(attr.id), value: "TV" }, { attributeId: Number(optional.id), value: "" }],
    });
    expect(res.status).toBe(201);
    expect(res.body.contact).toEqual({ number: "+919876543210" });
    expect(await prisma.attributeValue.findMany({ select: { value: true } })).toEqual([{ value: "TV" }]);
    await settle();
    expect(await prisma.notification.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({ title: "New call from DialNFind" });

    expect((await api().post("/api/v1/leads").send({ providerId: Number(provider.id), channel: "whatsapp" })).body.error.message).toBe("This business takes calls only");
    await subscribe(provider.id, plans.pro.id);
    const wa = await api().post("/api/v1/leads").send({ providerId: Number(provider.id), channel: "whatsapp", subcategorySlug: cat.subcategories[0]!.slug });
    expect(wa.body.contact.number).toBe("+919999999999");
    await settle();
    expect(await prisma.notification.count({ where: { title: "New WhatsApp enquiry" } })).toBe(1);

    expect((await api().post("/api/v1/leads").send({ providerId: 999, channel: "call" })).status).toBe(404);
    expect((await api().post("/api/v1/leads").send({ providerId: Number(provider.id), channel: "call", details: [{ attributeId: 1, value: "x" }] })).body.error.message).toBe("Pick a service before adding details");
    expect((await api().post("/api/v1/leads").send({ providerId: Number(provider.id), channel: "call", categorySlug: "repairs", details: [{ attributeId: 999, value: "x" }] })).body.error.message).toBe("That detail does not apply to this service");
    const other = await createProvider();
    await subscribe(other.id, plans.pro.id);
    const noWa = await api().post("/api/v1/leads").send({ providerId: Number(other.id), channel: "whatsapp", categorySlug: "missing" });
    expect(noWa.body.contact.number).toBe("+919876543210");
  });
  it("tells a free owner when the monthly limit is used up", async () => {
    await seedPlans();
    const { user, provider } = await createOwner();
    for (let i = 0; i < 3; i++) await api().post("/api/v1/leads").send({ providerId: Number(provider.id), channel: "call" });
    await settle(150);
    const last = await prisma.notification.findFirstOrThrow({ where: { userId: user.id }, orderBy: { id: "desc" } });
    expect(last.body).toContain("You have used the 2 leads in your Free plan this month");
  });
  it("charges promoted clicks against the campaign budget", async () => {
    const cat = await createCategory({ slug: "repairs" });
    const p = await createProvider();
    const listing = await prisma.sponsoredListing.create({ data: { providerId: p.id, categoryId: cat.id, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000), budget: 8 } });
    await api().post("/api/v1/leads").send({ providerId: Number(p.id), channel: "call", categorySlug: "repairs" });
    await settle();
    await api().post("/api/v1/leads").send({ providerId: Number(p.id), channel: "call", categorySlug: "repairs" });
    await settle();
    const after = await prisma.sponsoredListing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(after).toMatchObject({ clicks: 2, status: "completed" });
    expect(Number(after.amountSpent)).toBe(8);
    const charges = (await prisma.lead.findMany({ orderBy: { id: "asc" } })).map((l) => Number(l.sponsoredCharge));
    expect(charges).toEqual([5, 3]);
    // Campaign finished: no more charges.
    await api().post("/api/v1/leads").send({ providerId: Number(p.id), channel: "call", categorySlug: "repairs" });
    await settle();
    expect((await prisma.lead.findFirstOrThrow({ orderBy: { id: "desc" } })).sponsoredListingId).toBeNull();
  });
  it("records whether the business responded", async () => {
    const p = await createProvider();
    const customer = await createUser();
    const lead = await createLead(p.id, { userId: customer.id });
    const c = await authed(customer);
    expect((await c.patch(`/api/v1/leads/${lead.id}/response`).send({ responded: true })).body.lead.customerReportedResponse).toBe(true);
    expect((await c.patch("/api/v1/leads/999/response").send({ responded: true })).status).toBe(404);
    const stranger = await authed(await createUser());
    expect((await stranger.patch(`/api/v1/leads/${lead.id}/response`).send({ responded: false })).status).toBe(403);
  });
});

describe("reviews", () => {
  const HOUR = 60 * 60 * 1000;
  const ago = (ms: number) => new Date(Date.now() - ms);
  /** A customer whose account is old enough that it is not held for being new. */
  const regular = (over: Parameters<typeof createUser>[0] = {}) => createUser({ createdAt: ago(48 * HOUR), ...over });
  const post = (c: Awaited<ReturnType<typeof authed>>, providerId: bigint, over: Record<string, unknown> = {}) =>
    c.post("/api/v1/reviews").send({ providerId: Number(providerId), rating: 5, reviewText: "Very good service indeed", ...over });

  it("creates one review per customer, linked to their contact", async () => {
    const { user: owner, provider } = await createOwner();
    const customer = await regular();
    const lead = await createLead(provider.id, { userId: customer.id, createdAt: ago(5 * HOUR) });
    const c = await authed(customer);
    expect((await post(c, provider.id, { reviewText: "short" })).body.error.message).toContain("at least 10");
    const res = await post(c, provider.id, { photos: [pub("a.webp")] });
    expect(res.status).toBe(201);
    expect(res.body.review).toMatchObject({ status: "published", photos: [pub("a.webp")] });
    expect((await prisma.review.findUniqueOrThrow({ where: { id: BigInt(res.body.review.id) } })).leadId).toBe(lead.id);
    expect((await post(c, provider.id, { rating: 4 })).status).toBe(409);
    await settle();
    expect(await prisma.notification.count({ where: { userId: owner.id, type: "review" } })).toBe(1);
    expect((await post(await authed(owner), provider.id)).body.error.message).toBe("You cannot review your own business");
    expect((await post(c, 999n)).status).toBe(404);
  });

  it("only lets customers who contacted the business review it", async () => {
    const p = await createProvider();
    const refuse = async (c: Awaited<ReturnType<typeof authed>>) => {
      const res = await post(c, p.id);
      expect(res.status).toBe(403);
      return res.body.error;
    };
    expect((await api().post("/api/v1/reviews").send({ providerId: Number(p.id), rating: 5, reviewText: "Very good service indeed" })).status).toBe(401);
    expect((await refuse(await authed(await regular()))).details).toEqual({ reason: "no_contact", availableAt: null });

    // Contacted a minute ago: wait for the setting (4 hours by default), unless they say the business responded.
    const early = await regular();
    const lead = await createLead(p.id, { userId: early.id, createdAt: ago(60_000) });
    const c = await authed(early);
    const error = await refuse(c);
    expect(error.code).toBe("review_not_allowed");
    expect(error.details.reason).toBe("too_soon");
    expect(new Date(error.details.availableAt).getTime()).toBeCloseTo(lead.createdAt.getTime() + 4 * HOUR, -3);
    const visit = await c.post(`/api/v1/providers/${p.slug}/visit`);
    expect(visit.body.reviewEligibility).toMatchObject({ canReview: false, reason: "too_soon" });
    await c.patch(`/api/v1/leads/${lead.id}/response`).send({ responded: true });
    expect((await c.post(`/api/v1/providers/${p.slug}/visit`)).body.reviewEligibility).toEqual({ canReview: true, reason: null, availableAt: null });
    expect((await post(c, p.id)).status).toBe(201);

    // The wait is an admin setting; a guest contact does not count for anyone.
    await prisma.setting.create({ data: { key: "review_min_contact_hours", value: "0" } });
    clearSettingsCache();
    const later = await regular();
    await createLead(p.id, { createdAt: ago(5 * HOUR) });
    expect((await refuse(await authed(later))).details.reason).toBe("no_contact");
    await createLead(p.id, { userId: later.id });
    expect((await post(await authed(later), p.id)).status).toBe(201);
  });

  it("holds suspicious reviews for the admin team", async () => {
    const reviewAs = async (user: Awaited<ReturnType<typeof createUser>>, providerId: bigint, over: Record<string, unknown> = {}, ip = "1.1.1.1") => {
      await createLead(providerId, { userId: user.id, customerReportedResponse: true });
      const res = await post(await authed(user), providerId, over).set("X-Forwarded-For", ip);
      expect(res.status).toBe(201);
      return prisma.review.findUniqueOrThrow({ where: { id: BigInt(res.body.review.id) } });
    };
    const { user: owner, provider } = await createOwner();
    const first = await reviewAs(await createUser(), provider.id);
    expect(first).toMatchObject({ status: "pending", holdReasons: ["new_account"] });
    await settle();
    expect(await prisma.notification.count({ where: { userId: owner.id, type: "review" } })).toBe(0);
    // Same IP as the first review of this business; the same device used by another account on any business.
    const second = await reviewAs(await regular(), provider.id, { deviceId: "device-abc-123" }, "1.1.1.1");
    expect(second.holdReasons).toEqual(["shared_ip"]);
    expect(second.deviceHash).toMatch(/^[0-9a-f]{40}$/);
    expect(second.ipHash).not.toContain("1.1.1.1");
    const elsewhere = await createProvider();
    const third = await reviewAs(await regular(), elsewhere.id, { deviceId: "device-abc-123" }, "2.2.2.2");
    expect(third.holdReasons).toEqual(["shared_device"]);
    // Two other reviews of this business in the last few minutes make a burst.
    const burst = await reviewAs(await regular(), provider.id, {}, "3.3.3.3");
    expect(burst.holdReasons).toEqual(["burst"]);
    // One star on a listing nobody has claimed.
    const unclaimed = await createProvider();
    expect((await reviewAs(await regular(), unclaimed.id, { rating: 1 }, "4.4.4.4")).holdReasons).toEqual(["one_star_unclaimed"]);
    expect((await reviewAs(await regular(), unclaimed.id, { rating: 2 }, "5.5.5.5")).status).toBe("published");

    // Held reviews are not public and do not count until published.
    expect((await api().get(`/api/v1/providers/${provider.slug}/reviews`)).body.total).toBe(0);
    const admin = await authed(await createStaff());
    expect((await admin.get("/api/v1/admin/reviews").query({ status: "pending" })).body.total).toBe(5);
    expect((await admin.get("/api/v1/admin/overview")).body.pendingReviews).toBe(5);
    await admin.patch(`/api/v1/admin/reviews/${first.id}`).send({ status: "published" });
    await admin.patch(`/api/v1/admin/reviews/${second.id}`).send({ status: "removed" });
    await settle();
    expect((await api().get(`/api/v1/providers/${provider.slug}/reviews`)).body.total).toBe(1);
    expect(await prisma.notification.count({ where: { userId: owner.id, type: "review" } })).toBe(1);
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: first.userId } })).title).toBe("Your review is live");
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: second.userId } })).title).toBe("Your review was not published");
  });

  it("locks the rating after a week and keeps every earlier version", async () => {
    const p = await createProvider();
    const customer = await regular();
    const review = await createReview(p.id, customer.id, { rating: 4, createdAt: ago(8 * 24 * HOUR) });
    const c = await authed(customer);
    const locked = await c.patch(`/api/v1/reviews/${review.id}`).send({ rating: 1 });
    expect(locked.status).toBe(400);
    expect(locked.body.error.details[0].path).toBe("rating");
    // Same rating plus new text is fine, but the review goes back to the admin team.
    const edit = await c.patch(`/api/v1/reviews/${review.id}`).send({ rating: 4, reviewText: "Changed my mind about this one" });
    expect(edit.body.review).toMatchObject({ rating: 4, status: "pending" });
    const saved = await prisma.review.findUniqueOrThrow({ where: { id: review.id }, include: { edits: true } });
    expect(saved.holdReasons).toEqual(["edited_after_lock"]);
    expect(saved.edits).toMatchObject([{ rating: 4, reviewText: "Great work, very quick", photos: [] }]);
    // Nothing changed: no new version.
    await c.patch(`/api/v1/reviews/${review.id}`).send({ rating: 4 });
    expect(await prisma.reviewEdit.count()).toBe(1);
    const admin = await authed(await createStaff());
    const listed = (await admin.get("/api/v1/admin/reviews").query({ status: "pending" })).body.reviews[0];
    expect(listed.edits).toHaveLength(1);
    expect(listed).not.toHaveProperty("ipHash");

    // Within the first week the rating can still change and stays live.
    const fresh = await createReview(p.id, (await regular()).id, { rating: 2 });
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: fresh.userId } });
    const changed = await (await authed(owner)).patch(`/api/v1/reviews/${fresh.id}`).send({ rating: 3 });
    expect(changed.body.review).toMatchObject({ rating: 3, status: "published" });
  });

  it("edits and deletes reviews, releasing removed photos", async () => {
    for (const f of ["a.webp", "b.webp"]) await writeFile(path.join(uploadDir, f), "x");
    const p = await createProvider();
    const customer = await createUser();
    const review = await createReview(p.id, customer.id, { photos: { create: [{ photoUrl: pub("a.webp") }, { photoUrl: pub("b.webp") }] } });
    const c = await authed(customer);
    const edit = await c.patch(`/api/v1/reviews/${review.id}`).send({ rating: 3, photos: [pub("b.webp")] });
    expect(edit.body.review).toMatchObject({ rating: 3, photos: [pub("b.webp")] });
    await settle();
    const fs = await import("node:fs/promises");
    await expect(fs.stat(path.join(uploadDir, "a.webp"))).rejects.toThrow();
    await c.patch(`/api/v1/reviews/${review.id}`).send({ photos: [] });
    await c.patch(`/api/v1/reviews/${review.id}`).send({ reviewText: "Updated and long enough" });
    expect((await c.patch(`/api/v1/reviews/${review.id}`).send({ reviewText: "tiny" })).status).toBe(400);
    expect((await c.patch("/api/v1/reviews/999").send({})).status).toBe(404);
    const stranger = await authed(await createUser());
    expect((await stranger.patch(`/api/v1/reviews/${review.id}`).send({})).status).toBe(403);
    expect((await stranger.delete(`/api/v1/reviews/${review.id}`)).status).toBe(403);
    expect((await c.delete("/api/v1/reviews/999")).status).toBe(404);
    const again = await createReview(p.id, (await createUser()).id, { photos: { create: { photoUrl: pub("c.webp") } } });
    expect((await (await authed(await createStaff())).delete(`/api/v1/reviews/${again.id}`)).body).toEqual({ ok: true });
    expect((await c.delete(`/api/v1/reviews/${review.id}`)).body).toEqual({ ok: true });
  });
  it("reports reviews and serves highlights", async () => {
    const cat = await createCategory();
    const p1 = await createProvider({ categoryId: cat.id });
    const p2 = await createProvider();
    const long = "Excellent service, arrived on time and fixed everything quickly.";
    const at = (min: number) => new Date(Date.now() - min * 60_000);
    await createReview(p1.id, (await createUser()).id, { reviewText: long, createdAt: at(40) });
    const r = await createReview(p1.id, (await createUser({ name: "Ravi Kumar Singh" })).id, { reviewText: long, createdAt: at(30) });
    await createReview(p2.id, (await createUser({ name: "Asha" })).id, { reviewText: long, rating: 4, createdAt: at(20) });
    await createReview(p2.id, (await createUser()).id, { reviewText: "Too short", createdAt: at(10) });
    const hl = await api().get("/api/v1/reviews/highlights").query({ limit: 5 });
    expect(hl.body.reviews.map((x: { authorName: string }) => x.authorName)).toEqual(["Asha", "Ravi K."]);
    expect(hl.body.reviews[1].provider.category).toMatchObject({ slug: cat.slug });
    expect(hl.body.reviews[0].provider.category).toBeNull();
    expect((await api().post(`/api/v1/reviews/${r.id}/report`).send({ reason: "Fake review" })).status).toBe(201);
    expect((await api().post("/api/v1/reviews/999/report").send({ reason: "Fake review" })).status).toBe(404);
  });
});

describe("me", () => {
  it("shows the overview, favorites and contacts", async () => {
    const u = await createUser();
    const c = await authed(u);
    const p = await createProvider();
    const hidden = await createProvider({ status: "suspended" });
    expect((await c.put(`/api/v1/me/favorites/${p.id}`)).body).toEqual({ isFavorite: true });
    await c.put(`/api/v1/me/favorites/${p.id}`);
    expect((await c.put(`/api/v1/me/favorites/${hidden.id}`)).status).toBe(404);
    await prisma.favorite.create({ data: { userId: u.id, providerId: hidden.id } });
    const lead = await createLead(p.id, { userId: u.id });
    await createReview(p.id, u.id, { leadId: lead.id });
    await prisma.notification.create({ data: { userId: u.id, title: "t", body: "b", type: "system" } });
    const overview = await c.get("/api/v1/me/overview");
    expect(overview.body.stats).toEqual({ favorites: 2, reviews: 1, contacts: 1, unreadNotifications: 1 });
    expect(overview.body.recentContacts[0]).toMatchObject({ hasReview: true, provider: { id: Number(p.id) } });
    expect((await c.get("/api/v1/me/favorites")).body.results).toHaveLength(1);
    expect((await c.get("/api/v1/me/favorites").query({ page: 1, pageSize: 1 })).body).toMatchObject({ total: 1, totalPages: 1 });
    expect((await c.get("/api/v1/me/contacts")).body).toMatchObject({ total: 1, contacts: [{ hasReview: true }] });
    await createLead(p.id, { userId: u.id });
    expect((await c.get("/api/v1/me/contacts")).body.contacts[0].hasReview).toBe(false);
    expect((await c.get("/api/v1/me/reviews")).body.reviews).toHaveLength(1);
    expect((await c.delete(`/api/v1/me/favorites/${p.id}`)).body).toEqual({ isFavorite: false });
  });
  it("manages addresses with one default", async () => {
    const u = await createUser();
    const c = await authed(u);
    const a = { addressLine: "1 Main Road", city: "Mumbai", state: "Maharashtra", pincode: "400001" };
    const first = await c.post("/api/v1/me/addresses").send(a);
    expect(first.body.address.isDefault).toBe(true);
    const second = await c.post("/api/v1/me/addresses").send({ ...a, label: "Work" });
    expect(second.body.address.isDefault).toBe(false);
    await c.post("/api/v1/me/addresses").send({ ...a, isDefault: true });
    expect((await c.get("/api/v1/me/addresses")).body.addresses.filter((x: { isDefault: boolean }) => x.isDefault)).toHaveLength(1);
    expect((await c.patch(`/api/v1/me/addresses/${second.body.address.id}`).send({ isDefault: true })).body.address.isDefault).toBe(true);
    expect((await c.patch(`/api/v1/me/addresses/${second.body.address.id}`).send({ city: "Pune" })).body.address.city).toBe("Pune");
    const other = await authed(await createUser());
    expect((await other.patch(`/api/v1/me/addresses/${second.body.address.id}`).send({})).status).toBe(404);
    expect((await other.delete(`/api/v1/me/addresses/${second.body.address.id}`)).status).toBe(404);
    expect((await c.patch("/api/v1/me/addresses/999").send({})).status).toBe(404);
    expect((await c.delete(`/api/v1/me/addresses/${first.body.address.id}`)).body).toEqual({ ok: true });
  });
  it("lists and marks notifications, and registers push tokens before confirmation", async () => {
    const u = await createUser();
    const c = await authed(u);
    const n = await prisma.notification.create({ data: { userId: u.id, title: "a", body: "b", type: "system" } });
    await prisma.notification.create({ data: { userId: u.id, title: "c", body: "d", type: "system" } });
    await c.post("/api/v1/me/notifications/read").send({ ids: [Number(n.id)] });
    expect((await c.get("/api/v1/me/notifications")).body.unread).toBe(1);
    await c.post("/api/v1/me/notifications/read");
    expect((await c.get("/api/v1/me/notifications")).body.unread).toBe(0);

    const unconfirmed = await authed(await createUser({ verified: false }));
    expect((await unconfirmed.post("/api/v1/me/push-tokens").send({ token: "ExpoPushToken[abc]", platform: "ios" })).status).toBe(201);
    expect((await c.post("/api/v1/me/push-tokens").send({ token: "ExpoPushToken[abc]", platform: "android" })).status).toBe(201);
    expect(await prisma.pushToken.findFirstOrThrow()).toMatchObject({ userId: u.id, platform: "android" });
    expect((await c.post("/api/v1/me/push-tokens").send({ token: "bad", platform: "ios" })).status).toBe(400);
    expect((await c.delete("/api/v1/me/push-tokens").send({ token: "ExpoPushToken[abc]" })).body).toEqual({ ok: true });
    expect((await c.delete("/api/v1/me/push-tokens")).status).toBe(400);
    expect(await prisma.pushToken.count()).toBe(0);
  });
});

describe("support tickets", () => {
  it("opens, lists, replies to and closes own tickets", async () => {
    const agent = await createStaff(["support"]);
    const u = await createUser({ name: "Ravi" });
    const c = await authed(u);
    const created = await c.post("/api/v1/support/tickets").send({ subject: "Cannot log in", message: "It keeps failing on me", attachments: [`${PRIVATE_FILES_URL}x.pdf`] });
    expect(created.status).toBe(201);
    const id = created.body.ticket.id;
    expect((await c.post("/api/v1/support/tickets").send({ subject: "x", message: "y" })).status).toBe(400);
    const list = await c.get("/api/v1/support/tickets");
    expect(list.body.tickets[0]).toMatchObject({ reference: expect.stringMatching(/^DNF-/) });
    expect(list.body.tickets[0]).not.toHaveProperty("assignedTo");
    await prisma.ticketMessage.createMany({
      data: [
        { ticketId: BigInt(id), authorId: agent.id, fromStaff: true, body: "We are on it" },
        { ticketId: BigInt(id), authorId: agent.id, fromStaff: true, isInternal: true, body: "secret" },
        { ticketId: BigInt(id), authorId: null, body: "guest note" },
      ],
    });
    const detail = await c.get(`/api/v1/support/tickets/${id}`);
    expect(detail.body.messages.map((m: { authorName: string }) => m.authorName)).toEqual(["Ravi", "DialNFind Support", "Ravi"]);
    expect(detail.body.messages[0].attachments[0]).toContain("sig=");

    await prisma.supportTicket.update({ where: { id: BigInt(id) }, data: { status: "resolved", assignedToId: agent.id } });
    expect((await c.post(`/api/v1/support/tickets/${id}/messages`).send({ body: "Still broken" })).status).toBe(201);
    expect((await prisma.supportTicket.findUniqueOrThrow({ where: { id: BigInt(id) } })).status).toBe("open");
    await prisma.supportTicket.update({ where: { id: BigInt(id) }, data: { assignedToId: null } });
    await c.post(`/api/v1/support/tickets/${id}/messages`).send({ body: "Hello?" });
    expect((await c.post(`/api/v1/support/tickets/${id}/close`)).body).toEqual({ ok: true });
    expect((await c.post(`/api/v1/support/tickets/${id}/messages`).send({ body: "More" })).status).toBe(400);
    const stranger = await authed(await createUser());
    expect((await stranger.get(`/api/v1/support/tickets/${id}`)).status).toBe(404);
    expect((await c.get("/api/v1/support/tickets/999")).status).toBe(404);
  });
});

describe("uploads", () => {
  it("stores re-encoded images and private documents", async () => {
    const c = await authed(await createUser());
    const up = (purpose: string, body: Buffer | string, type = "application/octet-stream") => c.post(`/api/v1/uploads?purpose=${purpose}`).set("content-type", type).send(body);
    const photo = await up("portfolio", await img(), "image/jpeg");
    expect(photo.status).toBe(201);
    expect(photo.body).toMatchObject({ contentType: "image/webp", width: 800, height: 800, url: expect.stringMatching(/\/uploads\/portfolio\/\d{4}\/\d{2}\/.+\.webp$/) });
    const png = await sharp({ create: { width: 300, height: 300, channels: 4, background: "#fff" } }).png().toBuffer();
    const webp = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#fff" } }).webp().toBuffer();
    expect((await up("logo", png)).status).toBe(201);
    expect((await up("review", webp)).status).toBe(201);
    const doc = await up("document", Buffer.from("%PDF-1.4 hello"), "application/pdf");
    expect(doc.body).toMatchObject({ contentType: "application/pdf", url: expect.stringContaining("/api/v1/files/documents/") });
    expect(doc.body.url).toContain("sig=");
    const docImage = await up("document", await img(400, 400));
    expect(docImage.body.url).toContain("/api/v1/files/documents/");
  });
  it("rejects bad uploads", async () => {
    const c = await authed(await createUser());
    const up = (purpose: string, body?: Buffer) => {
      const r = c.post(`/api/v1/uploads?purpose=${purpose}`).set("content-type", "application/octet-stream");
      return body ? r.send(body) : r;
    };
    expect((await api().post("/api/v1/uploads?purpose=avatar")).status).toBe(401);
    expect((await up("bogus", Buffer.from("x"))).status).toBe(400);
    expect((await up("avatar")).body.error.message).toBe("Choose a file to upload");
    expect((await up("avatar", Buffer.alloc(6 * 1024 * 1024))).body.error.message).toBe("The file is too large. The limit is 5 MB.");
    expect((await up("avatar", Buffer.alloc(11 * 1024 * 1024))).status).toBe(413);
    expect((await up("avatar", Buffer.from("%PDF-1.4"))).body.error.message).toBe("Upload a JPG, PNG or WebP image");
    expect((await up("document", Buffer.from("plain text"))).body.error.message).toBe("Upload a JPG, PNG, WebP or PDF file");
    expect((await up("avatar", Buffer.from([0xff]))).status).toBe(400);
    expect((await up("avatar", await img(50, 50))).body.error.message).toContain("too small");
  });
});
