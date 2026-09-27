import { describe, expect, it } from "vitest";
import { writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { uploadDir } from "../../src/storage/index.js";
import { issueUserToken } from "../../src/services/user-tokens.js";
import { getSetting } from "../../src/services/settings.js";
import { api, authed, sentMails, settle, tokenFor } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createStaff, createUser, seedPlans, subscribe } from "../helpers/factories.js";

const pub = (key: string) => `${env.publicUrl}/uploads/${key}`;

describe("admin access", () => {
  it("lets only staff in, each to their own sections", async () => {
    expect((await api().get("/api/v1/admin/me")).status).toBe(401);
    expect((await (await authed(await createUser())).get("/api/v1/admin/me")).body.error.message).toBe("This account does not have admin access");
    const boss = await createStaff("super", { name: "Boss Person" });
    const me = await (await authed(boss)).get("/api/v1/admin/me");
    expect(me.body.permissions).toContain("team");
    expect(me.body.modules.length).toBe(14);

    const agent = await createStaff(["support", "team", "bogus"]);
    const a = await authed(agent);
    expect((await a.get("/api/v1/admin/me")).body.permissions).toEqual(["support"]);
    expect((await a.get("/api/v1/admin/tickets")).status).toBe(200);
    expect((await a.get("/api/v1/admin/team")).status).toBe(403);
    expect((await a.get("/api/v1/admin/providers")).status).toBe(403);
    expect((await a.get("/api/v1/admin/nowhere")).status).toBe(404);
    expect((await a.get("/api/v1/admin")).status).toBe(404);
    const noRole = await createUser({ role: "admin" });
    expect((await (await authed(noRole)).get("/api/v1/admin/me")).body.permissions).toEqual([]);
  });
});

describe("claims", () => {
  it("approves and rejects ownership claims", async () => {
    const boss = await authed(await createStaff());
    const listing = await createProvider({ businessName: "Old Shop" });
    const claimant = await createUser({ email: "claimant@example.com" });
    const other = await createUser();
    const claim = await prisma.providerClaim.create({ data: { providerId: listing.id, userId: claimant.id } });
    const rival = await prisma.providerClaim.create({ data: { providerId: listing.id, userId: other.id } });
    expect((await boss.get("/api/v1/admin/claims")).body.claims).toHaveLength(2);
    expect((await boss.patch(`/api/v1/admin/claims/${claim.id}`).send({ decision: "approved" })).body).toEqual({ ok: true });
    expect(await prisma.provider.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ userId: claimant.id });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: claimant.id } })).role).toBe("provider");
    expect((await boss.patch(`/api/v1/admin/claims/${claim.id}`).send({ decision: "approved" })).body.error.message).toBe("Claim already decided");
    expect((await boss.patch(`/api/v1/admin/claims/${rival.id}`).send({ decision: "approved" })).body.error.message).toBe("Listing already has an owner");
    expect((await boss.patch(`/api/v1/admin/claims/${rival.id}`).send({ decision: "rejected" })).body).toEqual({ ok: true });
    expect((await boss.patch("/api/v1/admin/claims/999").send({ decision: "rejected" })).status).toBe(404);
    expect((await boss.get("/api/v1/admin/claims").query({ status: "approved" })).body.claims).toHaveLength(1);
    await settle();
    expect(sentMails().map((m) => m.subject)).toEqual(["Old Shop is now yours", "Your claim was not approved"]);
  });
});

describe("verifications", () => {
  it("decides documents and works out the verification level", async () => {
    const boss = await authed(await createStaff());
    const { provider } = await createOwner();
    const mk = (type: "business" | "location" | "id_proof" | "phone") => prisma.verification.create({ data: { providerId: provider.id, type } });
    const biz = await mk("business");
    const loc = await mk("location");
    const id = await mk("id_proof");
    expect((await boss.get("/api/v1/admin/verifications")).body.verifications).toHaveLength(3);
    expect((await boss.patch(`/api/v1/admin/verifications/${biz.id}`).send({ decision: "approved" })).body.verificationStatus).toBe("partial");
    expect((await boss.patch(`/api/v1/admin/verifications/${loc.id}`).send({ decision: "approved", notes: "ok" })).body.verificationStatus).toBe("verified");
    expect((await boss.patch(`/api/v1/admin/verifications/${id.id}`).send({ decision: "rejected" })).body.error.message).toMatch(/Tell the provider why/);
    expect((await boss.patch(`/api/v1/admin/verifications/${id.id}`).send({ decision: "rejected", notes: "Blurry photo." })).status).toBe(200);
    await boss.patch(`/api/v1/admin/verifications/${biz.id}`).send({ decision: "rejected", notes: "Expired." });
    await boss.patch(`/api/v1/admin/verifications/${loc.id}`).send({ decision: "rejected", notes: "Expired." });
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } })).verificationStatus).toBe("none");
    const phone = await mk("phone");
    await boss.patch(`/api/v1/admin/verifications/${id.id}`).send({ decision: "approved" });
    expect((await boss.patch(`/api/v1/admin/verifications/${phone.id}`).send({ decision: "approved" })).body.verificationStatus).toBe("verified");
    expect((await boss.get("/api/v1/admin/verifications").query({ status: "rejected" })).body.verifications).toHaveLength(2);
    await settle();
    expect(sentMails().map((m) => m.subject)).toContain("Owner identity document not accepted");
    const unowned = await createProvider();
    const v = await prisma.verification.create({ data: { providerId: unowned.id, type: "phone" } });
    expect((await boss.patch(`/api/v1/admin/verifications/${v.id}`).send({ decision: "approved" })).status).toBe(200);
  });
});

describe("flags and contact messages", () => {
  it("lists reports with what they point at and resolves them", async () => {
    const boss = await authed(await createStaff());
    const p = await createProvider();
    const r = await createReview(p.id, (await createUser()).id);
    const reporter = await createUser();
    const f1 = await prisma.reportFlag.create({ data: { reporterUserId: reporter.id, targetType: "review", targetId: r.id, reason: "fake" } });
    await prisma.reportFlag.create({ data: { targetType: "provider", targetId: p.id, reason: "closed" } });
    await prisma.reportFlag.create({ data: { targetType: "review", targetId: 999n, reason: "gone" } });
    await prisma.reportFlag.create({ data: { targetType: "provider", targetId: 999n, reason: "gone" } });
    const flags = (await boss.get("/api/v1/admin/flags")).body.flags;
    expect(flags.map((f: { review: unknown; provider: unknown }) => [!!f.review, !!f.provider])).toEqual([[true, false], [false, true], [false, false], [false, false]]);
    expect((await boss.patch(`/api/v1/admin/flags/${f1.id}`).send({ status: "resolved" })).body.flag.status).toBe("resolved");
    expect((await boss.get("/api/v1/admin/flags").query({ status: "resolved" })).body.flags).toHaveLength(1);
  });
  it("moves old contact messages into tickets", async () => {
    const boss = await authed(await createStaff());
    const u = await createUser();
    const m1 = await prisma.contactMessage.create({ data: { userId: u.id, name: "A", email: "a@x.co", message: "Help me please", subject: "Question" } });
    const m2 = await prisma.contactMessage.create({ data: { name: "B", email: "b@x.co", message: "Hello there" } });
    expect((await boss.get("/api/v1/admin/contact-messages")).body.messages).toHaveLength(2);
    expect((await boss.patch(`/api/v1/admin/contact-messages/${m1.id}`).send({ status: "in_progress" })).body.message.status).toBe("in_progress");
    const t = await boss.post(`/api/v1/admin/contact-messages/${m2.id}/ticket`);
    expect(t.status).toBe(201);
    expect((await prisma.supportTicket.findFirstOrThrow()).subject).toBe("Message from the contact form");
    await boss.post(`/api/v1/admin/contact-messages/${m1.id}/ticket`);
    expect((await prisma.contactMessage.findUniqueOrThrow({ where: { id: m2.id } })).status).toBe("closed");
    expect((await boss.post("/api/v1/admin/contact-messages/999/ticket")).status).toBe(404);
  });
});

describe("activity log and search insights", () => {
  it("filters the audit log and summarises searches", async () => {
    const staff = await createStaff();
    const boss = await authed(staff);
    const cat = await createCategory({ name: "Plumbing" });
    await boss.post("/api/v1/admin/badges").send({ name: "Trusted" });
    await boss.post("/api/v1/admin/badges").send({ name: "Fast" });
    expect((await boss.get("/api/v1/admin/activity-logs")).body.total).toBe(2);
    expect((await boss.get("/api/v1/admin/activity-logs").query({ targetType: "badge", adminId: Number(staff.id), pageSize: 1 })).body).toMatchObject({ total: 2, totalPages: 2 });
    await prisma.searchQuery.createMany({
      data: [{ rawQuery: "Plumber", parsedCategoryId: cat.id, resultsCount: 4 }, { rawQuery: "plumber", resultsCount: 2 }, { rawQuery: "xyz", resultsCount: 0 }, { rawQuery: "", resultsCount: 0 }],
    });
    const res = await boss.get("/api/v1/admin/search-insights").query({ days: 7 });
    expect(res.body).toMatchObject({ days: 7, totalSearches: 4, avgResults: 1.5, zeroResultQueries: [{ query: "xyz", count: 1 }] });
    expect(res.body.topQueries[0]).toMatchObject({ count: 2, avgResults: 3 });
    expect(res.body.byCategory).toContainEqual({ category: "Unmatched", count: 3 });
    expect(res.body.byCategory).toContainEqual({ category: "Plumbing", count: 1 });
    expect((await boss.get("/api/v1/admin/search-insights")).body.avgResults).toBe(1.5);
    await prisma.searchQuery.deleteMany();
    expect((await boss.get("/api/v1/admin/search-insights")).body.avgResults).toBe(0);
  });
});

describe("badges", () => {
  it("creates, edits, awards and removes badges", async () => {
    const plans = await seedPlans();
    const boss = await authed(await createStaff());
    const { provider, user } = await createOwner();
    await writeFile(path.join(uploadDir, "b1.webp"), "x");
    const created = await boss.post("/api/v1/admin/badges").send({ name: "Trusted", iconUrl: pub("b1.webp"), criteriaDescription: "Good" });
    const id = created.body.badge.id;
    await boss.patch(`/api/v1/admin/badges/${id}`).send({ iconUrl: pub("b2.webp") });
    await boss.patch(`/api/v1/admin/badges/${id}`).send({ name: "Very Trusted" });
    await settle();
    await expect(stat(path.join(uploadDir, "b1.webp"))).rejects.toThrow();
    expect((await boss.get("/api/v1/admin/badges")).body.badges.map((b: { name: string }) => b.name)).toContain("Very Trusted");

    expect((await boss.post(`/api/v1/admin/providers/${provider.id}/badges`).send({ badgeId: id })).status).toBe(201);
    await boss.post(`/api/v1/admin/providers/${provider.id}/badges`).send({ badgeId: id });
    expect(await prisma.providerBadge.count()).toBe(1);
    expect((await boss.post("/api/v1/admin/providers/999/badges").send({ badgeId: id })).status).toBe(404);
    expect((await boss.post(`/api/v1/admin/providers/${provider.id}/badges`).send({ badgeId: 999 })).status).toBe(404);
    await settle();
    // Awarded twice, notified twice.
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(2);
    expect((await boss.delete(`/api/v1/admin/providers/${provider.id}/badges/${id}`)).body).toEqual({ ok: true });
    expect((await boss.delete(`/api/v1/admin/badges/${plans.badges.pro.id}`)).body.error.message).toMatch(/granted by an active plan/);
    expect((await boss.delete(`/api/v1/admin/badges/${id}`)).body).toEqual({ ok: true });
  });
});

describe("plans and promotions", () => {
  it("creates and edits plans with their entitlements", async () => {
    const plans = await seedPlans();
    const boss = await authed(await createStaff(["plans"]));
    const list = await boss.get("/api/v1/admin/plans");
    expect(list.body.plans.map((p: { code: string; entitlements: string[] }) => [p.code, p.entitlements.length])).toEqual([["free", 0], ["pro", 1], ["business", 2]]);
    const created = await boss.post("/api/v1/admin/plans").send({ code: "Gold_1", name: "Gold", price: 1999, badgeId: Number(plans.badges.pro.id), features: ["All"] });
    expect(created.status).toBe(201);
    expect(created.body.plan).toMatchObject({ code: "gold_1", featuresJson: ["All"] });
    const edited = await boss.patch(`/api/v1/admin/plans/${created.body.plan.id}`).send({ code: "ignored", badgeId: null, name: "Gold Plus" });
    expect(edited.body.plan).toMatchObject({ code: "gold_1", badgeId: null, name: "Gold Plus" });
    expect((await boss.post("/api/v1/admin/plans").send({ code: "1bad", name: "x", price: 1 })).status).toBe(400);
  });
  it("creates and edits campaigns, recording offline payments", async () => {
    const boss = await authed(await createStaff(["promotions"]));
    const cat = await createCategory();
    const p = await createProvider();
    const base = { providerId: Number(p.id), categoryId: Number(cat.id), startDate: "2026-10-01", endDate: "2026-10-10", budget: 1000 };
    expect((await boss.post("/api/v1/admin/sponsored").send({ ...base, endDate: "2026-09-01" })).body.error.message).toBe("End date must be after the start date");
    const created = await boss.post("/api/v1/admin/sponsored").send({ ...base, payment: { amount: 1180, reference: "UPI123" } });
    expect(created.status).toBe(201);
    expect(await prisma.transaction.findFirstOrThrow()).toMatchObject({ type: "sponsored_ad", gateway: "manual", gatewayTxnId: "UPI123" });
    await boss.post("/api/v1/admin/sponsored").send(base);
    expect((await boss.get("/api/v1/admin/sponsored")).body.listings).toHaveLength(2);
    const id = created.body.listing.id;
    expect((await boss.patch(`/api/v1/admin/sponsored/${id}`).send({ status: "paused", budget: 2000 })).body.listing.status).toBe("paused");
    expect((await boss.get("/api/v1/admin/sponsored").query({ status: "paused" })).body.listings).toHaveLength(1);
  });
});

describe("team and roles", () => {
  it("invites, edits and removes team members", async () => {
    const boss = await createStaff("super", { name: "Boss Person" });
    const c = await authed(boss);
    const role = (await c.post("/api/v1/admin/roles").send({ name: "Finance", permissions: ["plans"] })).body.role;
    expect((await c.post("/api/v1/admin/roles").send({ name: "Finance", permissions: ["plans"] })).status).toBe(409);
    expect((await c.post("/api/v1/admin/roles").send({ name: "Bad", permissions: ["team"] })).status).toBe(400);
    const invite = await c.post("/api/v1/admin/team").send({ name: "Asha Rao", email: "asha@example.com", roleId: role.id });
    expect(invite.status).toBe(201);
    expect(sentMails()[0]!.text).toContain("Boss Person added you to the DialNFind admin team as Finance");
    const customer = await createUser({ email: "cust@example.com" });
    expect((await c.post("/api/v1/admin/team").send({ name: "Cust Omer", email: "cust@example.com", roleId: role.id })).body.member.role).toBe("admin");
    expect((await c.post("/api/v1/admin/team").send({ name: "Asha Rao", email: "asha@example.com", roleId: role.id })).status).toBe(409);
    expect((await c.post("/api/v1/admin/team").send({ name: "No Role", email: "nr@example.com", roleId: 999 })).body.error.message).toBe("Choose a role");
    const team = (await c.get("/api/v1/admin/team")).body.members;
    // Sorted by the role enum descending, which puts the super admin last.
    expect(team.map((m: { role: string }) => m.role)).toEqual(["admin", "admin", "super_admin"]);

    const memberId = invite.body.member.id;
    const other = (await c.post("/api/v1/admin/roles").send({ name: "Support", description: "Tickets", permissions: ["support"] })).body.role;
    expect((await c.patch(`/api/v1/admin/team/${memberId}`).send({ roleId: other.id })).body.member.adminRole.name).toBe("Support");
    expect((await c.patch(`/api/v1/admin/team/${memberId}`).send({ roleId: 999 })).status).toBe(400);
    const member = await prisma.user.findUniqueOrThrow({ where: { id: BigInt(memberId) } });
    const session = await tokenFor(member);
    expect((await c.patch(`/api/v1/admin/team/${memberId}`).send({ status: "suspended" })).body.member.status).toBe("suspended");
    expect((await api().get("/api/v1/admin/me").set("Authorization", `Bearer ${session}`)).status).toBe(401);
    await c.patch(`/api/v1/admin/team/${memberId}`).send({ status: "active" });
    await c.patch(`/api/v1/admin/team/${memberId}`).send({});
    expect((await c.patch(`/api/v1/admin/team/${boss.id}`).send({})).body.error.message).toBe("You cannot change your own access");
    expect((await c.patch(`/api/v1/admin/team/${customer.id}`).send({})).status).toBe(200);
    expect((await c.patch(`/api/v1/admin/team/${(await createUser()).id}`).send({})).status).toBe(404);

    const reset = await c.post(`/api/v1/admin/team/${memberId}/reset-password`);
    expect(reset.body.temporaryPassword).toMatch(/^[A-Za-z0-9x]{8}a\d{3}$/);
    expect((await api().post("/api/v1/auth/login").send({ email: "asha@example.com", password: reset.body.temporaryPassword })).status).toBe(200);

    await prisma.supportTicket.create({ data: { name: "n", email: "e@x.co", subject: "s", assignedToId: BigInt(memberId) } });
    expect((await c.delete(`/api/v1/admin/roles/${other.id}`)).body.error.message).toBe("Move the 1 team member with this role to another role first");
    await c.patch(`/api/v1/admin/team/${customer.id}`).send({ roleId: other.id });
    expect((await c.delete(`/api/v1/admin/roles/${other.id}`)).body.error.message).toBe("Move the 2 team members with this role to another role first");
    expect((await c.delete(`/api/v1/admin/team/${memberId}`)).body).toEqual({ ok: true });
    expect((await prisma.supportTicket.findFirstOrThrow()).assignedToId).toBeNull();
    await c.delete(`/api/v1/admin/team/${customer.id}`);
    expect((await c.delete(`/api/v1/admin/roles/${other.id}`)).body).toEqual({ ok: true });

    expect((await c.get("/api/v1/admin/roles")).body.roles.map((r: { name: string }) => r.name)).toEqual(["Finance"]);
    expect((await c.patch(`/api/v1/admin/roles/${role.id}`).send({ name: "Finance", description: null })).status).toBe(200);
    await c.post("/api/v1/admin/roles").send({ name: "Ops", permissions: ["providers"] });
    expect((await c.patch(`/api/v1/admin/roles/${role.id}`).send({ name: "Ops" })).status).toBe(409);
    expect((await c.patch(`/api/v1/admin/roles/${role.id}`).send({ permissions: ["plans", "analytics"] })).body.role.permissions).toEqual(["plans", "analytics"]);
  });
  it("keeps team management with the super admin", async () => {
    const lead = await createStaff(["support"]);
    expect((await (await authed(lead)).post("/api/v1/admin/roles").send({ name: "x", permissions: ["support"] })).status).toBe(403);
  });
});

describe("settings", () => {
  it("shows and validates platform settings", async () => {
    const boss = await authed(await createStaff(["settings"]));
    await prisma.setting.createMany({ data: [{ key: "support_email", value: "help@x.co" }, { key: "legacy_key", value: "old" }] });
    const got = await boss.get("/api/v1/admin/settings");
    const fields = got.body.groups.flatMap((g: { fields: { key: string; isSet: boolean; value: string }[] }) => g.fields);
    expect(fields.find((f: { key: string }) => f.key === "support_email")).toMatchObject({ isSet: true, value: "help@x.co" });
    expect(fields.find((f: { key: string }) => f.key === "site_name")).toMatchObject({ isSet: false, value: "DialNFind" });
    expect(fields.find((f: { key: string }) => f.key === "support_phone")).toMatchObject({ isSet: false, value: "" });
    expect(got.body.other).toEqual([expect.objectContaining({ key: "legacy_key", value: "old" })]);

    const save = (values: Record<string, unknown>) => boss.put("/api/v1/admin/settings").send({ values });
    expect((await save({ site_name: " Dial ", default_search_radius_km: 20, auto_approve_listings: true, support_email: "NEW@X.CO", terms_url: "https://x.co/terms", invoice_address: "Line", support_phone: null })).body).toEqual({ ok: true, saved: 7 });
    expect(await getSetting("support_email")).toBe("new@x.co");
    expect(await getSetting("default_search_radius_km")).toBe("20");
    expect(await prisma.setting.findUnique({ where: { key: "support_phone" } })).toBeNull();
    await save({ site_name: "" });
    expect(await getSetting("site_name")).toBe("DialNFind");
    const bad = async (values: Record<string, unknown>) => (await save(values)).body.error.message;
    expect(await bad({ nope: "1" })).toBe("Unknown setting nope");
    expect(await bad({ default_search_radius_km: "x" })).toMatch(/must be a number/);
    expect(await bad({ default_search_radius_km: 0 })).toMatch(/at least 1/);
    expect(await bad({ default_search_radius_km: 1000 })).toMatch(/at most 100/);
    expect(await bad({ auto_approve_listings: "maybe" })).toMatch(/on or off/);
    expect(await bad({ support_email: "nope" })).toMatch(/valid email/);
    expect(await bad({ terms_url: "ftp://x" })).toMatch(/full link/);
    expect(await bad({ terms_url: "https://" })).toMatch(/full link/);
    expect(await bad({ site_name: "x".repeat(301) })).toMatch(/too long/);
    expect((await save({ invoice_address: "x".repeat(4000) })).status).toBe(200);
    expect(await bad({ invoice_address: "x".repeat(5001) })).toMatch(/too long/);
  });
  it("checks select fields against their options", async () => {
    const { SETTING_FIELDS } = await import("../../src/services/settings.js");
    SETTING_FIELDS.set("theme", { key: "theme", label: "Theme", type: "select", options: ["light", "dark"] });
    SETTING_FIELDS.set("mode", { key: "mode", label: "Mode", type: "select" });
    SETTING_FIELDS.set("limit", { key: "limit", label: "Limit", type: "number" });
    try {
      const boss = await authed(await createStaff());
      expect((await boss.put("/api/v1/admin/settings").send({ values: { theme: "dark", mode: "anything", limit: -5 } })).body).toEqual({ ok: true, saved: 3 });
      expect((await boss.put("/api/v1/admin/settings").send({ values: { theme: "blue" } })).body.error.message).toBe("Pick a valid option for Theme");
    } finally {
      SETTING_FIELDS.delete("theme");
      SETTING_FIELDS.delete("mode");
      SETTING_FIELDS.delete("limit");
    }
  });
});

describe("admin help desk", () => {
  it("lists, filters and searches tickets", async () => {
    const staff = await createStaff(["support"], { name: "Agent Smith" });
    const c = await authed(staff);
    const other = await createStaff();
    const u = await createUser();
    const t1 = await prisma.supportTicket.create({ data: { userId: u.id, name: "Ravi", email: "ravi@x.co", subject: "Login issue", assignedToId: staff.id, priority: "high" } });
    await prisma.supportTicket.create({ data: { userId: u.id, name: "Ravi", email: "ravi@x.co", subject: "Old one", status: "closed" } });
    await prisma.supportTicket.create({ data: { name: "Guest", email: "g@x.co", subject: "Billing", status: "pending", assignedToId: other.id } });
    const q = (query: Record<string, string | number>) => c.get("/api/v1/admin/tickets").query(query).then((r) => r.body.total);
    expect((await c.get("/api/v1/admin/tickets")).body.counts).toEqual({ open: 1, closed: 1, pending: 1 });
    expect(await q({ status: "active" })).toBe(2);
    expect(await q({ status: "closed" })).toBe(1);
    expect(await q({ priority: "high" })).toBe(1);
    expect(await q({ assignee: "me" })).toBe(1);
    expect(await q({ assignee: "none" })).toBe(1);
    expect(await q({ assignee: Number(other.id) })).toBe(1);
    expect(await q({ q: `DNF-${String(t1.id).padStart(6, "0")}` })).toBe(1);
    expect(await q({ q: "billing" })).toBe(1);
    expect((await c.get("/api/v1/admin/tickets/assignees")).body.assignees.map((a: { name: string }) => a.name)).toContain("Agent Smith");

    const detail = await c.get(`/api/v1/admin/tickets/${t1.id}`);
    expect(detail.body.history).toHaveLength(1);
    const guestTicket = await prisma.supportTicket.findFirstOrThrow({ where: { name: "Guest" } });
    expect((await c.get(`/api/v1/admin/tickets/${guestTicket.id}`)).body.history).toEqual([]);
    expect((await c.get("/api/v1/admin/tickets/999")).status).toBe(404);
  });
  it("assigns, resolves and replies to tickets", async () => {
    const staff = await createStaff(["support"]);
    const c = await authed(staff);
    const colleague = await createStaff(["support"]);
    const u = await createUser();
    const t = await prisma.supportTicket.create({ data: { userId: u.id, name: "Ravi", email: "ravi@x.co", subject: "Login issue" } });
    expect((await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ assignedToId: Number(colleague.id), priority: "urgent", category: "account" })).body.ticket.priority).toBe("urgent");
    await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ assignedToId: Number(colleague.id) });
    await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ assignedToId: Number(staff.id) });
    await settle();
    expect(await prisma.notification.count({ where: { userId: colleague.id } })).toBe(1);
    expect((await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ assignedToId: Number(u.id) })).status).toBe(400);
    expect((await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ assignedToId: 999 })).status).toBe(400);
    const suspended = await createStaff(["support"], { status: "suspended" });
    expect((await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ assignedToId: Number(suspended.id) })).status).toBe(400);
    await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ status: "resolved" });
    await c.patch(`/api/v1/admin/tickets/${t.id}`).send({ status: "resolved", assignedToId: null });
    await settle();
    expect(await prisma.notification.count({ where: { userId: u.id, title: { contains: "resolved" } } })).toBe(1);
    expect((await c.patch("/api/v1/admin/tickets/999").send({})).status).toBe(404);

    const note = await c.post(`/api/v1/admin/tickets/${t.id}/messages`).send({ body: "Internal note", isInternal: true });
    expect(note.status).toBe(201);
    expect((await prisma.supportTicket.findUniqueOrThrow({ where: { id: t.id } }))).toMatchObject({ status: "resolved", assignedToId: staff.id });
    await c.post(`/api/v1/admin/tickets/${t.id}/messages`).send({ body: "We fixed it" });
    expect((await prisma.supportTicket.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("pending");
    await c.post(`/api/v1/admin/tickets/${t.id}/messages`).send({ body: "Closing", status: "closed" });
    const guest = await prisma.supportTicket.create({ data: { name: "G", email: "g@x.co", subject: "Q", assignedToId: colleague.id } });
    await c.post(`/api/v1/admin/tickets/${guest.id}/messages`).send({ body: "Answer" });
    const noEmail = await prisma.supportTicket.create({ data: { name: "G", email: "", subject: "Q" } });
    await c.post(`/api/v1/admin/tickets/${noEmail.id}/messages`).send({ body: "Answer" });
    await settle();
    const mails = sentMails();
    expect(mails.map((m) => m.to)).toEqual(["ravi@x.co", "ravi@x.co", "g@x.co"]);
    expect(mails[0]!.text).toContain("Help and support");
    expect(mails[2]!.text).toContain("contact form");
    expect((await c.post("/api/v1/admin/tickets/999/messages").send({ body: "x" })).status).toBe(404);
  });
});

describe("admin users", () => {
  it("lists, shows and filters accounts", async () => {
    const c = await authed(await createStaff(["users"]));
    const u = await createUser({ name: "Asha Rao", phone: "+919000000000" });
    const { user: owner, provider } = await createOwner();
    await createLead(provider.id, { userId: u.id });
    await createReview(provider.id, u.id);
    await prisma.favorite.create({ data: { userId: u.id, providerId: provider.id } });
    await prisma.supportTicket.create({ data: { userId: u.id, name: "n", email: "e", subject: "s" } });
    await tokenFor(u);
    expect((await c.get("/api/v1/admin/users")).body.total).toBe(3);
    expect((await c.get("/api/v1/admin/users").query({ q: "asha" })).body.total).toBe(1);
    expect((await c.get("/api/v1/admin/users").query({ q: "9000" })).body.total).toBe(1);
    expect((await c.get("/api/v1/admin/users").query({ role: "provider", status: "active" })).body.users[0].id).toBe(Number(owner.id));
    const detail = await c.get(`/api/v1/admin/users/${u.id}`);
    expect(detail.body).toMatchObject({ favorites: [{ id: Number(provider.id) }], tickets: [{ reference: expect.stringMatching(/^DNF-/) }], sessions: [expect.any(Object)] });
    expect(detail.body.reviews).toHaveLength(1);
    expect(detail.body.leads).toHaveLength(1);
    expect((await c.get("/api/v1/admin/users/999")).status).toBe(404);
  });
  it("suspends, reactivates, signs out and deletes accounts", async () => {
    const staff = await createStaff(["users"]);
    const c = await authed(staff);
    const u = await createUser({ email: "target@example.com" });
    const session = await tokenFor(u);
    expect((await c.patch(`/api/v1/admin/users/${u.id}`).send({ status: "suspended" })).body.user.status).toBe("suspended");
    expect((await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${session}`)).status).toBe(401);
    await c.patch(`/api/v1/admin/users/${u.id}`).send({ status: "suspended" });
    await settle();
    expect(sentMails().filter((m) => m.subject.includes("suspended"))).toHaveLength(1);
    expect((await c.patch(`/api/v1/admin/users/${u.id}`).send({ status: "active" })).body.user.status).toBe("active");
    expect((await c.post(`/api/v1/admin/users/${u.id}/sign-out`)).body).toEqual({ ok: true });
    expect((await c.patch(`/api/v1/admin/users/${staff.id}`).send({ status: "active" })).body.error.message).toBe("You cannot change your own account here");
    expect((await c.patch(`/api/v1/admin/users/${(await createStaff()).id}`).send({ status: "active" })).body.error.message).toBe("Manage team members from Team");
    expect((await c.post("/api/v1/admin/users/999/sign-out")).status).toBe(404);
    expect((await c.patch(`/api/v1/admin/users/${u.id}`).send({ status: "deleted" })).body.user.status).toBe("deleted");
  });
  it("resends confirmation or marks the address confirmed", async () => {
    const c = await authed(await createStaff(["users"]));
    const unconfirmed = await createUser({ verified: false });
    expect((await c.post(`/api/v1/admin/users/${unconfirmed.id}/resend-verification`)).body).toEqual({ ok: true });
    expect(sentMails()).toHaveLength(1);
    expect((await c.post(`/api/v1/admin/users/${unconfirmed.id}/mark-verified`)).body).toEqual({ ok: true });
    expect((await c.post(`/api/v1/admin/users/${unconfirmed.id}/mark-verified`)).status).toBe(400);
    expect((await c.post(`/api/v1/admin/users/${unconfirmed.id}/resend-verification`)).body.error.message).toBe("This email address is already confirmed");
    const suspended = await createUser({ verified: false, status: "suspended" });
    expect((await c.post(`/api/v1/admin/users/${suspended.id}/resend-verification`)).body.error.message).toBe("This account is not active");
    expect(await issueUserToken(unconfirmed.id, "verify_email")).toBeTruthy();
  });
  it("suspends and reactivates in bulk, skipping staff and self", async () => {
    const staff = await createStaff(["users"]);
    const c = await authed(staff);
    const a = await createUser();
    const b = await createUser({ role: "provider" });
    const gone = await createUser({ status: "deleted" });
    const boss = await createStaff();
    const ids = [a, b, gone, boss, staff].map((u) => Number(u.id));
    expect((await c.post("/api/v1/admin/users/bulk").send({ ids, action: "suspend" })).body).toEqual({ updated: 2 });
    expect((await c.post("/api/v1/admin/users/bulk").send({ ids, action: "reactivate" })).body).toEqual({ updated: 2 });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("active");
  });
});

describe("helpers", () => {
  it("has an idempotent plan seeder", async () => {
    const a = await seedPlans();
    const b = await seedPlans();
    expect(b.pro.id).toBe(a.pro.id);
    const p = await createProvider();
    await subscribe(p.id, a.pro.id);
  });
});
