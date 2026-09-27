import { describe, expect, it } from "vitest";
import { writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { uploadDir } from "../../src/storage/index.js";
import { PRIVATE_FILES_URL } from "../../src/lib/private-files.js";
import { verifyToken } from "../../src/lib/jwt.js";
import { api, authed, settle } from "../helpers/app.js";
import { createCategory, createOwner, createProvider, createStaff, createUser, seedPlans, subscribe } from "../helpers/factories.js";

const pub = (key: string) => `${env.publicUrl}/uploads/${key}`;
const listing = (categoryId: bigint, over: Record<string, unknown> = {}) => ({
  businessName: "Sharma TV", phone: "9876543210", city: "Mumbai", state: "Maharashtra", latitude: 19.07, longitude: 72.87,
  services: [{ categoryId: Number(categoryId) }], ...over,
});

describe("provider onboarding", () => {
  it("turns a customer into a provider with a new listing", async () => {
    const cat = await createCategory();
    const customer = await createUser();
    const c = await authed(customer);
    expect((await c.get("/api/v1/provider/me")).body).toEqual({ provider: null, plan: null, claims: [] });
    const res = await c.post("/api/v1/provider/onboarding").send(listing(cat.id));
    expect(res.status).toBe(201);
    // Not production and no setting: listings go live straight away.
    expect(res.body.provider.status).toBe("active");
    expect(verifyToken(res.body.token)!.role).toBe("provider");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })).role).toBe("provider");
    // The old sign-in was swapped out.
    expect((await c.get("/api/v1/provider/me")).status).toBe(401);
    const fresh = api().get("/api/v1/provider/me").set("Authorization", `Bearer ${res.body.token}`);
    expect((await fresh).body.plan.plan.code).toBe("free");
    const again = await api().post("/api/v1/provider/onboarding").set("Authorization", `Bearer ${res.body.token}`).send(listing(cat.id));
    expect(again.status).toBe(409);
  });
  it("holds new listings for review when auto approval is off", async () => {
    const cat = await createCategory();
    await prisma.setting.create({ data: { key: "auto_approve_listings", value: "false" } });
    const owner = await createUser({ role: "provider" });
    const res = await (await authed(owner)).post("/api/v1/provider/onboarding").send(listing(cat.id));
    expect(res.body).toMatchObject({ provider: { status: "pending" }, token: null });
    expect((await (await authed(owner)).post("/api/v1/provider/onboarding").send({})).status).toBe(400);
  });
  it("searches and shows claimable listings with masked phones", async () => {
    const cat = await createCategory();
    const c = await authed(await createUser());
    const p = await createProvider({ businessName: "Gupta Electricals", phone: "+919812345678", city: "Delhi", categoryId: cat.id });
    await createProvider({ businessName: "Gupta Stores", phone: "123", city: "Pune" });
    await createProvider({ businessName: "Gupta Hidden", status: "pending" });
    const found = await c.get("/api/v1/provider/claims/search").query({ q: "gupta" });
    expect(found.body.results).toHaveLength(2);
    const byPhone = await c.get("/api/v1/provider/claims/search").query({ q: "98123456" });
    expect(byPhone.body.results.map((r: { id: number }) => r.id)).toEqual([Number(p.id)]);
    const inCity = await c.get("/api/v1/provider/claims/search").query({ q: "gupta", city: "delhi" });
    expect(inCity.body.results[0]).toMatchObject({ phone: "********5678", category: cat.name, isClaimed: false });
    const short = (await c.get("/api/v1/provider/claims/search").query({ q: "gupta", city: "pune" })).body.results[0];
    expect(short).toMatchObject({ phone: "123", category: null });
    expect((await c.get("/api/v1/provider/claims/search").query({ q: "g" })).status).toBe(400);

    expect((await c.get(`/api/v1/provider/claims/listing/${p.id}`)).body.listing).toMatchObject({ businessName: "Gupta Electricals", phone: "********5678" });
    const bare = await createProvider({ userId: (await createUser()).id });
    expect((await c.get(`/api/v1/provider/claims/listing/${bare.id}`)).body.listing).toMatchObject({ category: null, isClaimed: true });
    const hidden = await prisma.provider.findFirstOrThrow({ where: { status: "pending" } });
    expect((await c.get(`/api/v1/provider/claims/listing/${hidden.id}`)).status).toBe(404);
    expect((await c.get("/api/v1/provider/claims/listing/999")).status).toBe(404);
  });
  it("starts claims with a document and refuses duplicates", async () => {
    const target = await createProvider({ phone: "+919812345678" });
    const customer = await createUser();
    const c = await authed(customer);
    const doc = `${PRIVATE_FILES_URL}documents/deed.pdf`;
    const res = await c.post("/api/v1/provider/claims").send({ providerId: Number(target.id), documentUrl: doc });
    expect(res.status).toBe(201);
    expect(res.body.claim).toMatchObject({ status: "pending", method: "document" });
    const c2 = api().post("/api/v1/provider/claims").set("Authorization", `Bearer ${res.body.token}`);
    expect((await c2.send({ providerId: Number(target.id), documentUrl: doc })).body.error.message).toMatch(/already sent a claim/);
    const me = await api().get("/api/v1/provider/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.body.claims[0]).toMatchObject({ status: "pending", provider: { phone: "********5678" } });

    const claimed = await createProvider({ userId: (await createUser()).id });
    const owner = await createOwner();
    const o = await authed(owner.user);
    expect((await o.post("/api/v1/provider/claims").send({ providerId: Number(claimed.id), documentUrl: doc })).body.error.message).toMatch(/already been claimed/);
    expect((await o.post("/api/v1/provider/claims").send({ providerId: Number(target.id), documentUrl: doc })).body.error.message).toMatch(/already manages/);
    expect((await o.post("/api/v1/provider/claims").send({ providerId: 999, documentUrl: doc })).status).toBe(404);
    expect((await o.post("/api/v1/provider/claims").send({ providerId: Number(target.id), documentUrl: "https://evil/x.pdf" })).status).toBe(400);
  });
  it("needs a signed-in, confirmed account", async () => {
    expect((await api().get("/api/v1/provider/me")).status).toBe(401);
    expect((await (await authed(await createUser({ verified: false }))).get("/api/v1/provider/me")).status).toBe(403);
  });
});

describe("provider profile", () => {
  it("requires a provider account with a listing", async () => {
    expect((await (await authed(await createUser())).get("/api/v1/provider/profile")).status).toBe(403);
    expect((await (await authed(await createUser({ role: "provider" }))).get("/api/v1/provider/profile")).status).toBe(404);
    const admin = await createStaff();
    await createProvider({ userId: admin.id });
    expect((await (await authed(admin)).get("/api/v1/provider/profile")).status).toBe(200);
  });
  it("reads and edits the profile, hours, areas and services", async () => {
    const cat = await createCategory();
    const other = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id });
    const c = await authed(user);
    const profile = await c.get("/api/v1/provider/profile");
    expect(profile.body.provider).toMatchObject({ id: Number(provider.id), checklist: expect.any(Array) });
    expect(profile.body.provider).not.toHaveProperty("location");
    expect(profile.body.provider.services[0].startingPrice).toBe(300);

    const edited = await c.patch("/api/v1/provider/profile").send({ businessName: "Renamed Shop", email: "", website: null });
    expect(edited.body.provider).toMatchObject({ businessName: "Renamed Shop", slug: "renamed-shop-mumbai", email: null });
    expect((await c.patch("/api/v1/provider/profile").send({ phone: "12" })).status).toBe(400);

    const hours = await c.put("/api/v1/provider/hours").send({ hours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" }] });
    expect(hours.body.provider.businessHours).toHaveLength(1);
    const areas = await c.put("/api/v1/provider/service-areas").send({ serviceAreas: [{ areaName: "Andheri", pincode: "400053" }] });
    expect(areas.body.provider.serviceAreas).toHaveLength(1);
    const services = await c.put("/api/v1/provider/services").send({ services: [{ categoryId: Number(other.id), startingPrice: 200, isPrimary: true }] });
    expect(services.body.provider.services.map((s: { categoryId: number }) => s.categoryId)).toEqual([Number(other.id)]);
    expect((await c.put("/api/v1/provider/services").send({ services: [] })).status).toBe(400);
  });
  it("edits service details per category and per service", async () => {
    const cat = await createCategory();
    const [tv, ac] = cat.subcategories;
    const { user, provider } = await createOwner({ categoryId: cat.id, subcategoryId: tv!.id });
    const acService = await prisma.providerService.create({ data: { providerId: provider.id, categoryId: cat.id, subcategoryId: ac!.id } });
    const tvService = await prisma.providerService.findFirstOrThrow({ where: { providerId: provider.id, subcategoryId: tv!.id } });
    const wide = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "provider", label: "Brands", fieldType: "multiselect", optionsJson: ["LG", "Sony"] } });
    const tvOnly = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, subcategoryId: tv!.id, appliesTo: "provider", label: "Max size", fieldType: "number" } });
    await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "Lead only", fieldType: "text" } });
    const noWide = await createCategory();
    await prisma.providerService.create({ data: { providerId: provider.id, categoryId: noWide.id } });
    const c = await authed(user);

    const empty = await c.get("/api/v1/provider/attributes");
    expect(empty.body.groups.map((g: { title: string }) => g.title)).toEqual([cat.name, "TV Repair"]);
    expect(empty.body.groups[0].attributes[0]).toMatchObject({ label: "Brands", options: ["LG", "Sony"], value: null });

    const save = await c.put("/api/v1/provider/attributes").send({
      values: [
        { providerServiceId: Number(acService.id), attributeId: Number(wide.id), value: ["LG"] },
        { providerServiceId: Number(tvService.id), attributeId: Number(tvOnly.id), value: 55 },
      ],
    });
    expect(save.body).toEqual({ ok: true });
    const filled = await c.get("/api/v1/provider/attributes");
    expect(filled.body.groups[0].attributes[0].value).toEqual(["LG"]);
    expect(filled.body.groups[1].attributes[0].value).toBe(55);
    // Saving the category-wide answer from another service replaces it; null clears.
    await c.put("/api/v1/provider/attributes").send({ values: [{ providerServiceId: Number(tvService.id), attributeId: Number(wide.id), value: null }] });
    expect(await prisma.attributeValue.count({ where: { attributeId: wide.id } })).toBe(0);

    expect((await c.put("/api/v1/provider/attributes").send({ values: [{ providerServiceId: 999, attributeId: Number(wide.id), value: "x" }] })).status).toBe(404);
    expect((await c.put("/api/v1/provider/attributes").send({ values: [{ providerServiceId: Number(acService.id), attributeId: Number(tvOnly.id), value: 1 }] })).status).toBe(400);
  });
  it("manages portfolio photos within the plan limit", async () => {
    const plans = await seedPlans();
    const cat = await createCategory();
    const { user, provider } = await createOwner();
    const c = await authed(user);
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await c.post("/api/v1/provider/portfolio").send({ title: `Job ${i}`, imageUrl: pub(`p${i}.webp`), categoryId: i === 0 ? Number(cat.id) : null });
      expect(res.status).toBe(201);
      ids.push(res.body.item.id);
    }
    expect((await prisma.providerPortfolio.findMany({ orderBy: { sortOrder: "asc" } })).map((p) => p.title)).toEqual(["Job 2", "Job 1", "Job 0"]);
    const limited = await c.post("/api/v1/provider/portfolio").send({ title: "Job 3", imageUrl: pub("p3.webp") });
    expect(limited.status).toBe(402);
    expect(limited.body.error.message).toBe("Your Free plan includes 3 photos. Upgrade to add more.");
    await subscribe(provider.id, plans.business.id);
    expect((await c.post("/api/v1/provider/portfolio").send({ title: "Job 3", imageUrl: pub("p3.webp") })).status).toBe(201);

    const all = (await prisma.providerPortfolio.findMany()).map((p) => Number(p.id));
    expect((await c.put("/api/v1/provider/portfolio/order").send({ ids: [...all].reverse() })).body).toEqual({ ok: true });
    expect((await c.put("/api/v1/provider/portfolio/order").send({ ids: [all[0]] })).status).toBe(400);
    expect((await c.put("/api/v1/provider/portfolio/order").send({ ids: [all[0], all[0], all[1], all[2]] })).status).toBe(400);
    expect((await c.put("/api/v1/provider/portfolio/order").send({ ids: [999, all[1], all[2], all[3]] })).status).toBe(400);

    await writeFile(path.join(uploadDir, "p0.webp"), "x");
    const cover = await c.patch(`/api/v1/provider/portfolio/${ids[0]}`).send({ isCover: true, imageUrl: pub("new.webp"), categoryId: null });
    expect(cover.body.item).toMatchObject({ isCover: true, categoryId: null });
    await settle();
    await expect(stat(path.join(uploadDir, "p0.webp"))).rejects.toThrow();
    await c.patch(`/api/v1/provider/portfolio/${ids[1]}`).send({ isCover: true, categoryId: Number(cat.id) });
    expect(await prisma.providerPortfolio.count({ where: { isCover: true } })).toBe(1);
    await c.patch(`/api/v1/provider/portfolio/${ids[1]}`).send({ title: "Renamed", imageUrl: pub("p1.webp") });
    expect((await c.patch("/api/v1/provider/portfolio/999").send({})).status).toBe(404);
    const stranger = await createOwner();
    expect((await (await authed(stranger.user)).patch(`/api/v1/provider/portfolio/${ids[1]}`).send({})).status).toBe(404);
    expect((await (await authed(stranger.user)).delete(`/api/v1/provider/portfolio/${ids[1]}`)).status).toBe(404);
    expect((await c.delete(`/api/v1/provider/portfolio/${ids[1]}`)).body).toEqual({ ok: true });
  });
  it("allows unlimited photos without a free plan row", async () => {
    const { user } = await createOwner();
    expect((await (await authed(user)).post("/api/v1/provider/portfolio").send({ title: "First", imageUrl: pub("a.webp") })).body.item.sortOrder).toBe(0);
  });
  it("submits verification documents", async () => {
    const { user } = await createOwner();
    const c = await authed(user);
    const res = await c.post("/api/v1/provider/verifications").send({ type: "business", documentUrl: `${PRIVATE_FILES_URL}documents/gst.pdf`, notes: "GST certificate" });
    expect(res.status).toBe(201);
    expect(res.body.verification.documentUrl).toContain("sig=");
    const list = await c.get("/api/v1/provider/verifications");
    expect(list.body).toMatchObject({ verificationStatus: "none", verifications: [{ type: "business", status: "pending" }] });
    expect((await c.post("/api/v1/provider/verifications").send({ type: "phone", documentUrl: `${PRIVATE_FILES_URL}x.pdf` })).status).toBe(400);
  });
});
