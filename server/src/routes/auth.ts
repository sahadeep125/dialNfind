import express, { Router } from "express";
import { storage } from "../storage/index.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { email, optionalPhone, optionalUrl, password, personName } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { badRequest, conflict, forbidden, notConfigured, unauthorized } from "../lib/errors.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { env } from "../env.js";
import { sendMail } from "../services/mail.js";
import { revokeAllSessions, revokeSession, startSession } from "../services/sessions.js";
import { consumeUserToken, issueUserToken } from "../services/user-tokens.js";
import { limits } from "../lib/rate-limit.js";
import { anonymiseUser, closeBusinessAccount, sendVerificationEmail } from "../services/accounts.js";
import { appleEnabled, exchangeAppleCode, verifyAppleIdToken, verifyAppleNotification, verifyGoogleIdToken } from "../lib/oauth.js";
import { signInWithIdentity, storeAppleRefreshToken } from "../services/social-auth.js";

export const authRouter = Router();

const publicUser = {
  id: true,
  role: true,
  name: true,
  email: true,
  phone: true,
  profilePhotoUrl: true,
  emailVerifiedAt: true,
  createdAt: true,
  provider: { select: { id: true, slug: true, businessName: true, status: true } },
} as const;

/** The signed-in user as every app sees it, plus how they can sign in (for "set a password" and account deletion). */
async function sessionUser(id: bigint) {
  const { passwordHash, oauthAccounts, ...user } = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { ...publicUser, passwordHash: true, oauthAccounts: { select: { provider: true } } },
  });
  return { ...user, hasPassword: passwordHash !== null, linkedAccounts: [...new Set(oauthAccounts.map((a) => a.provider))] };
}

const registerSchema = z.object({
  name: personName,
  email,
  password,
  phone: optionalPhone,
  // Only customer or provider can self-register; super_admin is seeded.
  role: z.enum(["customer", "provider"]).default("customer"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

authRouter.post("/register", limits.auth, async (req, res) => {
  const body = parse(registerSchema, req.body);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw conflict("An account with this email already exists");
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role,
      passwordHash: await bcrypt.hash(body.password, 10),
      termsAcceptedAt: new Date(),
    },
  });
  void sendVerificationEmail(user.id, user.email, user.name);
  res.status(201).json({ token: await startSession(user.id, user.role, req), user: await sessionUser(user.id) });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post("/login", limits.auth, async (req, res) => {
  const body = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw unauthorized("Incorrect email or password");
  }
  if (user.status !== "active") throw unauthorized("This account is not active");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json({ token: await startSession(user.id, user.role, req), user: await sessionUser(user.id) });
});

// Sign in with Google / Apple ---------------------------------------------------------------------
// Apps get an ID token from Google or Apple and send it here. We check it against the provider's keys,
// then sign in to the linked account, link an account with the same verified email, or create one.

const socialRole = z.enum(["customer", "provider"]).default("customer");
const idToken = z.string().min(20).max(5000);
const rawNonce = z.string().min(16).max(200).optional();

authRouter.post("/google", limits.auth, async (req, res) => {
  const body = parse(z.object({ idToken, nonce: rawNonce, role: socialRole }), req.body);
  const identity = await verifyGoogleIdToken(body.idToken, body.nonce);
  const { user, isNewUser } = await signInWithIdentity({ provider: "google", identity, role: body.role });
  res.status(isNewUser ? 201 : 200).json({ token: await startSession(user.id, user.role, req), user: await sessionUser(user.id), isNewUser });
});

const appleSchema = z.object({
  idToken,
  nonce: rawNonce,
  /** One-time code from the same sign-in; exchanged for a refresh token so access can be revoked on deletion. */
  authorizationCode: z.string().min(10).max(1000).optional(),
  /** The redirect URI used on the web and Android flows (Apple needs it again for the code exchange). */
  redirectUri: z.string().url().startsWith("https://").max(500).optional(),
  /** Apple gives the name to the app only on the first sign-in, never in the token. */
  name: z
    .object({ givenName: z.string().max(80).nullish(), familyName: z.string().max(80).nullish() })
    .nullish(),
  role: socialRole,
});

authRouter.post("/apple", limits.auth, async (req, res) => {
  const body = parse(appleSchema, req.body);
  const identity = await verifyAppleIdToken(body.idToken, body.nonce);
  const name = [body.name?.givenName, body.name?.familyName].filter(Boolean).join(" ");
  const { user, isNewUser } = await signInWithIdentity({ provider: "apple", identity, role: body.role, name });
  if (body.authorizationCode) {
    const code = body.authorizationCode;
    const link = await prisma.userOAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: "apple", providerUserId: identity.sub } },
      select: { refreshToken: true },
    });
    if (!link?.refreshToken) {
      // In the background: Apple's token endpoint should not slow down signing in.
      void exchangeAppleCode(code, identity.audience, body.redirectUri).then((token) => {
        if (token) return storeAppleRefreshToken(identity.sub, token, identity.audience);
      }).catch((err) => console.warn("[oauth] storing Apple refresh token failed:", err));
    }
  }
  res.status(isNewUser ? 201 : 200).json({ token: await startSession(user.id, user.role, req), user: await sessionUser(user.id), isNewUser });
});

/**
 * POST /auth/apple/callback — Android "Sign in with Apple" runs Apple's web flow in a browser tab, and Apple
 * posts the result here (response_mode=form_post). We hand it straight back to the app through its URL
 * scheme, named in `state`; the app then sends the ID token to POST /auth/apple like iOS does.
 */
authRouter.post("/apple/callback", express.urlencoded({ extended: false, limit: "20kb" }), (req, res) => {
  if (!appleEnabled()) throw notConfigured("Sign in with Apple is not available yet");
  const field = (name: string) => (typeof req.body?.[name] === "string" ? (req.body[name] as string) : "");
  const state = field("state");
  const scheme = state.split(".")[0];
  if (!state.includes(".") || !env.oauth.appRedirectSchemes.includes(scheme)) throw badRequest("Unknown sign-in request");
  const params = new URLSearchParams({ state });
  for (const key of ["id_token", "code", "user", "error"]) if (field(key)) params.set(key, field(key));
  res.redirect(303, `${scheme}://auth/apple?${params.toString()}`);
});

/**
 * POST /auth/apple/notifications — Apple's server-to-server events (set this URL in the Services ID).
 * When someone stops using Sign in with Apple with us or deletes their Apple account, the link is removed.
 */
authRouter.post("/apple/notifications", async (req, res) => {
  if (!appleEnabled()) throw notConfigured("Sign in with Apple is not available yet");
  const { payload } = parse(z.object({ payload: z.string().min(20).max(10_000) }), req.body);
  const event = await verifyAppleNotification(payload).catch(() => {
    throw badRequest("Invalid notification");
  });
  const link = await prisma.userOAuthAccount.findUnique({
    where: { provider_providerUserId: { provider: "apple", providerUserId: event.sub } },
    include: { user: { select: { passwordHash: true, _count: { select: { oauthAccounts: true } } } } },
  });
  if (link) {
    if (event.type === "consent-revoked" || event.type === "account-delete") {
      await prisma.userOAuthAccount.delete({ where: { id: link.id } });
      // With no other way in, the person can no longer sign in, so end the sessions they still have.
      if (!link.user.passwordHash && link.user._count.oauthAccounts <= 1) await revokeAllSessions(link.userId);
    } else if ((event.type === "email-disabled" || event.type === "email-enabled") && event.email) {
      await prisma.userOAuthAccount.update({ where: { id: link.id }, data: { email: event.email.toLowerCase() } });
    }
  }
  res.json({ ok: true });
});

/** POST /auth/logout — ends this sign-in on the server, so the token stops working straight away. */
authRouter.post("/logout", requireAuth, async (req, res) => {
  // The business app sends its push token so this device stops getting alerts.
  const pushToken = typeof req.body?.pushToken === "string" ? req.body.pushToken : null;
  if (pushToken) await prisma.pushToken.deleteMany({ where: { token: pushToken, userId: currentUser(req).id } });
  await revokeSession(currentUser(req).sessionId);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await sessionUser(currentUser(req).id) });
});

const updateSchema = z.object({
  name: personName.optional(),
  phone: optionalPhone,
  profilePhotoUrl: optionalUrl.optional(),
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const body = parse(updateSchema, req.body);
  const before = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id }, select: { profilePhotoUrl: true } });
  const user = await prisma.user.update({ where: { id: currentUser(req).id }, data: body, select: publicUser });
  if (body.profilePhotoUrl !== undefined && before.profilePhotoUrl && before.profilePhotoUrl !== user.profilePhotoUrl) void storage.remove(before.profilePhotoUrl);
  res.json({ user: await sessionUser(user.id) });
});

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: password,
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const body = parse(passwordSchema, req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id } });
  if (user.passwordHash) {
    if (!body.currentPassword || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      throw badRequest("Current password is incorrect");
    }
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 10) } });
  // Other devices must sign in again with the new password; this one stays signed in.
  await revokeAllSessions(user.id, currentUser(req).sessionId);
  res.json({ ok: true });
});

// Business accounts without a password (Google/Apple only) confirm by typing DELETE instead.
const deleteSchema = z.object({ password: z.string().optional(), confirm: z.string().optional() });

// Account deletion for customers and businesses (required by the app stores); see anonymiseUser for what is kept.
authRouter.delete("/me", requireAuth, async (req, res) => {
  const body = parse(deleteSchema, req.body ?? {});
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id } });
  if (user.role !== "customer" && user.role !== "provider") throw forbidden("Staff accounts are closed by a super admin");
  if (user.passwordHash) {
    if (!body.password || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw badRequest("Password is incorrect", [{ path: "password", message: "Password is incorrect" }]);
    }
  } else if (user.role === "provider" && body.confirm?.trim().toUpperCase() !== "DELETE") {
    throw badRequest("Type DELETE to confirm", [{ path: "confirm", message: "Type DELETE to confirm" }]);
  }
  const { storeSubscription } = user.role === "provider" ? await closeBusinessAccount(user.id) : { storeSubscription: null };
  await anonymiseUser(user.id);
  res.json({ ok: true, storeSubscription });
});

// Email verification and password reset -----------------------------------------------------------

/** POST /auth/verify-email — the link from the verification email. Works without being signed in. */
authRouter.post("/verify-email", limits.auth, async (req, res) => {
  const { token } = parse(z.object({ token: z.string().min(20).max(200) }), req.body);
  const userId = await consumeUserToken(token, "verify_email");
  if (!userId) throw badRequest("This link has expired or was already used. Sign in and ask for a new one.");
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  res.json({ ok: true });
});

/** POST /auth/resend-verification — sends a fresh link to the signed-in user. */
authRouter.post("/resend-verification", limits.auth, requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id }, select: { id: true, email: true, name: true, emailVerifiedAt: true } });
  if (user.emailVerifiedAt) throw badRequest("Your email address is already confirmed");
  await sendVerificationEmail(user.id, user.email, user.name);
  res.json({ ok: true });
});

/** POST /auth/forgot-password — always answers the same way so it cannot be used to find out who has an account. */
authRouter.post("/forgot-password", limits.auth, async (req, res) => {
  const body = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true, name: true, email: true, status: true } });
  if (user && user.status === "active") {
    const token = await issueUserToken(user.id, "reset_password");
    void sendMail({
      to: user.email,
      subject: "Reset your password",
      lines: [
        `Hi ${user.name.split(" ")[0]},`,
        "Someone asked to reset the password for your DialNFind account. If it was you, choose a new password with the button below. The link works for one hour.",
        "If you did not ask for this, you can ignore this email; your password stays the same.",
      ],
      action: { label: "Choose a new password", url: `${env.webUrl}/reset-password?token=${token}` },
    });
  }
  res.json({ ok: true });
});

/** POST /auth/reset-password — sets a new password from the emailed link. Opening the link also proves the address. */
authRouter.post("/reset-password", limits.auth, async (req, res) => {
  const body = parse(z.object({ token: z.string().min(20).max(200), newPassword: password }), req.body);
  const userId = await consumeUserToken(body.token, "reset_password");
  if (!userId) throw badRequest("This link has expired or was already used. Ask for a new one.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { status: true, emailVerifiedAt: true } });
  if (user.status !== "active") throw badRequest("This account is not active");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(body.newPassword, 10), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
  });
  await revokeAllSessions(userId);
  res.json({ ok: true });
});
