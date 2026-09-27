import { describe, expect, it, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import jwt from "jsonwebtoken";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { uploadDir } from "../../src/storage/index.js";
import { issueUserToken, issueVerifyCode } from "../../src/services/user-tokens.js";
import { verifyToken } from "../../src/lib/jwt.js";
import { api, authed, json, sentMails, settle, tokenFor } from "../helpers/app.js";
import { createOwner, createStaff, createUser, PASSWORD, seedPlans, subscribe } from "../helpers/factories.js";
import { applePrivateKeyPem, appleToken, googleToken, idToken, stubIdentityFetch } from "../helpers/oauth.js";

const register = (body: Record<string, unknown>) =>
  api().post("/api/v1/auth/register").send({ name: "Ravi Kumar", email: "ravi@example.com", password: "secret123", acceptTerms: true, ...body });

describe("register and login", () => {
  it("registers, sends a code, and refuses duplicates", async () => {
    const res = await register({ phone: "9876543210", role: "provider" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "ravi@example.com", role: "provider", phone: "+919876543210", hasPassword: true, linkedAccounts: [], provider: null });
    expect(verifyToken(res.body.token)).not.toBeNull();
    await settle();
    expect(sentMails()[0]!.subject).toMatch(/is your DialNFind code$/);
    expect((await register({})).status).toBe(409);
    const bad = await register({ email: "x", acceptTerms: false });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("bad_request");
  });
  it("logs in with the right password only", async () => {
    const u = await createUser({ email: "a@example.com" });
    const ok = await api().post("/api/v1/auth/login").send({ email: " A@example.com ", password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.user.id).toBe(Number(u.id));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).lastLoginAt).not.toBeNull();
    expect((await api().post("/api/v1/auth/login").send({ email: "a@example.com", password: "wrong" })).status).toBe(401);
    expect((await api().post("/api/v1/auth/login").send({ email: "none@example.com", password: "x" })).status).toBe(401);
    await createUser({ email: "nopass@example.com", passwordHash: null });
    expect((await api().post("/api/v1/auth/login").send({ email: "nopass@example.com", password: "x" })).status).toBe(401);
    await createUser({ email: "s@example.com", status: "suspended" });
    const suspended = await api().post("/api/v1/auth/login").send({ email: "s@example.com", password: PASSWORD });
    expect(suspended.body.error.message).toBe("This account is not active");
  });
});

describe("auth middleware", () => {
  it("accepts only live sessions of active users", async () => {
    const u = await createUser();
    const token = await tokenFor(u);
    const me = (t?: string) => api().get("/api/v1/auth/me").set("Authorization", t === undefined ? "" : `Bearer ${t}`);
    expect((await me(token)).status).toBe(200);
    expect((await me()).status).toBe(401);
    expect((await api().get("/api/v1/auth/me").set("Authorization", "Basic x")).status).toBe(401);
    expect((await me("garbage")).status).toBe(401);
    expect((await me(jwt.sign({ sub: String(u.id), role: "customer", sid: "not-a-uuid" }, env.jwtSecret))).status).toBe(401);
    const sid = verifyToken(token)!.sid;
    expect((await me(jwt.sign({ sub: "999", role: "customer", sid }, env.jwtSecret))).status).toBe(401);
    expect((await me(jwt.sign({ sub: String(u.id), role: "customer", sid: "00000000-0000-0000-0000-000000000000" }, env.jwtSecret))).status).toBe(401);
    await prisma.authSession.update({ where: { id: sid }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await me(token)).status).toBe(401);
    const t2 = await tokenFor(u);
    await prisma.authSession.update({ where: { id: verifyToken(t2)!.sid }, data: { revokedAt: new Date() } });
    expect((await me(t2)).status).toBe(401);
    const t3 = await tokenFor(u);
    await prisma.user.update({ where: { id: u.id }, data: { status: "suspended" } });
    expect((await me(t3)).status).toBe(401);
  });
  it("requires a confirmed email for customers but not staff", async () => {
    const unverified = await createUser({ verified: false });
    const c = await authed(unverified);
    expect((await c.get("/api/v1/auth/me")).status).toBe(200);
    const patch = await c.patch("/api/v1/auth/me").send({ name: "New Name" });
    expect(patch.status).toBe(403);
    expect(patch.body.error.code).toBe("email_unverified");
    const staff = await createStaff("super", { verified: false });
    expect((await (await authed(staff)).patch("/api/v1/auth/me").send({ name: "Boss Man" })).status).toBe(200);
    expect((await api().patch("/api/v1/auth/me").send({})).status).toBe(401);
  });
});

describe("profile", () => {
  it("updates the profile and releases a replaced photo", async () => {
    await writeFile(path.join(uploadDir, "old.webp"), "x");
    const old = `${env.publicUrl}/uploads/old.webp`;
    const u = await createUser({ profilePhotoUrl: old });
    const c = await authed(u);
    const res = await c.patch("/api/v1/auth/me").send({ name: "Asha Rao", phone: "", profilePhotoUrl: `${env.publicUrl}/uploads/new.webp` });
    expect(res.body.user).toMatchObject({ name: "Asha Rao", phone: null, profilePhotoUrl: `${env.publicUrl}/uploads/new.webp` });
    await settle();
    await expect(import("node:fs/promises").then((fs) => fs.stat(path.join(uploadDir, "old.webp")))).rejects.toThrow();
    // Same photo, or no photo before: nothing released.
    await c.patch("/api/v1/auth/me").send({ profilePhotoUrl: `${env.publicUrl}/uploads/new.webp` });
    const v = await createUser();
    await (await authed(v)).patch("/api/v1/auth/me").send({ profilePhotoUrl: null });
    await c.patch("/api/v1/auth/me").send({ name: "Asha R" });
  });
  it("changes passwords and signs other devices out", async () => {
    const u = await createUser();
    const other = await tokenFor(u);
    const c = await authed(u);
    expect((await c.post("/api/v1/auth/change-password").send({ newPassword: "newpass123" })).status).toBe(400);
    expect((await c.post("/api/v1/auth/change-password").send({ currentPassword: "bad", newPassword: "newpass123" })).status).toBe(400);
    expect((await c.post("/api/v1/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "newpass123" })).status).toBe(200);
    expect((await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${other}`)).status).toBe(401);
    expect((await c.get("/api/v1/auth/me")).status).toBe(200);
    await settle();
    expect(sentMails().at(-1)!.subject).toBe("Your DialNFind password was changed");
    const social = await createUser({ passwordHash: null });
    expect((await (await authed(social)).post("/api/v1/auth/change-password").send({ newPassword: "first1234" })).status).toBe(200);
  });
  it("logs out one session and drops the device push token", async () => {
    const u = await createUser();
    await prisma.pushToken.createMany({ data: [{ userId: u.id, token: "mine", platform: "ios" }, { userId: u.id, token: "other", platform: "ios" }] });
    const c = await authed(u);
    expect((await c.post("/api/v1/auth/logout").send({ pushToken: "mine" })).body).toEqual({ ok: true });
    expect(await prisma.pushToken.findMany({ select: { token: true } })).toEqual([{ token: "other" }]);
    expect((await c.get("/api/v1/auth/me")).status).toBe(401);
    const d = await authed(u);
    expect((await d.post("/api/v1/auth/logout")).status).toBe(200);
  });
});

describe("account deletion", () => {
  it("deletes customers after a password check", async () => {
    const u = await createUser({ email: "bye@example.com" });
    const c = await authed(u);
    const wrong = await c.delete("/api/v1/auth/me").send({ password: "nope" });
    expect(wrong.status).toBe(400);
    expect((await c.delete("/api/v1/auth/me").send({})).status).toBe(400);
    const ok = await c.delete("/api/v1/auth/me").send({ password: PASSWORD });
    expect(ok.body).toEqual({ ok: true, storeSubscription: null });
    expect(sentMails()[0]).toMatchObject({ to: "bye@example.com", subject: "Your DialNFind account was deleted" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).status).toBe("deleted");
  });
  it("closes businesses; password-less owners type DELETE", async () => {
    const plans = await seedPlans();
    const { user, provider } = await createOwner({}, { passwordHash: null });
    await subscribe(provider.id, plans.pro.id, { source: "app_store" });
    const c = await authed(user);
    expect((await c.delete("/api/v1/auth/me").send({ confirm: "nope" })).status).toBe(400);
    expect((await c.delete("/api/v1/auth/me")).status).toBe(400);
    const ok = await c.delete("/api/v1/auth/me").send({ confirm: " delete " });
    expect(ok.body).toEqual({ ok: true, storeSubscription: "app_store" });
    const social = await createUser({ passwordHash: null });
    expect((await (await authed(social)).delete("/api/v1/auth/me").send({})).status).toBe(200);
  });
  it("refuses staff", async () => {
    const staff = await createStaff();
    expect((await (await authed(staff)).delete("/api/v1/auth/me").send({ password: PASSWORD })).status).toBe(403);
  });
});

describe("email verification and password reset", () => {
  it("verifies by link", async () => {
    const u = await createUser({ role: "provider", verified: false });
    const token = await issueUserToken(u.id, "verify_email");
    expect((await api().post("/api/v1/auth/verify-email").send({ token })).body).toEqual({ ok: true });
    await settle();
    expect(sentMails()[0]!.subject).toBe("Welcome to DialNFind for business");
    expect((await api().post("/api/v1/auth/verify-email").send({ token })).status).toBe(400);
    const v = await createUser();
    const again = await issueUserToken(v.id, "verify_email");
    expect((await api().post("/api/v1/auth/verify-email").send({ token: again })).status).toBe(200);
  });
  it("verifies by code", async () => {
    const u = await createUser({ verified: false });
    const c = await authed(u);
    expect((await c.post("/api/v1/auth/verify-email/code").send({ code: "12" })).status).toBe(400);
    expect((await c.post("/api/v1/auth/verify-email/code").send({ code: "123456" })).body.error.message).toMatch(/expired/);
    const code = await issueVerifyCode(u.id);
    const wrong = code === "000000" ? "111111" : "000000";
    expect((await c.post("/api/v1/auth/verify-email/code").send({ code: wrong })).body.error.message).toMatch(/not right/);
    const ok = await c.post("/api/v1/auth/verify-email/code").send({ code });
    expect(ok.body.user.emailVerifiedAt).not.toBeNull();
    // Already confirmed: just returns the user.
    const d = await authed(u);
    expect((await d.post("/api/v1/auth/verify-email/code").send({ code: "999999" })).status).toBe(200);
  });
  it("resends codes with a cooldown", async () => {
    const u = await createUser({ verified: false });
    const c = await authed(u);
    expect((await c.post("/api/v1/auth/resend-verification")).body).toEqual({ ok: true, retryAfter: 60 });
    const again = await c.post("/api/v1/auth/resend-verification");
    expect(again.status).toBe(429);
    expect(again.body.error.details.retryAfter).toBeGreaterThan(0);
    await prisma.userToken.updateMany({ data: { createdAt: new Date(Date.now() - 120_000) } });
    expect((await c.post("/api/v1/auth/resend-verification")).status).toBe(200);
    const done = await createUser();
    expect((await (await authed(done)).post("/api/v1/auth/resend-verification")).status).toBe(400);
  });
  it("sends reset links only to active accounts and resets passwords", async () => {
    const u = await createUser({ email: "r@example.com", name: "Ravi Kumar" });
    await createUser({ email: "s@example.com", status: "suspended" });
    for (const email of ["r@example.com", "s@example.com", "none@example.com"]) {
      expect((await api().post("/api/v1/auth/forgot-password").send({ email })).body).toEqual({ ok: true });
    }
    await settle();
    expect(sentMails().map((m) => m.to)).toEqual(["r@example.com"]);
    const token = /token=([\w-]+)/.exec(sentMails()[0]!.text)![1]!;
    const session = await tokenFor(u);
    expect((await api().post("/api/v1/auth/reset-password").send({ token, newPassword: "brandnew1" })).body).toEqual({ ok: true });
    expect((await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${session}`)).status).toBe(401);
    expect((await api().post("/api/v1/auth/login").send({ email: "r@example.com", password: "brandnew1" })).status).toBe(200);
    expect((await api().post("/api/v1/auth/reset-password").send({ token, newPassword: "brandnew1" })).status).toBe(400);
    await settle();
    expect(sentMails().at(-1)!.subject).toBe("Your DialNFind password was changed");
  });
  it("sets a first password quietly and refuses inactive accounts", async () => {
    const invited = await createUser({ passwordHash: null, verified: false });
    const t = await issueUserToken(invited.id, "reset_password");
    expect((await api().post("/api/v1/auth/reset-password").send({ token: t, newPassword: "first1234" })).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: invited.id } })).emailVerifiedAt).not.toBeNull();
    const suspended = await createUser({ status: "suspended" });
    const t2 = await issueUserToken(suspended.id, "reset_password");
    expect((await api().post("/api/v1/auth/reset-password").send({ token: t2, newPassword: "first1234" })).body.error.message).toBe("This account is not active");
    await settle();
    expect(sentMails()).toEqual([]);
  });
});

describe("sign in with Google and Apple", () => {
  it("signs in with Google, creating the account first", async () => {
    stubIdentityFetch();
    const first = await api().post("/api/v1/auth/google").send({ idToken: await googleToken(), role: "provider" });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ isNewUser: true, user: { email: "person@example.com", role: "provider", hasPassword: false, linkedAccounts: ["google"] } });
    await settle();
    expect(sentMails()[0]!.subject).toBe("Welcome to DialNFind for business");
    const again = await api().post("/api/v1/auth/google").send({ idToken: await googleToken() });
    expect(again.status).toBe(200);
    expect(again.body.isNewUser).toBe(false);
    expect((await api().post("/api/v1/auth/google").send({ idToken: "short" })).status).toBe(400);
  });
  it("signs in with Apple and keeps a refresh token for later revocation", async () => {
    const saved = { ...env.oauth };
    Object.assign(env.oauth, { appleTeamId: "T", appleKeyId: "K", applePrivateKey: applePrivateKeyPem });
    try {
      stubIdentityFetch(() => Response.json({ refresh_token: "rt-1" }));
      const res = await api().post("/api/v1/auth/apple").send({
        idToken: await appleToken(), authorizationCode: "code-123456", redirectUri: "https://dialnfind.com/cb", name: { givenName: "Asha", familyName: null },
      });
      expect(res.status).toBe(201);
      expect(res.body.user.name).toBe("Asha");
      await settle(150);
      expect((await prisma.userOAuthAccount.findFirstOrThrow()).refreshToken).toBe("rt-1");
      // Already stored: no second exchange.
      const again = await api().post("/api/v1/auth/apple").send({ idToken: await appleToken(), authorizationCode: "code-123456" });
      expect(again.status).toBe(200);

      // Exchange fails: signing in still works.
      stubIdentityFetch(() => Response.json({ error: "invalid_grant" }, { status: 400 }));
      const other = await api().post("/api/v1/auth/apple").send({ idToken: await appleToken({ sub: "a-2", email: "two@example.com" }), authorizationCode: "code-123456" });
      expect(other.status).toBe(201);
      await settle(150);
      // Storing fails: logged.
      stubIdentityFetch(() => Response.json({ refresh_token: "rt-3" }));
      vi.spyOn(prisma.userOAuthAccount, "updateMany").mockRejectedValueOnce(new Error("db"));
      await api().post("/api/v1/auth/apple").send({ idToken: await appleToken({ sub: "a-3", email: "three@example.com" }), authorizationCode: "code-123456" });
      await settle(150);
      expect(console.warn).toHaveBeenCalledWith("[oauth] storing Apple refresh token failed:", expect.any(Error));
    } finally {
      Object.assign(env.oauth, saved);
    }
    stubIdentityFetch();
    expect((await api().post("/api/v1/auth/apple").send({ idToken: await appleToken({ sub: "a-4", email: "four@example.com" }) })).status).toBe(201);
  });
  it("bounces the Android web flow back to the app", async () => {
    const res = await api().post("/api/v1/auth/apple/callback").type("form").send({ state: "dialnfind.abc", id_token: "tok", code: "c", user: "", error: "" });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe("dialnfind://auth/apple?state=dialnfind.abc&id_token=tok&code=c");
    expect((await api().post("/api/v1/auth/apple/callback").type("form").send({ state: "evil.x" })).status).toBe(400);
    expect((await api().post("/api/v1/auth/apple/callback").type("form").send({ state: "dialnfind" })).status).toBe(400);
    expect((await api().post("/api/v1/auth/apple/callback")).status).toBe(400);
    const saved = env.oauth.appleClientIds;
    env.oauth.appleClientIds = [];
    expect((await api().post("/api/v1/auth/apple/callback")).status).toBe(501);
    expect((await api().post("/api/v1/auth/apple/notifications").send({})).status).toBe(501);
    env.oauth.appleClientIds = saved;
  });
  it("handles Apple server notifications", async () => {
    stubIdentityFetch();
    const notify = async (events: Record<string, unknown>) =>
      api().post("/api/v1/auth/apple/notifications").send({ payload: await idToken({ iss: "https://appleid.apple.com", aud: "com.dialnfind.web", events: JSON.stringify(events) } as never) });
    const socialOnly = await createUser({ passwordHash: null });
    await prisma.userOAuthAccount.create({ data: { userId: socialOnly.id, provider: "apple", providerUserId: "s1", email: "old@relay" } });
    const session = await tokenFor(socialOnly);
    expect((await notify({ type: "email-disabled", sub: "s1", email: "NEW@relay" })).body).toEqual({ ok: true });
    expect((await prisma.userOAuthAccount.findFirstOrThrow()).email).toBe("new@relay");
    await notify({ type: "email-enabled", sub: "s1" });
    await notify({ type: "something-else", sub: "s1" });
    await notify({ type: "consent-revoked", sub: "unknown" });
    await notify({ type: "account-delete", sub: "s1" });
    expect(await prisma.userOAuthAccount.count()).toBe(0);
    expect((await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${session}`)).status).toBe(401);

    const withPassword = await createUser();
    await prisma.userOAuthAccount.create({ data: { userId: withPassword.id, provider: "apple", providerUserId: "p1" } });
    const kept = await tokenFor(withPassword);
    await notify({ type: "consent-revoked", sub: "p1" });
    expect((await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${kept}`)).status).toBe(200);

    expect((await api().post("/api/v1/auth/apple/notifications").send({ payload: "x".repeat(30) })).status).toBe(400);
  });
});

describe("helpers", () => {
  it("json helper builds responses", async () => {
    expect(await json({ a: 1 }).json()).toEqual({ a: 1 });
  });
});
