import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { PRIVATE_FILES_URL } from "../../src/lib/private-files.js";
import { bundleFiles, describe as describeImport, importProviderBundles } from "../../prisma/import-providers.js";
import { authed, sentMails, settle } from "../helpers/app.js";
import { createProvider, createStaff, createUser } from "../helpers/factories.js";

let dir: string;
const lines: string[] = [];
const log = (line: string) => lines.push(line);

const record = (over: Record<string, unknown> = {}) => ({
  businessName: "Cool Care AC Service",
  description: "Split and window AC repair.",
  phone: "+919933000001",
  whatsappNumber: null,
  email: null,
  website: "https://coolcare.example/",
  addressLine: "12 Sevoke Road",
  locality: "Sevoke Road",
  city: "Siliguri",
  state: "West Bengal",
  pincode: "734001",
  latitude: 26.7338,
  longitude: 88.4325,
  services: [
    { category: "home-appliances", subcategory: "ac-repair-and-service", primary: true },
    { category: "home-appliances", subcategory: "refrigerator-repair", primary: false },
  ],
  hours: [1, 2, 3, 4, 5, 6, 0].map((d) => ({ dayOfWeek: d, openTime: d ? "09:00" : null, closeTime: d ? "20:00" : null, is24x7: false })),
  sources: [{ key: "overture:a1", type: "overture", url: null }, { key: "osm:node/1", type: "osm", url: "https://www.openstreetmap.org/node/1" }],
  ...over,
});

async function writeBundle(name: string, providers: unknown[], format = "dialnfind-providers/1") {
  const file = path.join(dir, name);
  await writeFile(file, JSON.stringify({ format, providers }));
  return file;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "dnf-bundle-"));
  lines.length = 0;
  await prisma.category.create({
    data: {
      name: "Home Appliances",
      slug: "home-appliances",
      subcategories: {
        create: [
          { name: "AC Repair & Service", slug: "ac-repair-and-service" },
          { name: "Refrigerator Repair", slug: "refrigerator-repair" },
        ],
      },
    },
  });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("provider bundle import", () => {
  it("creates unclaimed live listings, with or without an email, once", async () => {
    const file = await writeBundle("providers-siliguri.json", [
      record(),
      record({ businessName: "Bad Email Plumbers", phone: "9933000002", email: "not-an-email", sources: [{ key: "osm:node/2", type: "osm", url: null }] }),
      record({ businessName: "Mystery", phone: "9933000003", services: [{ category: "gone", subcategory: null }], sources: [{ key: "osm:node/3", type: "osm" }] }),
      record({ businessName: "Bad Phone", phone: "12345", sources: [{ key: "osm:node/4", type: "osm" }] }),
      { businessName: "Half a record" },
    ]);
    const first = await importProviderBundles([file], log);
    expect(first).toEqual({ files: 1, imported: 2, alreadyImported: 0, linkedByPhone: 0, skipped: 3 });
    expect(lines).toEqual(expect.arrayContaining([
      "Provider import: Mystery skipped (none of its categories exist)",
      expect.stringMatching(/^Provider import: Bad Phone skipped \(phone: /),
      "Provider import: providers-siliguri.json #4 is malformed; skipped",
    ]));

    const cool = await prisma.provider.findFirstOrThrow({
      where: { businessName: "Cool Care AC Service" },
      include: { services: { orderBy: { id: "asc" } }, businessHours: true, sources: { orderBy: { sourceKey: "asc" } } },
    });
    expect(cool).toMatchObject({ userId: null, claimedAt: null, status: "active", verificationStatus: "none", email: null, phone: "+919933000001", slug: "cool-care-ac-service-siliguri" });
    expect(cool.services.map((s) => s.isPrimary)).toEqual([true, false]);
    expect(cool.businessHours).toHaveLength(7);
    expect(cool.sources.map((s) => [s.sourceKey, s.sourceType, s.sourceUrl])).toEqual([
      ["osm:node/1", "osm", "https://www.openstreetmap.org/node/1"],
      ["overture:a1", "overture", null],
    ]);
    // A malformed optional field is dropped, not the listing.
    expect(await prisma.provider.findFirstOrThrow({ where: { businessName: "Bad Email Plumbers" } })).toMatchObject({ email: null, phone: "+919933000002" });
    // Counted once at the end.
    expect((await prisma.category.findUniqueOrThrow({ where: { slug: "home-appliances" } })).providerCount).toBe(2);

    // Running again changes nothing; a new source of a known record is remembered against its listing.
    const again = await writeBundle("providers-siliguri.json", [record({ sources: [{ key: "overture:a1", type: "overture" }, { key: "fsq:9", type: "fsq", url: "https://foursquare.com/v/9" }] })]);
    expect(await importProviderBundles([again], log)).toEqual({ files: 1, imported: 0, alreadyImported: 1, linkedByPhone: 0, skipped: 0 });
    expect((await prisma.providerSource.findUniqueOrThrow({ where: { sourceKey: "fsq:9" } })).providerId).toBe(cool.id);
    expect(await prisma.provider.count()).toBe(2);
  });

  it("never brings back a listing the team deleted", async () => {
    const file = await writeBundle("providers-siliguri.json", [record()]);
    await importProviderBundles([file], log);
    await prisma.provider.deleteMany();
    expect((await prisma.providerSource.findUniqueOrThrow({ where: { sourceKey: "overture:a1" } })).providerId).toBeNull();
    expect(await importProviderBundles([file], log)).toMatchObject({ imported: 0, alreadyImported: 1 });
    expect(await prisma.provider.count()).toBe(0);
  });

  it("links a record to an existing listing with the same phone instead of duplicating it", async () => {
    const existing = await createProvider({ phone: "+919933000001" });
    const file = await writeBundle("providers-siliguri.json", [record(), record({ sources: [{ key: "osm:node/9", type: "osm" }] })]);
    const result = await importProviderBundles([file], log);
    // The second copy of the phone matches the first record's link, not a new listing.
    expect(result).toEqual({ files: 1, imported: 0, alreadyImported: 0, linkedByPhone: 2, skipped: 0 });
    expect(await prisma.providerSource.count({ where: { providerId: existing.id } })).toBe(3);
    expect(describeImport(result)).toBe("0 providers imported, 0 already imported, 2 matched an existing listing by phone, 0 skipped");
  });

  it("finds bundle files and ignores anything else", async () => {
    await writeBundle("providers-b.json", []);
    await writeBundle("providers-a.json", [record()], "something-else/1");
    await writeFile(path.join(dir, "categories.json"), "[]");
    expect(bundleFiles(dir).map((f) => path.basename(f))).toEqual(["providers-a.json", "providers-b.json"]);
    expect(bundleFiles(path.join(dir, "missing"))).toEqual([]);
    expect(await importProviderBundles([], log)).toEqual({ files: 0, imported: 0, alreadyImported: 0, linkedByPhone: 0, skipped: 0 });
    expect(await importProviderBundles(bundleFiles(dir), log)).toMatchObject({ files: 2, imported: 0 });
    expect(lines).toContain("Provider import: providers-a.json is not a dialnfind-providers/1 bundle; skipped");
  });
});

describe("claiming an imported listing without an email", () => {
  it("works end to end, and the owner adds a business email afterwards", async () => {
    await importProviderBundles([await writeBundle("providers-siliguri.json", [record()])], log);
    const listing = await prisma.provider.findFirstOrThrow({ where: { businessName: "Cool Care AC Service" } });
    expect(listing.email).toBeNull();

    // The business signs up with its own (real) email and finds the listing.
    const owner = await createUser({ email: "owner@coolcare.example" });
    const c = await authed(owner);
    const found = await c.get("/api/v1/provider/claims/search").query({ q: "cool care" });
    expect(found.body.results.map((r: { id: number }) => r.id)).toContain(Number(listing.id));

    const claim = await c.post("/api/v1/provider/claims").send({ providerId: Number(listing.id), documentUrl: `${PRIVATE_FILES_URL}documents/trade-licence.pdf` });
    expect(claim.status).toBe(201);

    const admin = await authed(await createStaff());
    expect((await admin.patch(`/api/v1/admin/claims/${claim.body.claim.id}`).send({ decision: "approved" })).body).toEqual({ ok: true });
    await settle();

    const claimed = await prisma.provider.findUniqueOrThrow({ where: { id: listing.id } });
    expect(claimed).toMatchObject({ userId: owner.id, email: null });
    expect(claimed.claimedAt).not.toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe("provider");
    // Mail goes to the account's own email, never to the (missing) listing email.
    expect(sentMails().filter((m) => m.subject === "Cool Care AC Service is now yours").map((m) => m.to)).toEqual(["owner@coolcare.example"]);

    const o = await authed({ id: owner.id, role: "provider" });
    const updated = await o.patch("/api/v1/provider/profile").send({ email: "hello@coolcare.example" });
    expect(updated.status).toBe(200);
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: listing.id } })).email).toBe("hello@coolcare.example");
  });
});
