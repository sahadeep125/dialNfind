import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { parseCsv } from "../../src/lib/csv.js";
import { api, authed, json, mockFetch } from "../helpers/app.js";
import { createCategory, createOwner, createProvider, createStaff } from "../helpers/factories.js";

type Row = { row: number; status: string; errors: string[]; warnings: string[]; changes: { column: string; from: string; to: string }[]; geocoded: boolean };

describe("admin bulk update of listings", () => {
  it("downloads current data that uploads again with no changes", async () => {
    const c = await authed(await createStaff());
    await createProvider({ businessName: "Alpha", phone: "+919000000001", email: "a@b.co", pincode: "400053", seoNoIndex: true });
    await createProvider({ businessName: "Beta", phone: "+919000000002", businessType: "individual", profession: "Plumber" });
    const csv = (await c.get("/api/v1/admin/export/provider-updates").buffer(true).parse((res, cb) => {
      let data = "";
      res.on("data", (d: Buffer) => (data += d.toString()));
      res.on("end", () => cb(null, data));
    })).body as string;
    const [header, first] = parseCsv(csv);
    expect(header.slice(0, 4)).toEqual(["id", "business_name", "account_type", "profession"]);
    expect(first).toContain("'+919000000001");
    expect(first).toContain("yes");

    const dry = await c.post("/api/v1/admin/providers/bulk-update").send({ csv });
    expect(dry.body).toMatchObject({ dryRun: true, total: 2, toUpdate: 0, unchanged: 2, failed: 0, ignoredColumns: [] });
  });

  it("previews changes, then saves only what changed", async () => {
    const c = await authed(await createStaff());
    const a = await createProvider({ businessName: "Alpha Pipes", phone: "+919000000001", email: "old@a.co", city: "Pune" });
    const b = await createProvider({ businessName: "Beta Taps", phone: "+919000000002", description: "Old text" });
    const d = await createProvider({ businessName: "Delta", phone: "+919000000004" });
    const e = await createProvider({ businessName: "Echo", phone: "+919000000005" });
    const csv = [
      "id,business_name,phone,email,description,accepts_calls,latitude,longitude,city,category",
      `${a.id},Alpha Pipe Works,,new@a.co,,no,,,,plumbing`,
      `,,9000000002,,-,,,,,`,
      `${d.id},,9000000001,,,,,,,`,
      `999,,,,,,,,,`,
      `${a.id},,,,,,,,,`,
      `${e.id},,,,,maybe,,,,`,
      `,Someone,,,,,,,,`,
    ].join("\n");
    const dry = await c.post("/api/v1/admin/providers/bulk-update").send({ csv });
    expect(dry.body).toMatchObject({ dryRun: true, total: 7, toUpdate: 2, updated: 0, ignoredColumns: ["category"] });
    const rows = dry.body.rows as Row[];
    expect(rows[0].changes).toEqual([
      { column: "business_name", from: "Alpha Pipes", to: "Alpha Pipe Works" },
      { column: "email", from: "old@a.co", to: "new@a.co" },
      { column: "accepts_calls", from: "yes", to: "no" },
    ]);
    expect(rows[1].changes).toEqual([{ column: "description", from: "Old text", to: "" }]);
    expect(rows[2].errors).toEqual(["Another listing already uses +919000000001"]);
    expect(rows[3].errors).toEqual(["No listing with id 999"]);
    expect(rows[4].errors).toEqual(["This listing is already updated on row 2"]);
    expect(rows[5].errors).toEqual(["accepts_calls must be yes or no, not \"maybe\""]);
    expect(rows[6].errors).toEqual(["Add the listing id or its phone number"]);
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: a.id } })).businessName).toBe("Alpha Pipes");

    const real = await c.post("/api/v1/admin/providers/bulk-update").send({ csv, dryRun: false });
    expect(real.body).toMatchObject({ dryRun: false, updated: 2 });
    const after = await prisma.provider.findUniqueOrThrow({ where: { id: a.id } });
    expect(after).toMatchObject({ businessName: "Alpha Pipe Works", email: "new@a.co", acceptsCalls: false, city: "Pune" });
    expect(after.slug).not.toBe(a.slug);
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: b.id } })).description).toBeNull();
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: d.id } })).phone).toBe("+919000000004");
    expect(await prisma.adminActivityLog.count({ where: { action: "provider.edit" } })).toBe(2);
  });

  it("moves the pin for a new address only when the coordinates are left blank", async () => {
    const c = await authed(await createStaff());
    const p = await createProvider({ phone: "+919000000001" });
    const q = await createProvider({ phone: "+919000000002" });
    mockFetch(() => json([{ lat: "18.5", lon: "73.8", name: "Kothrud", display_name: "Kothrud", address: { city: "Pune" } }]));
    const csv = ["id,locality,city,latitude,longitude", `${p.id},Kothrud,Pune,,`, `${q.id},Kothrud,Pune,19.076,72.8777`].join("\n");
    const rows = (await c.post("/api/v1/admin/providers/bulk-update").send({ csv })).body.rows as Row[];
    expect(rows[0].geocoded).toBe(true);
    expect(rows[0].changes.map((ch) => ch.column)).toEqual(["locality", "city", "latitude", "longitude"]);
    expect(rows[1].geocoded).toBe(false);
    expect(rows[1].warnings[0]).toMatch(/map pin does not/);
  });

  it("is for super admins only and rejects unusable files", async () => {
    const staff = await authed(await createStaff(["providers"]));
    expect((await staff.post("/api/v1/admin/providers/bulk-update").send({ csv: "id\n1" })).status).toBe(403);
    const c = await authed(await createStaff());
    const send = (csv: string) => c.post("/api/v1/admin/providers/bulk-update").send({ csv }).then((r) => r.body.error?.message);
    expect(await send("\n\n")).toBe("The file is empty");
    expect(await send("business_name,city\nA,B")).toMatch(/^Add an id or phone column/);
    expect(await send(["id", ...Array.from({ length: 501 }, (_, i) => String(i + 1))].join("\n"))).toBe("Update at most 500 rows at a time");
  });

  it("keeps account type rules", async () => {
    const c = await authed(await createStaff());
    const { provider } = await createOwner({ phone: "+919000000001", businessType: "individual", profession: "Plumber" });
    await createProvider({ phone: "+919000000003", userId: provider.userId, businessType: "individual" });
    const biz = await createProvider({ phone: "+919000000002" });
    const csv = ["id,account_type,profession", `${provider.id},business,`, `${biz.id},,Electrician`].join("\n");
    const rows = (await c.post("/api/v1/admin/providers/bulk-update").send({ csv })).body.rows as Row[];
    expect(rows[0].errors[0]).toMatch(/more than one listing/);
    expect(rows[1]).toMatchObject({ status: "unchanged", changes: [] });
    expect(rows[1].warnings[0]).toMatch(/only for individual/);
  });

  it("updates opening hours and shows services for reference", async () => {
    const c = await authed(await createStaff());
    const cat = await createCategory({ name: "Plumbing" }, ["Pipe Fitting"]);
    const p = await createProvider({ phone: "+919000000001", categoryId: cat.id, subcategoryId: cat.subcategories[0].id });
    const q = await createProvider({ phone: "+919000000002" });
    const csv = ["id,hours,services", `${p.id},Mon-Sat 10:00-20:00; Sun closed,anything`, `${q.id},Mon-Fri 9-18 ; Sat 10:00 to 14:00,`].join("\n");
    const dry = (await c.post("/api/v1/admin/providers/bulk-update").send({ csv })).body;
    expect(dry).toMatchObject({ toUpdate: 2, ignoredColumns: [] });
    expect(dry.rows[0].changes).toEqual([{ column: "hours", from: "", to: "Mon-Sat 10:00-20:00; Sun closed" }]);
    expect(dry.rows[1].changes[0].to).toBe("Mon-Fri 09:00-18:00; Sat 10:00-14:00; Sun closed");
    expect((await c.post("/api/v1/admin/providers/bulk-update").send({ csv, dryRun: false })).body.updated).toBe(2);
    expect(await prisma.providerBusinessHour.count({ where: { providerId: p.id, openTime: "10:00" } })).toBe(6);

    const again = (await c.post("/api/v1/admin/providers/bulk-update").send({ csv })).body;
    expect(again).toMatchObject({ toUpdate: 0, unchanged: 2 });
    const bad = (await c.post("/api/v1/admin/providers/bulk-update").send({ csv: `id,hours\n${p.id},Mon-Sat 20:00-10:00` })).body;
    expect(bad.rows[0].errors[0]).toMatch(/closing time must be after/);

    const download = (await c.get("/api/v1/admin/export/provider-updates").buffer(true).parse((res, cb) => {
      let data = "";
      res.on("data", (d: Buffer) => (data += d.toString()));
      res.on("end", () => cb(null, data));
    })).body as string;
    const [header, first] = parseCsv(download);
    expect(header.slice(-2)).toEqual(["hours", "services"]);
    expect(first.slice(-2)).toEqual(["Mon-Sat 10:00-20:00; Sun closed", "Plumbing / Pipe Fitting"]);
  });
});
