import { Router } from "express";
import { storage } from "../storage/index.js";
import { pluginEnabled } from "../services/settings.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { email, optionalPhone, optionalUrl, password, personName } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { signToken } from "../lib/jwt.js";
import { badRequest, conflict, forbidden, notConfigured, unauthorized } from "../lib/errors.js";
import { recalculateProvider } from "../services/ranking.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { env } from "../env.js";

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

authRouter.post("/register", async (req, res) => {
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
  res.status(201).json({ token: signToken(user.id, user.role), user });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const body = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw unauthorized("Incorrect email or password");
  }
  if (user.status !== "active") throw unauthorized("This account is not active");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const profile = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUser });
  res.json({ token: signToken(user.id, user.role), user: profile });
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
  res.json({ ok: true });
});

const deleteSchema = z.object({ password: z.string().optional() });

// Account deletion for customers (required by the app stores). The row is kept so leads and audit
// history stay consistent, but everything that identifies the person is cleared and they can no
// longer sign in. Their reviews are removed and the affected providers' ratings recalculated.
authRouter.delete("/me", requireAuth, async (req, res) => {
  const body = parse(deleteSchema, req.body ?? {});
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id } });
  if (user.role !== "customer") throw forbidden("Business and staff accounts are closed by contacting DialNFind support");
  if (user.passwordHash && (!body.password || !(await bcrypt.compare(body.password, user.passwordHash)))) {
    throw badRequest("Password is incorrect", [{ path: "password", message: "Password is incorrect" }]);
  }
  const reviews = await prisma.review.findMany({ where: { userId: user.id }, select: { providerId: true, photos: { select: { photoUrl: true } } } });
  await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { userId: user.id } }),
    prisma.userAddress.deleteMany({ where: { userId: user.id } }),
    prisma.deviceToken.deleteMany({ where: { userId: user.id } }),
    prisma.userOAuthAccount.deleteMany({ where: { userId: user.id } }),
    prisma.review.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { status: "deleted", name: "Deleted user", email: `deleted-${user.id}@deleted.invalid`, phone: null, passwordHash: null, profilePhotoUrl: null },
    }),
  ]);
  for (const r of reviews) for (const p of r.photos) void storage.remove(p.photoUrl);
  for (const providerId of new Set(reviews.map((r) => r.providerId))) await recalculateProvider(providerId);
  if (user.profilePhotoUrl) void storage.remove(user.profilePhotoUrl);
  res.json({ ok: true });
});

const oauthSchema = z.object({ idToken: z.string().min(10), role: z.enum(["customer", "provider"]).default("customer") });

// Social sign-in. The token verification step needs client credentials; until they are set these
// endpoints validate input and answer 501 so the frontends can show a clear message.
authRouter.post("/oauth/google", async (req, res) => {
  parse(oauthSchema, req.body);
  if (!env.googleClientId && !(await pluginEnabled("google_oauth"))) throw notConfigured("Google sign-in is not configured yet");
  throw notConfigured("Google token verification is not implemented yet");
});

authRouter.post("/oauth/apple", async (req, res) => {
  parse(oauthSchema, req.body);
  if (!env.appleClientId && !(await pluginEnabled("apple_oauth"))) throw notConfigured("Apple sign-in is not configured yet");
  throw notConfigured("Apple token verification is not implemented yet");
});
