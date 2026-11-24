import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { api, authed } from "../helpers/app.js";
import { createCategory, createOwner, createProvider, createStaff, createUser } from "../helpers/factories.js";
import { closeBusinessAccount } from "../../src/services/accounts.js";
import { MAX_LISTINGS_PER_ACCOUNT, categoryLabel, professionLabel, professionOfService } from "../../src/services/professions.js";

const listing = (categoryId: bigint, over: Record<string, unknown> = {}) => ({
  businessName: "Deep Saha",
  businessType: "individual",
  phone: "9876543210",
  locality: "Ghoraguli",
  city: "Siliguri",
  state: "West Bengal",
  latitude: 26.71,
  longitude: 88.43,
  services: [{ categoryId: Number(categoryId) }],
  ...over,
});

async function professions() {
  const plumbing = await createCategory({ name: "Plumbing", professionName: "Plumber" }, ["Motor & Pump Repair"]);
  await prisma.subcategory.update({ where: { id: plumbing.subcategories[0]!.id }, data: { professionName: "Motor & Pump Repair Technician" } });
  const electric = await createCategory({ name: "Electricians", professionName: "Electrician" }, ["Wiring"]);
  const movers = await createCategory({ name: "Packers & Movers" }, []);
  return { plumbing, electric, movers };
}

describe("individual professionals", () => {
  it("lists one profession per listing under the same account", async () => {
    const { plumbing, electric } = await professions();
    const signup = await authed(await createUser());
    const first = await signup.post("/api/v1/provider/onboarding").send(listing(plumbing.id));
    expect(first.status).toBe(201);
    const c = api();
    const auth = { Authorization: `Bearer ${first.body.token}` };

    const created = await prisma.provider.findUniqueOrThrow({ where: { id: BigInt(first.body.provider.id) } });
    expect(created).toMatchObject({ businessType: "individual", profession: null, slug: "deep-saha-plumber-siliguri" });

    // The same person adds a second profession; a typed title wins over the category's.
    const second = await c.post("/api/v1/provider/onboarding").set(auth).send(listing(electric.id, { profession: "Licensed Electrician" }));
    expect(second.status).toBe(201);
    expect(second.body.token).toBeNull();
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: BigInt(second.body.provider.id) } })).slug).toBe("deep-saha-licensed-electrician-siliguri");

    const me = (await c.get("/api/v1/provider/me").set(auth)).body;
    expect(me).toMatchObject({ accountType: "individual", canAddListing: true, maxListings: MAX_LISTINGS_PER_ACCOUNT });
    expect(me.listings.map((l: { professionLabel: string }) => l.professionLabel)).toEqual(["Plumber", "Licensed Electrician"]);
    expect(me.listings[1]).toMatchObject({ primaryCategory: { name: "Electricians" }, locality: "Ghoraguli" });
    expect(me.provider.id).toBe(first.body.provider.id);
    expect((await c.get("/api/v1/provider/me").set(auth).set("X-Listing-Id", String(second.body.provider.id))).body.provider.id).toBe(second.body.provider.id);

    // Each provider-app request is about the listing the header names.
    const profile = await c.get("/api/v1/provider/profile").set(auth).set("X-Listing-Id", String(second.body.provider.id));
    expect(profile.body.provider).toMatchObject({ businessName: "Deep Saha", profession: "Licensed Electrician" });
    expect((await c.get("/api/v1/provider/profile").set(auth)).body.provider.id).toBe(first.body.provider.id);

    // The same profession twice, a mixed listing, and a business listing are refused.
    const dup = await c.post("/api/v1/provider/onboarding").set(auth).send(listing(plumbing.id, { businessName: "Deep" }));
    expect(dup.status).toBe(409);
    expect(dup.body.error.message).toBe("You already have a listing as Plumber. Add services to that listing instead.");
    const mixed = await c.post("/api/v1/provider/onboarding").set(auth).send(listing(plumbing.id, { profession: "Handyman", services: [{ categoryId: Number(plumbing.id) }, { categoryId: Number(electric.id) }] }));
    expect(mixed.status).toBe(400);
    expect(mixed.body.error.message).toContain("covers one profession");
    expect((await c.post("/api/v1/provider/onboarding").set(auth).send(listing(plumbing.id, { businessType: "company", businessName: "Saha Services" }))).status).toBe(409);
    // A service with its own profession name is a different profession in the same category.
    const pump = await c.post("/api/v1/provider/onboarding").set(auth).send(listing(plumbing.id, { services: [{ categoryId: Number(plumbing.id), subcategoryId: Number(plumbing.subcategories[0]!.id) }] }));
    expect(pump.status).toBe(201);
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: BigInt(pump.body.provider.id) } })).slug).toBe("deep-saha-motor-and-pump-repair-technician-siliguri");
  });

  it("caps an individual's listings and keeps a business to one", async () => {
    const { plumbing, movers } = await professions();
    const { user } = await createOwner({ businessType: "individual", categoryId: plumbing.id });
    for (let i = 1; i < MAX_LISTINGS_PER_ACCOUNT; i++) await createProvider({ userId: user.id, businessType: "individual", profession: `Job ${i}` });
    const full = await (await authed(user)).post("/api/v1/provider/onboarding").send(listing(plumbing.id, { profession: "Another job" }));
    expect(full.body.error.message).toBe(`An account can list up to ${MAX_LISTINGS_PER_ACCOUNT} professions`);
    expect((await (await authed(user)).get("/api/v1/provider/me")).body.canAddListing).toBe(false);

    const business = await createOwner({ businessName: "ABC Services", categoryId: movers.id });
    const c = await authed(business.user);
    expect((await c.get("/api/v1/provider/me")).body).toMatchObject({ accountType: "business", canAddListing: false });
    const more = await c.post("/api/v1/provider/onboarding").send(listing(plumbing.id));
    expect(more.status).toBe(409);
    expect(more.body.error.message).toContain("Only individual professionals can have more than one listing");
  });

  it("keeps the account type consistent when a listing is edited", async () => {
    const { plumbing, electric } = await professions();
    const { user, provider } = await createOwner({ businessName: "Deep Saha", businessType: "individual", categoryId: plumbing.id, city: "Siliguri" });
    const other = await createProvider({ userId: user.id, businessType: "individual", categoryId: electric.id });
    const c = await authed(user);
    const toBusiness = await c.patch("/api/v1/provider/profile").send({ businessType: "company" });
    expect(toBusiness.status).toBe(409);
    expect(toBusiness.body.error.message).toContain("more than one listing");

    // An individual listing keeps to one category.
    const mixed = await c.put("/api/v1/provider/services").send({ services: [{ categoryId: Number(plumbing.id) }, { categoryId: Number(electric.id) }] });
    expect(mixed.status).toBe(400);
    // A new profession title gives the page a new address.
    const titled = await c.patch("/api/v1/provider/profile").send({ profession: "Master Plumber" });
    expect(titled.body.provider).toMatchObject({ profession: "Master Plumber", slug: "deep-saha-master-plumber-siliguri" });
    expect((await c.patch("/api/v1/provider/profile").send({ profession: "" })).body.provider).toMatchObject({ profession: null, slug: "deep-saha-plumber-siliguri" });

    // With one listing left the account can become a business; the profession title goes.
    await prisma.provider.update({ where: { id: other.id }, data: { userId: null } });
    await prisma.provider.update({ where: { id: provider.id }, data: { profession: "Plumber" } });
    const business = await c.patch("/api/v1/provider/profile").send({ businessType: "company", businessName: "Saha Plumbing" });
    expect(business.body.provider).toMatchObject({ businessType: "company", profession: null, slug: "saha-plumbing-siliguri" });
    expect((await c.patch("/api/v1/provider/profile").send({ profession: "Ignored" })).body.provider.profession).toBeNull();
    await c.put("/api/v1/provider/services").send({ services: [{ categoryId: Number(plumbing.id) }, { categoryId: Number(electric.id) }] });
    const back = await c.patch("/api/v1/provider/profile").send({ businessType: "individual" });
    expect(back.status).toBe(400);
    await c.put("/api/v1/provider/services").send({ services: [{ categoryId: Number(plumbing.id) }] });
    expect((await c.patch("/api/v1/provider/profile").send({ businessType: "individual", businessName: "Deep Saha" })).body.provider).toMatchObject({ businessType: "individual", slug: "deep-saha-plumber-siliguri" });
  });

  it("shows individuals as name, profession and area, and businesses as name, category and area", async () => {
    const { plumbing, electric, movers } = await professions();
    const { user, provider } = await createOwner({ businessName: "Deep Saha", businessType: "individual", locality: "Ghoraguli", city: "Siliguri", categoryId: plumbing.id, slug: "deep-saha-plumber" });
    await createProvider({ userId: user.id, businessName: "Deep Saha", businessType: "individual", city: "Siliguri", categoryId: electric.id, slug: "deep-saha-electrician" });
    const biz = await createProvider({ businessName: "ABC Services", city: "Siliguri", categoryId: plumbing.id, slug: "abc-services" });
    await prisma.providerService.create({ data: { providerId: biz.id, categoryId: electric.id } });
    await createProvider({ businessName: "Movers", city: "Siliguri", categoryId: movers.id });

    const all = (await api().get("/api/v1/search/providers").query({ city: "Siliguri", pageSize: 20 })).body.results as Record<string, unknown>[];
    const card = all.find((r) => r.slug === "deep-saha-plumber")!;
    expect(card).toMatchObject({ businessName: "Deep Saha", businessType: "individual", profession: "Plumber", categoryLabel: "Plumber", serviceAreaLabel: "Ghoraguli" });
    expect(all.find((r) => r.slug === "abc-services")).toMatchObject({ businessType: "company", profession: null, categoryLabel: "Plumbing & Electricians", serviceAreaLabel: "Siliguri" });

    const people = (await api().get("/api/v1/search/providers").query({ city: "Siliguri", type: "individual" })).body.results;
    expect(people.map((r: { slug: string }) => r.slug).sort()).toEqual(["deep-saha-electrician", "deep-saha-plumber"]);
    const businesses = (await api().get("/api/v1/search/providers").query({ city: "Siliguri", type: "business" })).body;
    expect(businesses.total).toBe(2);
    expect((await api().get("/api/v1/search/providers").query({ type: "people" })).status).toBe(400);

    // Searching for the profession finds its category.
    const plumbers = (await api().get("/api/v1/search/providers").query({ q: "plumber", city: "Siliguri" })).body;
    expect(plumbers.resolved.category.name).toBe("Plumbing");
    const titled = (await api().get("/api/v1/search/providers").query({ q: "pump repair technician", city: "Siliguri" })).body;
    expect(titled.resolved.subcategory.name).toBe("Motor & Pump Repair");
    const suggest = (await api().get("/api/v1/search/suggest").query({ q: "Deep" })).body.suggestions;
    expect(suggest[0]).toMatchObject({ type: "provider", accountType: "individual" });
    expect((await api().get("/api/v1/search/suggest").query({ q: "electrician" })).body.suggestions.some((s: { label: string }) => s.label === "Electricians")).toBe(true);

    // The profile links the person's other professions.
    const page = (await api().get(`/api/v1/providers/${provider.slug}`)).body.provider;
    expect(page.otherListings).toEqual([{ slug: "deep-saha-electrician", profession: "Electrician", serviceAreaLabel: "Siliguri" }]);
    expect(page.seo.title).toContain("Deep Saha");
    expect(page.seo.service).toBe("Plumber");
    expect((await api().get("/api/v1/providers/abc-services")).body.provider.otherListings).toEqual([]);
  });

  it("lists the professions an individual can pick", async () => {
    const { plumbing } = await professions();
    await createCategory({ name: "Hidden", professionName: "Hidden Pro", isActive: false }, []);
    await createCategory({ name: "Plumbing again", professionName: "plumber" }, []);
    const { professions: list } = (await api().get("/api/v1/categories/professions")).body;
    expect(list.map((p: { label: string }) => p.label)).toEqual(["Electrician", "Motor & Pump Repair Technician", "Plumber"]);
    expect(list[1]).toMatchObject({ categoryId: Number(plumbing.id), subcategoryId: Number(plumbing.subcategories[0]!.id), subcategoryName: "Motor & Pump Repair" });
    expect(list[2]).toMatchObject({ categoryName: "Plumbing", subcategoryId: null });

    const admin = await authed(await createStaff());
    const updated = await admin.patch(`/api/v1/categories/${plumbing.id}`).send({ professionName: "" });
    expect(updated.body.category.professionName).toBeNull();
    const sub = await admin.patch(`/api/v1/categories/subcategories/${plumbing.subcategories[0]!.id}`).send({ professionName: "Pump Mechanic" });
    expect(sub.body.subcategory.professionName).toBe("Pump Mechanic");
  });

  it("keeps claims and admin ownership within the account rules", async () => {
    const { plumbing } = await professions();
    const business = await createOwner({ businessName: "ABC Services" });
    const listingToClaim = await createProvider({ businessName: "Old Shop", categoryId: plumbing.id });
    const claim = await prisma.providerClaim.create({ data: { providerId: listingToClaim.id, userId: business.user.id } });
    const admin = await authed(await createStaff());
    const decided = await admin.patch(`/api/v1/admin/claims/${claim.id}`).send({ decision: "approved" });
    expect(decided.status).toBe(409);

    // An individual can be given another individual listing for a different profession.
    const person = await createOwner({ businessName: "Deep Saha", businessType: "individual", profession: "Electrician" });
    const plumberListing = await createProvider({ businessName: "Deep Saha", businessType: "individual", categoryId: plumbing.id });
    expect((await admin.post(`/api/v1/admin/providers/${plumberListing.id}/owner`).send({ userId: Number(person.user.id) })).body).toMatchObject({ ok: true });
    const user = (await admin.get(`/api/v1/admin/users/${person.user.id}`)).body.user;
    expect(user.providers).toHaveLength(2);
    expect(user.provider.id).toBe(Number(person.provider.id));
    const list = (await admin.get("/api/v1/admin/users").query({ q: "user" })).body.users.find((u: { id: number }) => u.id === Number(person.user.id));
    expect(list.provider.id).toBe(Number(person.provider.id));
    const candidates = (await admin.get(`/api/v1/admin/providers/${plumberListing.id}/owner-candidates`).query({ q: person.user.email })).body;
    expect(candidates.users[0].providers).toHaveLength(2);

    // The admin list filters by account type.
    const people = (await admin.get("/api/v1/admin/providers").query({ type: "individual" })).body.providers;
    expect(people.map((p: { businessName: string }) => p.businessName)).toEqual(["Deep Saha", "Deep Saha"]);
    expect((await admin.get("/api/v1/admin/providers").query({ type: "business" })).body.total).toBe(2);

    // The signed-in user carries every listing, and the first as `provider`.
    const session = (await (await authed(person.user)).get("/api/v1/auth/me")).body.user;
    expect(session.providers).toHaveLength(2);
    expect(session.provider.id).toBe(Number(person.provider.id));

    // Closing the account closes every listing.
    await closeBusinessAccount(person.user.id);
    expect(await prisma.provider.count({ where: { userId: person.user.id, status: "suspended" } })).toBe(2);
    await closeBusinessAccount((await createUser()).id);
  });

  it("imports individual professionals from the admin CSV", async () => {
    const cat = await createCategory({ name: "Plumbing", slug: "plumbing", professionName: "Plumber" }, []);
    const admin = await authed(await createStaff());
    const header = "business_name,phone,category,city,state,latitude,longitude,account_type,profession";
    const csv = [header, "Ravi Das,9876500001,plumbing,Siliguri,West Bengal,26.7,88.4,individual,", "Das Plumbing,9876500002,plumbing,Siliguri,West Bengal,26.7,88.4,,Ignored", "Bad,9876500003,plumbing,Siliguri,West Bengal,26.7,88.4,crew,"].join("\n");
    const dry = (await admin.post("/api/v1/admin/providers/import").send({ csv, dryRun: true })).body;
    expect(dry.rows[2].errors[0]).toContain('Account type must be "individual" or "business"');
    const csvOk = csv.split("\n").slice(0, 3).join("\n");
    await admin.post("/api/v1/admin/providers/import").send({ csv: csvOk, dryRun: false });
    const rows = await prisma.provider.findMany({ orderBy: { id: "asc" }, select: { businessName: true, businessType: true, profession: true, slug: true } });
    expect(rows).toEqual([
      { businessName: "Ravi Das", businessType: "individual", profession: null, slug: "ravi-das-plumber-siliguri" },
      { businessName: "Das Plumbing", businessType: "company", profession: null, slug: "das-plumbing-siliguri" },
    ]);
    expect(cat.id).toBeDefined();
  });

  it("labels services and listings", () => {
    const category = { id: 1n, name: "Home Appliances", professionName: "Appliance Repair Technician" };
    expect(professionOfService({ category, subcategory: { name: "AC Repair", professionName: "AC Technician" } })).toBe("AC Technician");
    expect(professionOfService({ category, subcategory: { name: "Geyser Repair", professionName: null } })).toBe("Appliance Repair Technician");
    expect(professionOfService({ category: { name: "Misc" }, subcategory: { name: "Odd Jobs" } })).toBe("Odd Jobs");
    expect(professionLabel({ businessType: "individual" }, null)).toBeNull();
    expect(professionLabel({ businessType: "individual", profession: " " }, { category })).toBe("Appliance Repair Technician");
    expect(professionLabel({ businessType: "company", profession: "x" }, { category })).toBeNull();
    expect(categoryLabel([])).toBeNull();
    const cat = (id: bigint, name: string) => ({ category: { id, name } });
    expect(categoryLabel([cat(1n, "A"), cat(1n, "A"), cat(2n, "B"), cat(3n, "C"), cat(4n, "D")])).toBe("A & B +2");
  });
});

describe("profession helpers", () => {
  it("names a profession with or without a main service", async () => {
    const { professionFor, assertCanOwnAnother } = await import("../../src/services/professions.js");
    const cat = await createCategory({ name: "Misc" }, ["Odd Jobs"]);
    expect(professionOfService({ category: { name: "Misc" } })).toBe("Misc");
    expect(await professionFor("company", "x", { categoryId: cat.id })).toBeNull();
    expect(await professionFor("individual", " Handyman ", null)).toBe("Handyman");
    expect(await professionFor("individual", null, undefined)).toBeNull();
    expect(await professionFor("individual", null, { categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id })).toBe("Odd Jobs");
    expect(await professionFor("individual", null, { categoryId: 999999 })).toBeNull();
    // Without a main service only the typed titles are compared.
    const { user } = await createOwner({ businessType: "individual", profession: "Painter" });
    await expect(assertCanOwnAnother(user.id, { businessType: "individual", profession: "painter" })).rejects.toThrow("You already have a listing as Painter");
    await expect(assertCanOwnAnother(user.id, { businessType: "individual" })).resolves.toBeUndefined();
  });
  it("keeps the address when a new title gives the same one", async () => {
    const plumbing = await createCategory({ name: "Plumbing", professionName: "Plumber" }, []);
    const { user, provider } = await createOwner({ businessName: "Deep Saha", businessType: "individual", city: "Siliguri", categoryId: plumbing.id, slug: "deep-saha-plumber-siliguri" });
    const res = await (await authed(user)).patch("/api/v1/provider/profile").send({ profession: "Plumber" });
    expect(res.body.provider).toMatchObject({ profession: "Plumber", slug: provider.slug });
    const admin = await authed(await createStaff());
    expect((await admin.patch(`/api/v1/categories/subcategories/${(await createCategory({}, ["X"])).subcategories[0]!.id}`).send({ professionName: "" })).body.subcategory.professionName).toBeNull();
  });
});
