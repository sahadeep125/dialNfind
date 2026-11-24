import { describe, expect, it, vi } from "vitest";
import { writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { uploadDir } from "../../src/storage/index.js";
import { authed, json, mockFetch, sentMails, settle } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createStaff, createUser } from "../helpers/factories.js";

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
    expect((await give("nobody@example.com")).body.error.message).toBe("Enter the owner's name to create their account");
    expect((await give("off@example.com")).status).toBe(404);
    expect((await give("staff@example.com")).body.error.message).toBe("Team accounts cannot own a listing");
    expect((await give("busy@example.com")).body.error.message).toContain("This account already manages Other Biz");
    expect((await give("new@example.com")).body).toMatchObject({ ok: true });
    expect((await give("busy@example.com", owner.provider.id)).body).toMatchObject({ ok: true });
    await settle();
    expect(sentMails().map((m) => m.subject)).toEqual(["Omega is now yours on KaajVa", "Other Biz is now yours on KaajVa"]);
    expect((await c.delete(`/api/v1/admin/providers/${listing.id}/owner`)).body).toEqual({ ok: true });
    expect((await c.delete(`/api/v1/admin/providers/${listing.id}/owner`)).body.error.message).toBe("This listing has no owner");
  });
  it("claims a listing for a provider picked from search or a pending claim", async () => {
    const c = await authed(await createStaff(["providers"]));
    const listing = await createProvider({ businessName: "Sigma Salon" });
    const claimant = await createUser({ name: "Rita Das", email: "rita@example.com" });
    const other = await createUser({ name: "Rita Roy", email: "roy@example.com" });
    await createUser({ name: "Rita Off", email: "ritaoff@example.com", status: "suspended" });
    await createStaff("super", { name: "Rita Staff", email: "ritastaff@example.com" });
    const claim = await prisma.providerClaim.create({ data: { providerId: listing.id, userId: claimant.id } });
    await prisma.providerClaim.create({ data: { providerId: listing.id, userId: other.id } });
    const found = (await c.get(`/api/v1/admin/providers/${listing.id}/owner-candidates`).query({ q: "rita" })).body;
    expect(found.claims.map((x: { user: { email: string } }) => x.user.email)).toEqual(["rita@example.com", "roy@example.com"]);
    expect(found.users.map((u: { email: string }) => u.email).sort()).toEqual(["rita@example.com", "roy@example.com"]);
    expect((await c.get(`/api/v1/admin/providers/${listing.id}/owner-candidates`)).body.users).toEqual([]);
    expect((await c.post(`/api/v1/admin/providers/${listing.id}/owner`).send({})).status).toBe(400);
    expect((await c.post(`/api/v1/admin/providers/${listing.id}/owner`).send({ userId: 999999 })).status).toBe(404);
    expect((await c.post(`/api/v1/admin/providers/${listing.id}/owner`).send({ userId: Number(claimant.id) })).body).toMatchObject({ ok: true });
    expect(await prisma.provider.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ userId: claimant.id });
    expect(await prisma.user.findUniqueOrThrow({ where: { id: claimant.id } })).toMatchObject({ role: "provider" });
    expect(await prisma.providerClaim.findUniqueOrThrow({ where: { id: claim.id } })).toMatchObject({ status: "approved" });
    expect((await prisma.providerClaim.findMany({ where: { userId: other.id } }))[0]!.status).toBe("pending");
    await settle();
    const mail = sentMails()[0]!;
    expect(mail).toMatchObject({ to: "rita@example.com", subject: "Sigma Salon is now yours on KaajVa" });
    expect(mail.text).not.toContain("Password:");
  });
  it("creates the owner's account with a generated password and keeps the uploaded claim document", async () => {
    const c = await authed(await createStaff(["providers"]));
    const listing = await createProvider({ businessName: "Kappa Movers", city: "Siliguri" });
    const documentUrl = `${env.publicUrl}/api/v1/files/documents/deed.pdf`;
    const claim = (body: Record<string, unknown>) => c.post(`/api/v1/admin/providers/${listing.id}/owner`).send(body);
    expect((await claim({ email: "owner@example.com", name: "Anil Rai", documentUrl: "https://elsewhere.example/x.pdf" })).status).toBe(400);
    const res = await claim({ email: "Owner@Example.com", name: "Anil Rai", phone: "9876500000", documentUrl });
    expect(res.body).toMatchObject({ ok: true, accountCreated: true, temporaryPassword: expect.any(String) });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@example.com" } });
    expect(owner).toMatchObject({ name: "Anil Rai", role: "provider", phone: "+919876500000", status: "active" });
    expect(owner.emailVerifiedAt).not.toBeNull();
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: listing.id } })).userId).toBe(owner.id);
    expect(await prisma.providerClaim.findFirstOrThrow({ where: { providerId: listing.id } })).toMatchObject({ userId: owner.id, status: "approved", method: "document", documentUrl });
    const login = await c.post("/api/v1/auth/login").send({ email: "owner@example.com", password: res.body.temporaryPassword });
    expect(login.status).toBe(200);
    await settle();
    const mail = sentMails().find((m) => m.to === "owner@example.com")!;
    expect(mail.subject).toBe("Kappa Movers is now yours on KaajVa");
    expect(mail.text).toContain(`Password: ${res.body.temporaryPassword}`);
    expect(mail.text).toContain("Business: Kappa Movers");
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
    // Files are removed in the background after the response; wait until they are gone.
    for (const f of ["logo.webp", "p.webp", "r.webp"]) await vi.waitFor(() => expect(stat(path.join(uploadDir, f))).rejects.toThrow(), { timeout: 3000 });
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
  it("lists leads and decides disputes", async () => {
    const c = await authed(await createStaff(["leads"]));
    const { user, provider } = await createOwner();
    const charged = await createLead(provider.id, { disputeStatus: "open", disputedAt: new Date(), channel: "whatsapp" });
    const plain = await createLead(provider.id, { disputeStatus: "open", disputedAt: new Date() });
    await createLead(provider.id, { createdAt: new Date(Date.now() - 40 * DAY) });
    const q = (query: Record<string, string | number>) => c.get("/api/v1/admin/leads").query(query).then((r) => r.body);
    expect((await q({})).openDisputes).toBe(2);
    expect((await q({ dispute: "open" })).total).toBe(2);
    expect((await q({ dispute: "any" })).total).toBe(2);
    expect((await q({ channel: "whatsapp", providerId: Number(provider.id), days: 7 })).total).toBe(1);

    const accepted = await c.patch(`/api/v1/admin/leads/${charged.id}/dispute`).send({ decision: "accepted" });
    expect(accepted.body).toEqual({ ok: true });
    expect((await c.patch(`/api/v1/admin/leads/${charged.id}/dispute`).send({ decision: "accepted" })).status).toBe(400);
    expect((await c.patch(`/api/v1/admin/leads/${plain.id}/dispute`).send({ decision: "rejected" })).body).toEqual({ ok: true });
    const noted = await createLead(provider.id, { disputeStatus: "open" });
    await c.patch(`/api/v1/admin/leads/${noted.id}/dispute`).send({ decision: "rejected", note: "Checked the call log" });
    const plainAccept = await createLead(provider.id, { disputeStatus: "open" });
    await c.patch(`/api/v1/admin/leads/${plainAccept.id}/dispute`).send({ decision: "accepted" });
    expect((await c.patch("/api/v1/admin/leads/999/dispute").send({ decision: "accepted" })).status).toBe(404);
    await settle();
    const bodies = (await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } })).map((n) => n.body);
    expect(bodies).toEqual([
      "It no longer counts in your numbers.",
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
});

describe("admin operations", () => {
  it("builds the overview and analytics", async () => {
    const c = await authed(await createStaff(["analytics"]));
    const cat = await createCategory({ name: "Plumbing" });
    const { provider } = await createOwner({ categoryId: cat.id, city: "Pune" });
    await createProvider({ status: "pending" });
    await createLead(provider.id, { categoryId: cat.id });
    await createLead(provider.id, { channel: "whatsapp" });
    await createReview(provider.id, (await createUser()).id);
    await prisma.supportTicket.create({ data: { name: "n", email: "e", subject: "s" } });
    const overview = await (await authed(await createStaff())).get("/api/v1/admin/overview");
    expect(overview.body).toMatchObject({ providers: 2, activeProviders: 1, pendingProviders: 1, leads30: 2, reviews30: 1, openTickets: 1 });
    expect(overview.body).not.toHaveProperty("revenue30");
    expect(overview.body).not.toHaveProperty("activeSubscriptions");
    expect(overview.body.leadSeries).toHaveLength(14);
    expect(overview.body.leadSeries.at(-1).value).toBe(2);

    const analytics = await c.get("/api/v1/admin/analytics").query({ days: 7 });
    expect(analytics.body.totals).toEqual({ signups: expect.any(Number), providers: expect.any(Number), leads: 2, reviews: 1, tickets: 1 });
    expect(analytics.body.series).not.toHaveProperty("revenue");
    expect(analytics.body.leadsByChannel).toHaveLength(2);
    expect(analytics.body.topCategories).toEqual([{ name: "Plumbing", count: 1 }]);
    expect(analytics.body.topCities).toEqual([{ city: "Pune", count: 2 }]);
    expect(analytics.body.topProviders[0]).toMatchObject({ id: Number(provider.id), leads: 2 });
    expect((await c.get("/api/v1/admin/analytics")).body.days).toBe(30);
    expect((await c.get("/api/v1/admin/analytics").query({ days: 8 })).status).toBe(400);
    const today = await c.get("/api/v1/admin/analytics").query({ days: 1 });
    expect(today.body.series.leads).toHaveLength(1);
    expect(today.body.totals).toMatchObject({ leads: 2 });

    const leads = await c.get("/api/v1/admin/analytics/details").query({ metric: "leads", days: 1 });
    expect(leads.body).toMatchObject({ metric: "leads", days: 1, total: 2, previous: 0 });
    expect(leads.body.breakdowns[0]).toEqual({ title: "By channel", items: expect.arrayContaining([{ label: "Phone call", value: 1 }, { label: "WhatsApp", value: 1 }]) });
    expect(leads.body.recent).toHaveLength(2);
    expect(leads.body.recent[0].to).toBe(`/providers/${provider.id}`);
    expect((await c.get("/api/v1/admin/analytics/details").query({ metric: "revenue", days: 7 })).status).toBe(400);
    for (const metric of ["signups", "providers", "reviews", "tickets"]) {
      const r = await c.get("/api/v1/admin/analytics/details").query({ metric, days: 30 });
      expect(r.status).toBe(200);
      expect(r.body.total).toBeGreaterThan(0);
    }
    expect((await c.get("/api/v1/admin/analytics/details").query({ metric: "nope" })).status).toBe(400);
  });
  it("shows a provider's full detail", async () => {
    const c = await authed(await createStaff(["providers"]));
    const { provider } = await createOwner();
    await createLead(provider.id);
    const res = await c.get(`/api/v1/admin/providers/${provider.id}`);
    expect(res.body).toMatchObject({ stats: { leads30: 1, leadsAll: 1, openTickets: 0 } });
    expect(res.body).not.toHaveProperty("plan");
    for (const key of ["subscriptions", "invoices", "sponsoredListings"]) expect(res.body.provider).not.toHaveProperty(key);
    expect(res.body.provider).not.toHaveProperty("location");
    expect((await c.get("/api/v1/admin/providers/999")).status).toBe(404);
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
    const c = await authed(await createStaff());
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id });
    const customer = await createUser();
    await createLead(provider.id, { userId: customer.id, subcategoryId: cat.subcategories[0]!.id, customerReportedResponse: true, disputeStatus: "open" });
    await createLead(provider.id, { categoryId: cat.id, customerReportedResponse: false });
    await createLead(provider.id);
    await createReview(provider.id, customer.id, { reviewText: "=HYPERLINK()" });
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
    expect(await prisma.adminActivityLog.count({ where: { action: "export" } })).toBe(5);

    expect((await c.get("/api/v1/admin/export/nothing")).status).toBe(404);
    for (const removed of ["transactions", "subscriptions", "invoices"]) expect((await c.get(`/api/v1/admin/export/${removed}`)).status).toBe(404);
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
