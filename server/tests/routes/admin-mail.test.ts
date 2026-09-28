import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { env } from "../../src/env.js";
import { prisma } from "../../src/lib/prisma.js";
import { verifyPreviewToken } from "../../src/lib/jwt.js";
import { mailConfig, sendTestMail } from "../../src/services/mail.js";
import { refreshProviderPages, refreshShared, revalidateWeb } from "../../src/services/web-cache.js";
import { authed, settle } from "../helpers/app.js";
import { createProvider, createStaff, createUser } from "../helpers/factories.js";

// The mail module builds its transport once, on first use; this fake is what it gets. The spy is renewed
// before each test because the shared setup restores mocks after every test.
const transport = { verify: vi.fn(), sendMail: vi.fn() };

const savedSmtp = { ...env.smtp };
beforeEach(() => {
  vi.spyOn(nodemailer, "createTransport").mockReturnValue(transport as never);
  transport.verify.mockReset().mockResolvedValue(true);
  transport.sendMail.mockReset().mockResolvedValue({ response: "250 OK" });
});
afterEach(() => {
  Object.assign(env.smtp, savedSmtp);
});

describe("admin email settings", () => {
  it("shows the mail settings without the password", async () => {
    Object.assign(env.smtp, { host: "smtp.test", port: 587, user: "team@shop.in", pass: "secret" });
    const admin = await authed(await createStaff());
    const res = await admin.get("/api/v1/admin/settings/email");
    expect(res.body.config).toEqual({ host: "smtp.test", port: 587, user: "team@shop.in", from: env.smtp.from, replyTo: env.smtp.replyTo, hasPassword: true });
    expect(JSON.stringify(res.body)).not.toContain("secret");
    Object.assign(env.smtp, { pass: "" });
    expect(mailConfig().hasPassword).toBe(false);
  });

  it("sends a test email and reports the server's answer or its error", async () => {
    const admin = await authed(await createStaff());
    // Without SMTP there is nothing to test.
    const off = await admin.post("/api/v1/admin/settings/email/test").send({ to: "me@shop.in" });
    expect(off.status).toBe(400);
    expect(off.body.error.message).toContain("SMTP_HOST is not set");

    Object.assign(env.smtp, { host: "smtp.test" });
    const ok = await admin.post("/api/v1/admin/settings/email/test").send({ to: " Me@Shop.in " });
    expect(ok.body).toEqual({ ok: true, response: "250 OK" });
    expect(transport.verify).toHaveBeenCalled();
    expect(transport.sendMail.mock.calls[0]![0]).toMatchObject({ to: "me@shop.in", subject: "DialNFind test email" });
    expect(await prisma.adminActivityLog.count({ where: { action: "settings.test_email" } })).toBe(1);

    transport.verify.mockRejectedValueOnce(Object.assign(new Error("Invalid login"), { code: "EAUTH", responseCode: 535 }));
    const bad = await admin.post("/api/v1/admin/settings/email/test").send({ to: "me@shop.in" });
    expect(bad.body.error.message).toBe("Could not send: EAUTH · 535 · Invalid login");

    expect((await admin.post("/api/v1/admin/settings/email/test").send({ to: "nope" })).status).toBe(400);
  });

  it("says accepted when the server gives no reply text", async () => {
    Object.assign(env.smtp, { host: "smtp.test" });
    transport.sendMail.mockResolvedValueOnce({});
    expect(await sendTestMail("me@shop.in")).toEqual({ response: "accepted" });
  });

  it("tells the admin when a verification email is refused", async () => {
    Object.assign(env.smtp, { host: "smtp.test" });
    transport.sendMail.mockRejectedValueOnce(new Error("mailbox full"));
    const admin = await authed(await createStaff());
    const target = await createUser({ verified: false });
    const res = await admin.post(`/api/v1/admin/users/${target.id}/resend-verification`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("The mail server refused the email");
  });
});

describe("provider sign-ups", () => {
  it("lists provider accounts without a listing, with search", async () => {
    const admin = await authed(await createStaff());
    const waiting = await createUser({ role: "provider", name: "Waiting Owner", verified: false });
    await createUser({ role: "provider", name: "Gone Owner", status: "deleted" });
    await createUser({ role: "customer", name: "Just A Customer" });
    await createProvider();

    const all = await admin.get("/api/v1/admin/provider-signups");
    expect(all.status).toBe(200);
    expect(all.body.users.map((u: { name: string }) => u.name)).toContain("Waiting Owner");
    expect(all.body.users.map((u: { name: string }) => u.name)).not.toContain("Gone Owner");
    expect(all.body.users.map((u: { name: string }) => u.name)).not.toContain("Just A Customer");
    expect(all.body.users.find((u: { id: string | number }) => String(u.id) === String(waiting.id)).emailVerifiedAt).toBeNull();

    const found = await admin.get("/api/v1/admin/provider-signups").query({ q: "waiting" });
    expect(found.body.users).toHaveLength(1);
    expect(found.body.total).toBe(1);
    expect((await admin.get("/api/v1/admin/provider-signups").query({ q: "nobody" })).body.users).toEqual([]);
  });
});

describe("preview tokens and page refresh edge cases", () => {
  it("rejects preview tokens without a numeric listing id", () => {
    const sign = (payload: object) => jwt.sign(payload, env.jwtSecret, { audience: "provider-preview" });
    expect(verifyPreviewToken(sign({ pid: "abc" }))).toBeNull();
    expect(verifyPreviewToken(sign({ other: 1 }))).toBeNull();
    expect(verifyPreviewToken(sign({ pid: "7" }))).toBe(7n);
  });

  it("skips empty refreshes and survives a failed lookup", async () => {
    env.revalidateSecret = "test-secret";
    const fetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    try {
      await refreshProviderPages([]);
      expect(fetch).not.toHaveBeenCalled();
      const provider = await createProvider({ slug: "listed-shop" });
      await refreshProviderPages([provider.id], ["reviews"]);
      expect(JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)).tags).toEqual(["provider:listed-shop", "sitemap", "stats", "reviews"]);
      vi.spyOn(prisma.provider, "findMany").mockRejectedValueOnce(new Error("db down"));
      await refreshProviderPages(1n);
      expect(console.warn).toHaveBeenCalledWith("[web-cache] could not look up providers to refresh:", "db down");
      vi.spyOn(prisma.provider, "findMany").mockRejectedValueOnce("odd");
      await refreshProviderPages(1n);
      expect(console.warn).toHaveBeenCalledWith("[web-cache] could not look up providers to refresh:", "odd");
      // No tags means no request; a rejection that is not an Error is still logged.
      fetch.mockClear();
      refreshShared();
      expect(fetch).not.toHaveBeenCalled();
      fetch.mockRejectedValueOnce("offline");
      revalidateWeb(["plans"]);
      await settle();
      expect(console.warn).toHaveBeenCalledWith("[web-cache] could not refresh plans:", "offline");
    } finally {
      env.revalidateSecret = "";
      vi.unstubAllGlobals();
    }
  });
});
