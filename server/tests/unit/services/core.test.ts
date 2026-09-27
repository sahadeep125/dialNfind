import { describe, expect, it, vi } from "vitest";
import type { CategoryAttribute } from "@prisma/client";
import { prisma } from "../../../src/lib/prisma.js";
import {
  consumeUserToken, consumeVerifyCode, issueUserToken, issueVerifyCode, lastVerifyCodeSentAt,
} from "../../../src/services/user-tokens.js";
import { revokeAllSessions, revokeSession, startSession } from "../../../src/services/sessions.js";
import { verifyToken } from "../../../src/lib/jwt.js";
import { clearSettingsCache, getNumberSetting, getSetting } from "../../../src/services/settings.js";
import { logAdmin } from "../../../src/services/audit.js";
import {
  applicableAttributes, attributeOptions, decodeAttributeValue, displayAttributeValue, encodeAttributeValue, loadAttributeValues,
} from "../../../src/services/attributes.js";
import { cardPlan, providerCardInclude, toProviderCard } from "../../../src/services/presenter.js";
import {
  completenessChecklist, completenessPct, computeRankingScore, recalculateAllProviders, recalculateCategoryCounts, recalculateProvider,
} from "../../../src/services/ranking.js";
import { createCategory, createLead, createProvider, createReview, createStaff, createUser, seedPlans, subscribe } from "../../helpers/factories.js";

describe("user tokens", () => {
  it("issues single-use link tokens", async () => {
    const u = await createUser();
    const old = await issueUserToken(u.id, "reset_password");
    const token = await issueUserToken(u.id, "reset_password");
    expect(await consumeUserToken(old, "reset_password")).toBeNull();
    expect(await consumeUserToken(token, "verify_email")).toBeNull();
    expect(await consumeUserToken(token, "reset_password")).toBe(u.id);
    expect(await consumeUserToken(token, "reset_password")).toBeNull();
    const expired = await issueUserToken(u.id, "verify_email", -1000);
    expect(await consumeUserToken(expired, "verify_email")).toBeNull();
    expect(await consumeUserToken("nope", "verify_email")).toBeNull();
  });
  it("returns null when another request used the token first", async () => {
    const u = await createUser();
    const token = await issueUserToken(u.id, "verify_email");
    vi.spyOn(prisma.userToken, "updateMany").mockResolvedValueOnce({ count: 0 });
    expect(await consumeUserToken(token, "verify_email")).toBeNull();
  });
  it("checks 6-digit codes with an attempt limit", async () => {
    const u = await createUser();
    expect(await lastVerifyCodeSentAt(u.id)).toBeNull();
    expect(await consumeVerifyCode(u.id, "000000")).toBe("expired");
    const code = await issueVerifyCode(u.id);
    expect(code).toMatch(/^\d{6}$/);
    expect(await lastVerifyCodeSentAt(u.id)).toBeInstanceOf(Date);
    const wrong = code === "999999" ? "111111" : "999999";
    for (let i = 0; i < 4; i++) expect(await consumeVerifyCode(u.id, wrong)).toBe("wrong");
    expect(await consumeVerifyCode(u.id, wrong)).toBe("expired");
    expect(await consumeVerifyCode(u.id, code)).toBe("expired");

    const fresh = await issueVerifyCode(u.id);
    expect(await consumeVerifyCode(u.id, fresh)).toBe("ok");
    expect(await consumeVerifyCode(u.id, fresh)).toBe("expired");

    const raced = await issueVerifyCode(u.id);
    vi.spyOn(prisma.userToken, "updateMany").mockResolvedValueOnce({ count: 0 });
    expect(await consumeVerifyCode(u.id, raced)).toBe("expired");

    const late = await issueVerifyCode(u.id);
    await prisma.userToken.updateMany({ where: { userId: u.id, usedAt: null }, data: { expiresAt: new Date(0) } });
    expect(await consumeVerifyCode(u.id, late)).toBe("expired");
  });
});

describe("sessions", () => {
  it("starts short staff sessions and long customer ones", async () => {
    const staff = await createStaff();
    const customer = await createUser();
    const req = { ip: "1.2.3.4", get: () => "agent".repeat(100) } as never;
    const staffToken = await startSession(staff.id, staff.role, req);
    const custToken = await startSession(customer.id, customer.role);
    const [s, c] = await Promise.all([
      prisma.authSession.findUniqueOrThrow({ where: { id: verifyToken(staffToken)!.sid } }),
      prisma.authSession.findUniqueOrThrow({ where: { id: verifyToken(custToken)!.sid } }),
    ]);
    expect(s.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(12 * 3600 * 1000);
    expect(c.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 24 * 3600 * 1000);
    expect(s.ip).toBe("1.2.3.4");
    expect(s.userAgent).toHaveLength(300);
    expect(c.ip).toBeNull();
    const admin = await createStaff(["users"]);
    await startSession(admin.id, admin.role);
    // A request without a user agent header stores null.
    await startSession(customer.id, customer.role, { ip: undefined, get: () => undefined } as never);
  });
  it("revokes one or all sessions", async () => {
    const u = await createUser();
    const a = verifyToken(await startSession(u.id, u.role))!.sid;
    const b = verifyToken(await startSession(u.id, u.role))!.sid;
    const c = verifyToken(await startSession(u.id, u.role))!.sid;
    await revokeSession(undefined);
    await revokeSession(a);
    await revokeAllSessions(u.id, b);
    const rows = await prisma.authSession.findMany({ orderBy: { createdAt: "asc" } });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.revokedAt]));
    expect(byId[a]).not.toBeNull();
    expect(byId[b]).toBeNull();
    expect(byId[c]).not.toBeNull();
    await revokeAllSessions(u.id);
    expect(await prisma.authSession.count({ where: { revokedAt: null } })).toBe(0);
  });
});

describe("settings", () => {
  it("reads stored values, defaults and caches them", async () => {
    expect(await getSetting("site_name")).toBe("DialNFind");
    expect(await getSetting("unknown_key")).toBeNull();
    await prisma.setting.create({ data: { key: "site_name", value: "Changed" } });
    expect(await getSetting("site_name")).toBe("DialNFind"); // cached
    clearSettingsCache();
    expect(await getSetting("site_name")).toBe("Changed");
  });
  it("parses numbers with a fallback", async () => {
    await prisma.setting.createMany({ data: [{ key: "a", value: "7" }, { key: "b", value: "x" }, { key: "c", value: "" }] });
    expect(await getNumberSetting("a", 1)).toBe(7);
    expect(await getNumberSetting("b", 1)).toBe(1);
    expect(await getNumberSetting("c", 1)).toBe(1);
    expect(await getNumberSetting("missing", 2)).toBe(2);
  });
});

describe("audit", () => {
  it("logs admin actions with plain details", async () => {
    const admin = await createStaff();
    await logAdmin(admin.id, "approve", "provider", 5n, { id: 5n });
    await logAdmin(admin.id, "note", "system");
    const rows = await prisma.adminActivityLog.findMany({ orderBy: { id: "asc" } });
    expect(rows[0]).toMatchObject({ targetId: 5n, detailsJson: { id: 5 } });
    expect(rows[1]).toMatchObject({ targetId: null, detailsJson: null });
  });
});

describe("analytics", () => {
  it("does nothing without a key", async () => {
    const { captureServer, shutdownAnalytics } = await import("../../../src/services/analytics.js");
    captureServer(1n, "x");
    await shutdownAnalytics();
  });
  it("captures and flushes with a key", async () => {
    const capture = vi.fn().mockImplementationOnce(() => undefined).mockImplementationOnce(() => { throw new Error("boom"); });
    const shutdown = vi.fn().mockRejectedValue(new Error("flush"));
    vi.resetModules();
    vi.doMock("posthog-node", () => ({ PostHog: vi.fn(function () { return { capture, shutdown }; }) }));
    process.env.POSTHOG_KEY = "phc_test";
    try {
      const { captureServer, shutdownAnalytics } = await import("../../../src/services/analytics.js");
      captureServer(null, "x");
      captureServer(undefined, "x");
      captureServer(7n, "lead_created", { a: 1 });
      expect(capture).toHaveBeenCalledWith({
        distinctId: "7",
        event: "lead_created",
        properties: expect.objectContaining({ a: 1, app_type: "backend", source: "server" }),
      });
      captureServer("7", "second");
      expect(console.error).toHaveBeenCalledWith("[analytics] capture failed", expect.any(Error));
      await shutdownAnalytics();
      expect(console.error).toHaveBeenCalledWith("[analytics] shutdown failed", expect.any(Error));
    } finally {
      process.env.POSTHOG_KEY = "";
      vi.doUnmock("posthog-node");
      vi.resetModules();
    }
  });
});

describe("attributes", () => {
  const attr = (fieldType: CategoryAttribute["fieldType"], extra: Partial<CategoryAttribute> = {}) =>
    ({ id: 1n, label: "Brand", fieldType, optionsJson: null, isRequired: false, ...extra }) as CategoryAttribute;

  it("encodes values by type", () => {
    expect(attributeOptions(attr("select", { optionsJson: ["A", 2] }))).toEqual(["A", "2"]);
    expect(attributeOptions(attr("select", { optionsJson: { a: 1 } }))).toEqual([]);
    expect(encodeAttributeValue(attr("text"), null)).toBeNull();
    expect(encodeAttributeValue(attr("text"), "")).toBeNull();
    expect(encodeAttributeValue(attr("multiselect"), [])).toBeNull();
    expect(() => encodeAttributeValue(attr("text", { isRequired: true }), null)).toThrow("Brand is required");
    expect(encodeAttributeValue(attr("boolean"), true)).toBe("true");
    expect(() => encodeAttributeValue(attr("boolean"), "yes")).toThrow("yes or no");
    expect(encodeAttributeValue(attr("number"), "4.5")).toBe("4.5");
    expect(() => encodeAttributeValue(attr("number"), "x")).toThrow("must be a number");
    expect(encodeAttributeValue(attr("select", { optionsJson: ["LG"] }), "LG")).toBe("LG");
    expect(encodeAttributeValue(attr("select"), "Any")).toBe("Any");
    expect(() => encodeAttributeValue(attr("select", { optionsJson: ["LG"] }), "Sony")).toThrow("valid option");
    expect(() => encodeAttributeValue(attr("select"), 3)).toThrow("valid option");
    expect(encodeAttributeValue(attr("multiselect", { optionsJson: ["LG", "Sony"] }), ["LG", "LG", "Sony"])).toBe('["LG","Sony"]');
    expect(encodeAttributeValue(attr("multiselect"), "One")).toBe('["One"]');
    expect(() => encodeAttributeValue(attr("multiselect", { optionsJson: ["LG"] }), ["X"])).toThrow("valid options");
    expect(encodeAttributeValue(attr("text"), `  ${"a".repeat(400)} `)).toHaveLength(300);
    expect(encodeAttributeValue(attr("text"), 12)).toBe("12");
    expect(() => encodeAttributeValue(attr("text"), true)).toThrow("must be text");
  });
  it("decodes and displays values", () => {
    expect(decodeAttributeValue(attr("boolean"), "true")).toBe(true);
    expect(decodeAttributeValue(attr("number"), "3")).toBe(3);
    expect(decodeAttributeValue(attr("multiselect"), '["a",1]')).toEqual(["a", "1"]);
    expect(decodeAttributeValue(attr("multiselect"), '"a"')).toEqual(['"a"']);
    expect(decodeAttributeValue(attr("multiselect"), "not json")).toEqual(["not json"]);
    expect(decodeAttributeValue(attr("text"), "x")).toBe("x");
    expect(displayAttributeValue(attr("boolean"), "true")).toBe("Yes");
    expect(displayAttributeValue(attr("boolean"), "false")).toBe("No");
    expect(displayAttributeValue(attr("multiselect"), '["a","b"]')).toBe("a, b");
    expect(displayAttributeValue(attr("number"), "2")).toBe("2");
  });
  it("loads applicable attributes and values", async () => {
    const cat = await createCategory();
    const sub = cat.subcategories[0]!;
    const wide = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, appliesTo: "lead", label: "Wide", fieldType: "text", displayOrder: 1 } });
    const narrow = await prisma.categoryAttribute.create({ data: { categoryId: cat.id, subcategoryId: sub.id, appliesTo: "lead", label: "Narrow", fieldType: "text", displayOrder: 0 } });
    expect((await applicableAttributes(prisma, "lead", cat.id, null)).map((a) => a.label)).toEqual(["Wide"]);
    expect((await applicableAttributes(prisma, "lead", cat.id, sub.id)).map((a) => a.label)).toEqual(["Narrow", "Wide"]);

    expect((await loadAttributeValues(prisma, "lead", [])).size).toBe(0);
    await prisma.attributeValue.createMany({
      data: [
        { attributeId: wide.id, entityType: "lead", entityId: 1n, value: "w" },
        { attributeId: narrow.id, entityType: "lead", entityId: 1n, value: "n" },
        { attributeId: wide.id, entityType: "lead", entityId: 2n, value: "w2" },
      ],
    });
    const map = await loadAttributeValues(prisma, "lead", [1n, 2n]);
    expect(map.get(1n)!.map((v) => v.value)).toEqual(["n", "w"]);
    expect(map.get(2n)!.map((v) => v.value)).toEqual(["w2"]);
  });
});

describe("presenter", () => {
  it("builds provider cards", async () => {
    const plans = await seedPlans();
    const cat = await createCategory();
    const p = await createProvider({ description: "x".repeat(200), whatsappNumber: null, categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id });
    await prisma.providerService.create({ data: { providerId: p.id, categoryId: cat.id, subcategoryId: cat.subcategories[1]!.id, startingPrice: 0 } });
    await prisma.providerBadge.create({ data: { providerId: p.id, badgeId: plans.badges.pro.id } });
    await prisma.providerBusinessHour.create({ data: { providerId: p.id, dayOfWeek: 0, is24x7: true } });
    const load = () => prisma.provider.findUniqueOrThrow({ where: { id: p.id }, include: providerCardInclude });

    const free = toProviderCard(await load());
    expect(free).toMatchObject({ planTier: null, acceptsWhatsapp: false, whatsappNumber: null, distanceKm: null, startingPrice: 300, isOpenNow: true, isClaimed: false });
    expect(free.shortDescription).toHaveLength(160);
    expect(free.subcategories).toEqual(["TV Repair", "AC Repair"]);
    expect(free.badges).toEqual([{ id: plans.badges.pro.id, name: "Pro Partner" }]);
    expect(cardPlan(await load())).toEqual({ code: "free", photoLimit: 3 });
    expect(cardPlan(await load(), null)).toEqual({ code: "free", photoLimit: null });

    await subscribe(p.id, plans.pro.id);
    const pro = toProviderCard(await load(), { distanceKm: 3.14159, isFavorite: true, isSponsored: true });
    expect(pro).toMatchObject({ planTier: "pro", acceptsWhatsapp: true, whatsappNumber: "+919876543210", distanceKm: 3.1, isFavorite: true, isSponsored: true });
    expect(cardPlan(await load())).toEqual({ code: "pro", photoLimit: 30 });

    await prisma.provider.update({ where: { id: p.id }, data: { whatsappNumber: "+919999999999", description: null, isAvailable: false } });
    await prisma.providerService.deleteMany({ where: { providerId: p.id } });
    const bare = toProviderCard(await load(), { distanceKm: null });
    expect(bare).toMatchObject({ whatsappNumber: "+919999999999", shortDescription: "", primaryCategory: null, priceUnit: null, startingPrice: null, isOpenNow: false });
  });
});

describe("ranking", () => {
  const full = {
    description: "d".repeat(80), logoUrl: "l", coverUrl: "c", yearsExperience: 3, whatsappNumber: "w", addressLine: "a", email: null, website: "w",
    verificationStatus: "partial", _count: { businessHours: 1, serviceAreas: 1, services: 1, portfolio: 1 },
  };
  it("scores completeness and ranking", () => {
    expect(completenessPct(completenessChecklist(full))).toBe(100);
    const empty = { ...full, description: null, logoUrl: null, coverUrl: null, yearsExperience: null, whatsappNumber: null, addressLine: null, website: null, verificationStatus: "none", _count: { businessHours: 0, serviceAreas: 0, services: 0, portfolio: 0 } };
    expect(completenessPct(completenessChecklist(empty))).toBe(0);
    const base = { avgRating: 5, totalReviews: 10, completenessPct: 100, verificationStatus: "verified", responseSignal: 1, planBoost: 0, isAvailable: true };
    const top = computeRankingScore(base);
    expect(computeRankingScore({ ...base, verificationStatus: "partial" })).toBeLessThan(top);
    expect(computeRankingScore({ ...base, verificationStatus: "none", responseSignal: null })).toBeLessThan(top);
    expect(computeRankingScore({ ...base, isAvailable: false })).toBeCloseTo(top / 2, 3);
  });
  it("recalculates providers and category counts", async () => {
    const plans = await seedPlans();
    const cat = await createCategory();
    const p = await createProvider({ categoryId: cat.id });
    await createProvider({ categoryId: cat.id, status: "pending" });
    const u1 = await createUser();
    const u2 = await createUser();
    await createReview(p.id, u1.id, { rating: 4 });
    await createReview(p.id, u2.id, { rating: 5 });
    for (let i = 0; i < 5; i++) await createLead(p.id, { customerReportedResponse: i < 4 });
    await subscribe(p.id, plans.pro.id);
    await recalculateProvider(p.id);
    await recalculateProvider(999n);
    const after = await prisma.provider.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(after.avgRating)).toBe(4.5);
    expect(after.totalReviews).toBe(2);
    expect(Number(after.responseSignal)).toBe(0.8);
    expect(Number(after.rankingScore)).toBeGreaterThan(0);

    const lonely = await createProvider();
    await createLead(lonely.id, { customerReportedResponse: false });
    expect(await recalculateAllProviders()).toBe(3);
    const l = await prisma.provider.findUniqueOrThrow({ where: { id: lonely.id } });
    expect(l.responseSignal).toBeNull();
    expect(Number(l.avgRating)).toBe(0);
    await recalculateCategoryCounts();
    expect((await prisma.category.findUniqueOrThrow({ where: { id: cat.id } })).providerCount).toBe(1);
  });
});
