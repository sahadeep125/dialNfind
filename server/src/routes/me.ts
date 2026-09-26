import { Router } from "express";
import { z } from "zod";
import { pincode } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { notFound } from "../lib/errors.js";
import { pageMeta, paginationSchema } from "../lib/pagination.js";
import { currentUser, requireAuth, requireSignedIn } from "../middleware/auth.js";
import { providerCardInclude, toProviderCard } from "../services/presenter.js";

/** Customer-owned data: favorites, addresses, reviews, contact history, notifications. */
export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/overview", async (req, res) => {
  const userId = currentUser(req).id;
  const [favorites, reviews, contacts, unread, recentLeads] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.review.count({ where: { userId } }),
    prisma.lead.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.lead.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { provider: { include: providerCardInclude }, review: { select: { id: true } } },
    }),
  ]);
  res.json({
    stats: { favorites, reviews, contacts, unreadNotifications: unread },
    recentContacts: recentLeads.map((l) => ({
      id: l.id,
      channel: l.channel,
      createdAt: l.createdAt,
      customerReportedResponse: l.customerReportedResponse,
      hasReview: !!l.review,
      provider: toProviderCard(l.provider),
    })),
  });
});

// Favorites -----------------------------------------------------------------

/** GET /me/favorites — every favorite, or one page of them when `page` is given. */
meRouter.get("/favorites", async (req, res) => {
  const userId = currentUser(req).id;
  const where = { userId, provider: { status: "active" as const } };
  const paged = req.query.page !== undefined ? parse(paginationSchema, req.query) : null;
  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { provider: { include: providerCardInclude } },
      ...(paged ? { skip: (paged.page - 1) * paged.pageSize, take: paged.pageSize } : {}),
    }),
    paged ? prisma.favorite.count({ where }) : null,
  ]);
  const results = favorites.map((f) => ({ ...toProviderCard(f.provider, { isFavorite: true }), favoritedAt: f.createdAt }));
  res.json(paged ? { results, ...pageMeta(paged.page, paged.pageSize, total ?? 0) } : { results });
});

meRouter.put("/favorites/:providerId", async (req, res) => {
  const userId = currentUser(req).id;
  const providerId = idParam(req.params.providerId as string);
  const exists = await prisma.provider.findFirst({ where: { id: providerId, status: "active" }, select: { id: true } });
  if (!exists) throw notFound("Provider not found");
  await prisma.favorite.upsert({
    where: { userId_providerId: { userId, providerId } },
    create: { userId, providerId },
    update: {},
  });
  res.json({ isFavorite: true });
});

meRouter.delete("/favorites/:providerId", async (req, res) => {
  const userId = currentUser(req).id;
  const providerId = idParam(req.params.providerId as string);
  await prisma.favorite.deleteMany({ where: { userId, providerId } });
  res.json({ isFavorite: false });
});

// Addresses -----------------------------------------------------------------

const addressSchema = z.object({
  label: z.string().trim().min(1).max(30).default("Home"),
  addressLine: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().default(false),
});

meRouter.get("/addresses", async (req, res) => {
  const addresses = await prisma.userAddress.findMany({
    where: { userId: currentUser(req).id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  res.json({ addresses });
});

meRouter.post("/addresses", async (req, res) => {
  const body = parse(addressSchema, req.body);
  const userId = currentUser(req).id;
  const count = await prisma.userAddress.count({ where: { userId } });
  const isDefault = body.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.userAddress.create({ data: { ...body, isDefault, userId } });
  });
  res.status(201).json({ address });
});

meRouter.patch("/addresses/:id", async (req, res) => {
  const body = parse(addressSchema.partial(), req.body);
  const userId = currentUser(req).id;
  const id = idParam(req.params.id as string);
  const existing = await prisma.userAddress.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw notFound("Address not found");
  const address = await prisma.$transaction(async (tx) => {
    if (body.isDefault) await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.userAddress.update({ where: { id }, data: body });
  });
  res.json({ address });
});

meRouter.delete("/addresses/:id", async (req, res) => {
  const userId = currentUser(req).id;
  const id = idParam(req.params.id as string);
  const existing = await prisma.userAddress.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw notFound("Address not found");
  await prisma.userAddress.delete({ where: { id } });
  res.json({ ok: true });
});

// Reviews & contacts --------------------------------------------------------

meRouter.get("/reviews", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { userId: currentUser(req).id },
    orderBy: { createdAt: "desc" },
    include: { provider: { select: { id: true, slug: true, businessName: true, city: true, locality: true, logoUrl: true } } },
  });
  res.json({ reviews });
});

meRouter.get("/contacts", async (req, res) => {
  const q = parse(paginationSchema, req.query);
  const userId = currentUser(req).id;
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { provider: { include: providerCardInclude }, review: { select: { id: true } } },
    }),
    prisma.lead.count({ where: { userId } }),
  ]);
  res.json({
    contacts: leads.map((l) => ({
      id: l.id,
      channel: l.channel,
      createdAt: l.createdAt,
      customerReportedResponse: l.customerReportedResponse,
      hasReview: !!l.review,
      provider: toProviderCard(l.provider),
    })),
    ...pageMeta(q.page, q.pageSize, total),
  });
});

// Notifications -------------------------------------------------------------

meRouter.get("/notifications", async (req, res) => {
  const userId = currentUser(req).id;
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  res.json({ notifications, unread });
});

meRouter.post("/notifications/read", async (req, res) => {
  const body = parse(z.object({ ids: z.array(z.number().int()).optional() }), req.body ?? {});
  const userId = currentUser(req).id;
  await prisma.notification.updateMany({
    where: { userId, ...(body.ids ? { id: { in: body.ids.map(BigInt) } } : {}) },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

// Push tokens ------------------------------------------------------------------------------------
// Registered right after sign-in, before the email is confirmed, so these skip the confirmation check.

export const pushTokensRouter = Router();
pushTokensRouter.use(requireSignedIn);

const pushTokenSchema = z.object({
  token: z.string().trim().regex(/^(Expo|Exponent)PushToken\[.+\]$/, "Not an Expo push token").max(200),
  platform: z.enum(["ios", "android"]),
});

/** POST /me/push-tokens — registers this device for push alerts. A token moves to whoever signed in last. */
pushTokensRouter.post("/", async (req, res) => {
  const { token, platform } = parse(pushTokenSchema, req.body);
  const userId = currentUser(req).id;
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, userId },
    update: { userId, platform, lastSeenAt: new Date() },
  });
  res.status(201).json({ ok: true });
});

/** DELETE /me/push-tokens — stops alerts on this device (the person turned them off). */
pushTokensRouter.delete("/", async (req, res) => {
  const { token } = parse(z.object({ token: z.string().trim().max(200) }), req.body ?? {});
  await prisma.pushToken.deleteMany({ where: { token, userId: currentUser(req).id } });
  res.json({ ok: true });
});
