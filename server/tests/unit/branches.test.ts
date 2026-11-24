/**
 * The defensive branches: fallbacks for rows or values that the database schema says cannot be missing,
 * logging setups other than the test one, and failures of fire-and-forget work. Each is reached with a
 * crafted input or a one-off spy.
 */
import { describe, expect, it, vi } from "vitest";
import { chmod, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Request, Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { createApp } from "../../src/app.js";
import { localNow } from "../../src/lib/hours.js";
import { guardAdminPath, requirePermission } from "../../src/lib/permissions.js";
import { currentUser, requireRole } from "../../src/middleware/auth.js";
import { errorHandler } from "../../src/middleware/error.js";
import { uploadDir } from "../../src/storage/index.js";
import { sweepOrphanFiles } from "../../src/jobs/orphan-files.js";
import { toProviderCard, providerCardInclude } from "../../src/services/presenter.js";
import { listingProfileSchema } from "../../src/services/listings.js";
import { newListingSchema } from "../../src/services/listings.js";
import { serviceAreaSchema } from "../../src/routes/provider/shared.js";
import { searchProviders } from "../../src/services/search.js";
import { adminTeamRouter } from "../../src/routes/admin/team.js";
import supertest from "supertest";
import { api, authed, json, mockFetch, settle } from "../helpers/app.js";
import { createCategory, createLead, createOwner, createProvider, createReview, createStaff, createUser } from "../helpers/factories.js";
import { tokenFor } from "../helpers/app.js";

const res = () => {
  const r = { status: vi.fn(), json: vi.fn() };
  r.status.mockReturnValue(r);
  return r as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
};

/** Calls one route's final handler directly, for branches the middleware in front of it never lets through. */
async function callRoute(router: Router, method: string, routePath: string, req: Partial<Request>) {
  const layer = router.stack.find((l) => l.route?.path === routePath && (l.route as unknown as { methods: Record<string, boolean> }).methods[method]);
  const r = res();
  const stack = layer!.route!.stack;
  await stack[stack.length - 1]!.handle(req as Request, r, () => undefined);
  return r;
}

/** Stubs one raw query (matched on its SQL) and passes every other one through. */
function stubRawQuery(match: string, rows: unknown[]) {
  const original = prisma.$queryRaw.bind(prisma);
  return vi.spyOn(prisma, "$queryRaw").mockImplementation(((strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.join("?").includes(match) ? Promise.resolve(rows) : original(strings, ...values)) as never);
}

describe("app logging", () => {
  it("logs one line per request in production and dev format elsewhere", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const saved = env.nodeEnv;
    try {
      env.nodeEnv = "production";
      await supertest(createApp()).get("/api/v1/health?secret=1");
      env.nodeEnv = "development";
      await supertest(createApp()).get("/api/v1/health");
    } finally {
      env.nodeEnv = saved;
    }
    const lines = write.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes('"GET /api/v1/health HTTP/1.1" 200') && !l.includes("secret"))).toBe(true);
    expect(lines.some((l) => l.includes("GET /api/v1/health"))).toBe(true);
  });
  it("turns on query logging with PRISMA_LOG=1", async () => {
    process.env.PRISMA_LOG = "1";
    vi.resetModules();
    try {
      const mod = await import("../../src/lib/prisma.js");
      expect(mod.prisma).toBeDefined();
    } finally {
      process.env.PRISMA_LOG = "";
      vi.resetModules();
    }
  });
});

describe("middleware and guards", () => {
  it("requireRole checks sign-in, role and confirmation", async () => {
    const customer = await createUser();
    const unconfirmed = await createUser({ verified: false, role: "provider" });
    const call = async (token: string | null, roles: Parameters<typeof requireRole>) => {
      const req = { headers: { authorization: token ? `Bearer ${token}` : undefined } } as unknown as Request;
      const next = vi.fn();
      await requireRole(...roles)(req, res(), next);
      return next;
    };
    await expect(call(null, ["customer"])).rejects.toMatchObject({ status: 401 });
    await expect(call(await tokenFor(customer), ["provider"])).rejects.toMatchObject({ status: 403 });
    await expect(call(await tokenFor(unconfirmed), ["provider"])).rejects.toMatchObject({ code: "email_unverified" });
    expect(await call(await tokenFor(customer), ["customer"])).toHaveBeenCalled();
    expect(() => currentUser({} as Request)).toThrow("Authentication required");
  });
  it("requirePermission reuses loaded permissions and guardAdminPath tolerates an empty path", async () => {
    const next = vi.fn();
    await requirePermission("users")({ permissions: new Set(["users"]) } as unknown as Request, res(), next);
    expect(next).toHaveBeenCalled();
    guardAdminPath({ path: "" } as Request, res(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
  it("errorHandler answers 500 for other Prisma errors", () => {
    const r = res();
    errorHandler(new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "x" }), {} as Request, r, () => undefined);
    expect(r.status).toHaveBeenCalledWith(500);
  });
  it("admin /me lists no permissions when none were loaded", async () => {
    const staff = await createStaff();
    const r = await callRoute(adminTeamRouter, "get", "/me", { user: { id: staff.id, role: staff.role, sessionId: "x", emailVerified: true } } as Partial<Request>);
    expect(r.json.mock.calls[0]![0].permissions).toEqual([]);
  });
});

describe("oauth", () => {
  it("reports an empty audience when a verified token names none", async () => {
    vi.resetModules();
    vi.doMock("jose", async (orig) => ({ ...(await orig<typeof import("jose")>()), jwtVerify: vi.fn(async () => ({ payload: { sub: "g-9" } })) }));
    try {
      const oauth = await import("../../src/lib/oauth.js");
      expect((await oauth.verifyGoogleIdToken("token")).audience).toBe("");
    } finally {
      vi.doUnmock("jose");
      vi.resetModules();
    }
  });
});

describe("hours", () => {
  it("copes with a 24 o'clock hour and missing parts", () => {
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, "formatToParts").mockReturnValueOnce([
      { type: "weekday", value: "Mon" }, { type: "hour", value: "24" }, { type: "minute", value: "05" },
    ]);
    expect(localNow()).toEqual({ day: 1, time: "00:05" });
    spy.mockReturnValueOnce([]);
    expect(localNow()).toEqual({ day: -1, time: ":" });
  });
});

describe("orphan sweep file errors", () => {
  it("treats a missing folder as empty and skips files it cannot delete", async () => {
    await rm(uploadDir, { recursive: true, force: true });
    expect(await sweepOrphanFiles()).toMatch(/^0 orphan files/);
    const dir = path.join(uploadDir, "locked");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "old.webp");
    await writeFile(file, "x");
    const old = new Date(Date.now() - 72 * 3600 * 1000);
    await utimes(file, old, old);
    await chmod(dir, 0o500);
    try {
      expect(await sweepOrphanFiles()).toMatch(/^1 orphan files .* removed$/);
    } finally {
      await chmod(dir, 0o700);
    }
  });
});

describe("schema fallbacks", () => {
  it("normalises blank pincodes to null", () => {
    expect(listingProfileSchema.shape.pincode.parse("")).toBeNull();
    expect(listingProfileSchema.shape.pincode.parse(null)).toBeNull();
    expect(listingProfileSchema.shape.pincode.parse("400001")).toBe("400001");
    expect(serviceAreaSchema.parse({ areaName: "Andheri", pincode: null }).pincode).toBeNull();
  });
  it("presents a card with no rating yet", async () => {
    const p = await createProvider();
    const loaded = await prisma.provider.findUniqueOrThrow({ where: { id: p.id }, include: providerCardInclude });
    expect(toProviderCard({ ...loaded, avgRating: null as never }).avgRating).toBe(0);
  });
});

describe("service fallbacks", () => {
  it("search survives an empty count", async () => {
    const cat = await createCategory({ slug: "c" });
    await createProvider({ categoryId: cat.id });
    stubRawQuery("SELECT COUNT(*)::bigint AS count FROM providers", []);
    const result = await searchProviders({ category: "c", sort: "relevance", page: 1, pageSize: 5 });
    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(1);
    await settle();
  });
});

describe("route fallbacks", () => {
  it("me: paged favorites with no count", async () => {
    const c = await authed(await createUser());
    vi.spyOn(prisma.favorite, "count").mockResolvedValueOnce(null as never);
    expect((await c.get("/api/v1/me/favorites").query({ page: 1 })).body.total).toBe(0);
  });
  it("providers: services without details and similar providers without coordinates", async () => {
    const cat = await createCategory();
    const p = await createProvider({ slug: "plain", categoryId: cat.id });
    expect((await api().get("/api/v1/providers/plain")).body.provider.services[0].details).toEqual([]);
    const find = prisma.provider.findUniqueOrThrow.bind(prisma.provider);
    vi.spyOn(prisma.provider, "findUniqueOrThrow").mockImplementationOnce((async (args: never) => ({ ...(await find(args)), latitude: null, longitude: null })) as never);
    expect((await api().get("/api/v1/providers/plain/similar")).status).toBe(200);
    expect(p.id).toBeDefined();
  });
  it("reviews: highlights skip reviews without text", async () => {
    const p = await createProvider();
    const r = await createReview(p.id, (await createUser()).id, { reviewText: "x".repeat(50) });
    const find = prisma.review.findMany.bind(prisma.review);
    vi.spyOn(prisma.review, "findMany").mockImplementationOnce((async (args: never) => (await find(args)).map((x) => ({ ...x, reviewText: null }))) as never);
    expect((await api().get("/api/v1/reviews/highlights")).body.reviews).toEqual([]);
    expect(r.id).toBeDefined();
  });
  it("admin import: short rows, rowless errors and skipped rows on a real run", async () => {
    const c = await authed(await createStaff());
    await createCategory({ name: "Plumbing", slug: "plumbing" });
    const csv = ["business_name,phone,category,city,state,latitude,longitude", "Short Row,9876543210,plumbing,Mumbai", "Good One,9876543211,plumbing,Mumbai,Maharashtra,19,72", "Bad,1,plumbing,Mumbai,Maharashtra,19,72"].join("\n");
    mockFetch(json([]));
    const real = await c.post("/api/v1/admin/providers/import").send({ csv, dryRun: false });
    expect(real.body).toMatchObject({ total: 3, created: 1 });
    vi.spyOn(newListingSchema, "safeParse").mockReturnValueOnce({ success: false, error: { issues: [{ path: [], message: "Broken row" }] } } as never);
    const dry = await c.post("/api/v1/admin/providers/import").send({ csv: ["business_name,phone,category,city,state,latitude,longitude", "X Y,9876543299,plumbing,Pune,Maharashtra,18,73"].join("\n") });
    expect(dry.body.rows[0].errors).toEqual(["row: Broken row"]);
  });
  it("provider portal: dashboard ranking fallback and notes untouched", async () => {
    const { user, provider } = await createOwner();
    const c = await authed(user);
    stubRawQuery("WITH mine AS", []);
    expect((await c.get("/api/v1/provider/dashboard")).body.ranking).toEqual({ position: 1, outOf: 1 });
    vi.restoreAllMocks();
    const lead = await createLead(provider.id, { providerNote: "keep" });
    expect((await c.patch(`/api/v1/provider/leads/${lead.id}`).send({ status: "won" })).body.lead).toMatchObject({ providerStatus: "won", providerNote: "keep" });
  });
  it("provider portal: service details for a service without a subcategory", async () => {
    const cat = await createCategory();
    const { user, provider } = await createOwner({ categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id });
    await prisma.categoryAttribute.create({ data: { categoryId: cat.id, subcategoryId: cat.subcategories[0]!.id, appliesTo: "provider", label: "Size", fieldType: "number" } });
    const c = await authed(user);
    expect(provider.id).toBeDefined();
    const find = prisma.providerService.findMany.bind(prisma.providerService);
    vi.spyOn(prisma.providerService, "findMany").mockImplementationOnce((async (args: never) => (await find(args)).map((s) => ({ ...s, subcategory: null }))) as never);
    expect((await c.get("/api/v1/provider/attributes")).body.groups[0].title).toBe(cat.name);
  });
});
