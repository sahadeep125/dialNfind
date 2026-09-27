import { describe, expect, it, vi } from "vitest";
import { mkdir, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../../src/lib/prisma.js";
import { env } from "../../../src/env.js";
import { completeCampaigns } from "../../../src/jobs/campaigns.js";
import { cleanup } from "../../../src/jobs/cleanup.js";
import { sweepOrphanFiles } from "../../../src/jobs/orphan-files.js";
import { sendStaffDigests } from "../../../src/jobs/staff-digest.js";
import { expireSubscriptions, remindExpiringSubscriptions } from "../../../src/jobs/subscriptions.js";
import { JOBS, runJob } from "../../../src/jobs/index.js";
import { uploadDir } from "../../../src/storage/index.js";
import { privateDir, PRIVATE_FILES_URL } from "../../../src/lib/private-files.js";
import { createCategory, createLead, createOwner, createProvider, createStaff, createUser, seedPlans, subscribe } from "../../helpers/factories.js";
import { json, mockFetch, sentMails, settle } from "../../helpers/app.js";

const DAY = 24 * 60 * 60 * 1000;

async function agedFile(root: string, key: string, ageMs = 72 * 3600 * 1000) {
  const file = path.join(root, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "data");
  const t = new Date(Date.now() - ageMs);
  await utimes(file, t, t);
  return file;
}
const gone = (file: string) => stat(file).then(() => false, () => true);

describe("campaigns job", () => {
  it("completes campaigns past their end date", async () => {
    const cat = await createCategory();
    const { user, provider } = await createOwner();
    await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(Date.now() - 10 * DAY), endDate: new Date(Date.now() - 3 * DAY), budget: 500, clicks: 4 } });
    await prisma.sponsoredListing.create({ data: { providerId: provider.id, categoryId: cat.id, startDate: new Date(), endDate: new Date(Date.now() + 3 * DAY), budget: 500 } });
    expect(await completeCampaigns()).toBe("1 completed");
    await settle();
    expect(await prisma.notification.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({ body: expect.stringContaining("reached 4 customers") });
  });
});

describe("subscription jobs", () => {
  it("expires overdue plans after checking the gateway and closes abandoned checkouts", async () => {
    const plans = await seedPlans();
    const a = await createOwner();
    const b = await createOwner();
    const c = await createOwner();
    const d = await createOwner();
    await subscribe(a.provider.id, plans.pro.id, { endDate: new Date(Date.now() - DAY) });
    await subscribe(b.provider.id, plans.pro.id, { status: "past_due", graceUntil: new Date(Date.now() - 1000) , source: "razorpay", externalId: "sub_b" });
    await subscribe(c.provider.id, plans.pro.id, { status: "past_due", graceUntil: null, endDate: new Date(Date.now() - DAY), source: "razorpay", externalId: "sub_c" });
    const pending = await subscribe(d.provider.id, plans.pro.id, { status: "pending" });
    await prisma.providerSubscription.update({ where: { id: pending.id }, data: { createdAt: new Date(Date.now() - 2 * DAY) } });
    // sub_b really renewed; sub_c is cancelled at Razorpay.
    mockFetch((url) =>
      url.endsWith("sub_b")
        ? json({ id: "sub_b", plan_id: "plan_pro_m", status: "active", current_end: Math.floor((Date.now() + 30 * DAY) / 1000), notes: {} })
        : json({ id: "sub_c", plan_id: "plan_pro_m", status: "cancelled", current_end: null, notes: {} }),
    );
    expect(await expireSubscriptions()).toBe("2 expired, 1 abandoned checkouts closed");
    const statuses = Object.fromEntries((await prisma.providerSubscription.findMany()).map((s) => [String(s.providerId), s.status]));
    expect(statuses).toEqual({ [String(a.provider.id)]: "expired", [String(b.provider.id)]: "active", [String(c.provider.id)]: "expired", [String(d.provider.id)]: "cancelled" });
  });
  it("reminds plans that will not renew", async () => {
    const plans = await seedPlans();
    const a = await createOwner();
    const b = await createOwner();
    await subscribe(a.provider.id, plans.pro.id, { autoRenew: false, endDate: new Date(Date.now() + 2.5 * DAY) });
    await subscribe(b.provider.id, plans.pro.id, { autoRenew: true, endDate: new Date(Date.now() + 2.5 * DAY) });
    expect(await remindExpiringSubscriptions()).toBe("1 reminded");
    expect(sentMails()[0]!.subject).toMatch(/^Your Pro plan ends on /);
  });
});

describe("staff digest", () => {
  it("sends each staff member the queues they can open", async () => {
    expect(await sendStaffDigests()).toBe("nothing pending");
    const boss = await createStaff("super", { email: "boss@x.co" });
    const support = await createStaff(["support"], { email: "support@x.co" });
    await createStaff(["plans"], { email: "finance@x.co" });
    await prisma.adminRole.deleteMany({ where: { name: { contains: "never" } } });
    await createUser({ role: "admin", email: "norole@x.co" });
    await createProvider({ status: "pending" });
    await createProvider({ status: "pending" });
    const p = await createProvider();
    const u = await createUser();
    await prisma.providerClaim.create({ data: { providerId: p.id, userId: u.id } });
    await prisma.verification.create({ data: { providerId: p.id, type: "business" } });
    await prisma.supportTicket.create({ data: { name: "n", email: "e@x.co", subject: "s" } });
    await prisma.reportFlag.create({ data: { targetType: "provider", targetId: p.id, reason: "spam" } });
    await createLead(p.id, { disputeStatus: "open" });
    expect(await sendStaffDigests()).toBe("2 digests sent");
    const mails = sentMails();
    expect(mails.map((m) => m.to).sort()).toEqual([boss.email, support.email].sort());
    const bossMail = mails.find((m) => m.to === boss.email)!;
    expect(bossMail.text).toContain("2 new listings to approve");
    expect(bossMail.text).toContain("1 ownership claim to review");
    expect(bossMail.text).toContain("1 disputed contact to decide");
    expect(mails.find((m) => m.to === support.email)!.text).not.toContain("listing");
  });
});

describe("orphan files", () => {
  it("removes old unreferenced uploads and keeps the rest", async () => {
    const used = await agedFile(uploadDir, "keep/used.webp");
    const orphan = await agedFile(uploadDir, "drop/orphan.webp");
    const fresh = await agedFile(uploadDir, "drop/fresh.webp", 1000);
    const hidden = await agedFile(uploadDir, ".hidden");
    const privUsed = await agedFile(privateDir, "docs/used.pdf");
    const privOrphan = await agedFile(privateDir, "docs/orphan.pdf");
    await createUser({ profilePhotoUrl: `${env.publicUrl}/uploads/keep/used.webp` });
    await createProvider({ logoUrl: "https://elsewhere/not-ours.png" });
    const p = await createProvider();
    await prisma.verification.create({ data: { providerId: p.id, type: "id_proof", documentUrl: `${PRIVATE_FILES_URL}docs/used.pdf` } });

    process.env.DRY_RUN = "1";
    expect(await sweepOrphanFiles()).toMatch(/^2 orphan files \(0\.0 MB\) would be removed$/);
    delete process.env.DRY_RUN;
    expect(await gone(orphan)).toBe(false);
    expect(await sweepOrphanFiles()).toMatch(/^2 orphan files \(0\.0 MB\) removed$/);
    expect(await gone(orphan)).toBe(true);
    expect(await gone(privOrphan)).toBe(true);
    expect(await gone(used)).toBe(false);
    expect(await gone(privUsed)).toBe(false);
    expect(await gone(fresh)).toBe(false);
    expect(await gone(hidden)).toBe(false);
  });
  it("stops when most old files look unused", async () => {
    for (let i = 0; i < 20; i++) await agedFile(uploadDir, `bulk/${i}.webp`);
    expect(await sweepOrphanFiles()).toMatch(/orphan sweep skipped: \d+ of \d+ files look unused/);
  });
});

describe("cleanup job", () => {
  it("removes dead sessions, tokens, cache rows and idle devices", async () => {
    const u = await createUser();
    const old = new Date(Date.now() - 40 * DAY);
    await prisma.authSession.createMany({ data: [{ userId: u.id, expiresAt: old }, { userId: u.id, expiresAt: new Date(Date.now() + DAY), revokedAt: old }, { userId: u.id, expiresAt: new Date(Date.now() + DAY) }] });
    await prisma.userToken.createMany({ data: [{ userId: u.id, type: "verify_email", tokenHash: "a", expiresAt: old }, { userId: u.id, type: "verify_email", tokenHash: "b", expiresAt: new Date(Date.now() + DAY), usedAt: new Date() }, { userId: u.id, type: "verify_email", tokenHash: "c", expiresAt: new Date(Date.now() + DAY) }] });
    await prisma.geocodeCache.create({ data: { key: "k", result: [], createdAt: old } });
    await prisma.pushToken.createMany({ data: [{ userId: u.id, token: "old", platform: "ios", lastSeenAt: new Date(Date.now() - 100 * DAY) }, { userId: u.id, token: "new", platform: "ios" }] });
    expect(await cleanup()).toMatch(/^2 sessions, 2 email links, 1 cached places, 1 idle push tokens removed; \d+ orphan files/);
  });
});

describe("job runner", () => {
  it("runs jobs by name and never throws", async () => {
    expect(Object.keys(JOBS)).toEqual(["expire-subscriptions", "complete-campaigns", "remind-subscriptions", "staff-digest", "recalculate-rankings", "cleanup"]);
    expect(await runJob("recalculate-rankings")).toBe(true);
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/^\[job\] recalculate-rankings: 0 providers \(\d+ ms\)$/));
    await expect(runJob("nope")).rejects.toThrow("Unknown job nope");
    vi.spyOn(prisma.sponsoredListing, "findMany").mockRejectedValueOnce(new Error("db down"));
    expect(await runJob("complete-campaigns")).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^\[job\] complete-campaigns failed after/), expect.any(Error));
  });
  it("schedules jobs only when RUN_JOBS is set", async () => {
    const tasks: { name: string; fn: () => unknown; stop: ReturnType<typeof vi.fn> }[] = [];
    vi.resetModules();
    vi.doMock("node-cron", () => ({
      default: {
        schedule: vi.fn((_expr: string, fn: () => unknown, opts: { name: string }) => {
          const task = { name: opts.name, fn, stop: vi.fn() };
          tasks.push(task);
          return task;
        }),
      },
    }));
    try {
      const jobs = await import("../../../src/jobs/index.js");
      const { env: freshEnv } = await import("../../../src/env.js");
      jobs.startJobs();
      expect(tasks).toHaveLength(0);
      freshEnv.runJobs = true;
      jobs.startJobs();
      expect(tasks.map((t) => t.name)).toEqual(Object.keys(jobs.JOBS));
      await tasks.find((t) => t.name === "staff-digest")!.fn();
      await jobs.stopJobs();
      expect(tasks.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
      await jobs.stopJobs();
    } finally {
      vi.doUnmock("node-cron");
      vi.resetModules();
    }
  });
});
