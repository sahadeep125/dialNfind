import { Router } from "express";
import { storage } from "../storage/index.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { email, optionalPhone, optionalUrl, password, personName } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { badRequest, conflict, forbidden, unauthorized } from "../lib/errors.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { env } from "../env.js";
import { sendMail } from "../services/mail.js";
import { revokeAllSessions, revokeSession, startSession } from "../services/sessions.js";
import { consumeUserToken, issueUserToken } from "../services/user-tokens.js";
import { limits } from "../lib/rate-limit.js";
import { anonymiseUser, sendVerificationEmail } from "../services/accounts.js";

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
    select: publicUser,
  });
  void sendVerificationEmail(user.id, user.email, user.name);
  res.status(201).json({ token: await startSession(user.id, user.role, req), user });
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
  const profile = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUser });
  res.json({ token: await startSession(user.id, user.role, req), user: profile });
});

/** POST /auth/logout — ends this sign-in on the server, so the token stops working straight away. */
authRouter.post("/logout", requireAuth, async (req, res) => {
  await revokeSession(currentUser(req).sessionId);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id }, select: publicUser });
  res.json({ user });
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
  res.json({ user });
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

const deleteSchema = z.object({ password: z.string().optional() });

// Account deletion for customers (required by the app stores); see anonymiseUser for what is kept.
authRouter.delete("/me", requireAuth, async (req, res) => {
  const body = parse(deleteSchema, req.body ?? {});
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id } });
  if (user.role !== "customer") throw forbidden("Business and staff accounts are closed by contacting DialNFind support");
  if (user.passwordHash && (!body.password || !(await bcrypt.compare(body.password, user.passwordHash)))) {
    throw badRequest("Password is incorrect", [{ path: "password", message: "Password is incorrect" }]);
  }
  await anonymiseUser(user.id);
  res.json({ ok: true });
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
