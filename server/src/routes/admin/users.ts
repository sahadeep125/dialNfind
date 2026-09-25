import { Router } from "express";
import { z } from "zod";
import type { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { pageMeta, paginationSchema } from "../../lib/pagination.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { anonymiseUser, sendVerificationEmail } from "../../services/accounts.js";
import { revokeAllSessions } from "../../services/sessions.js";
import { ticketRef } from "../../services/tickets.js";

/** Customer and provider accounts. Team members (admin, super admin) are managed from Team. */
export const adminUsersRouter = Router();

export const usersQuery = paginationSchema.extend({
  q: z.string().trim().optional(),
  role: z.enum(["super_admin", "admin", "provider", "customer"]).optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
});

export function userWhere(q: z.infer<typeof usersQuery>): Prisma.UserWhereInput {
  return {
    ...(q.role ? { role: q.role } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.q
      ? { OR: [{ name: { contains: q.q, mode: "insensitive" as const } }, { email: { contains: q.q, mode: "insensitive" as const } }, { phone: { contains: q.q } }] }
      : {}),
  };
}

adminUsersRouter.get("/users", async (req, res) => {
  const q = parse(usersQuery, req.query);
  const where = userWhere(q);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        profilePhotoUrl: true,
        provider: { select: { id: true, businessName: true, slug: true } },
        _count: { select: { reviews: true, leads: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ users, ...pageMeta(q.page, q.pageSize, total) });
});

/** Loads a customer or provider account the admin may change, refusing their own account and team members. */
async function editableUser(req: Parameters<typeof currentUser>[0], id: bigint) {
  if (id === currentUser(req).id) throw badRequest("You cannot change your own account here");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User not found");
  if (user.role === "super_admin" || user.role === "admin") throw badRequest("Manage team members from Team");
  return user;
}

/** Suspends, reactivates or deletes (anonymises) one account. Suspended and deleted accounts are signed out everywhere. */
async function setUserStatus(adminId: bigint, id: bigint, status: UserStatus) {
  if (status === "deleted") await anonymiseUser(id);
  else {
    await prisma.user.update({ where: { id }, data: { status } });
    if (status !== "active") await revokeAllSessions(id);
  }
  await logAdmin(adminId, status === "deleted" ? "user.anonymise" : "user.update", "user", id, { status });
}

adminUsersRouter.get("/users/:id", async (req, res) => {
  const id = idParam(req.params.id as string);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      profilePhotoUrl: true,
      createdAt: true,
      lastLoginAt: true,
      provider: { select: { id: true, businessName: true, slug: true, status: true, city: true } },
      _count: { select: { reviews: true, leads: true, favorites: true, tickets: true } },
    },
  });
  if (!user) throw notFound("User not found");
  const [reviews, leads, favorites, tickets, sessions] = await Promise.all([
    prisma.review.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, rating: true, reviewText: true, status: true, createdAt: true, provider: { select: { id: true, businessName: true } } } }),
    prisma.lead.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, channel: true, createdAt: true, customerReportedResponse: true, provider: { select: { id: true, businessName: true } } } }),
    prisma.favorite.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { provider: { select: { id: true, businessName: true, city: true } } } }),
    prisma.supportTicket.findMany({ where: { userId: id }, orderBy: { lastActivityAt: "desc" }, take: 10, select: { id: true, subject: true, status: true, lastActivityAt: true } }),
    prisma.authSession.findMany({
      where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, createdAt: true, expiresAt: true, ip: true, userAgent: true },
    }),
  ]);
  res.json({
    user,
    reviews,
    leads,
    favorites: favorites.map((f) => f.provider),
    tickets: tickets.map((t) => ({ ...t, reference: ticketRef(t.id) })),
    sessions,
  });
});

adminUsersRouter.patch("/users/:id", async (req, res) => {
  const body = parse(z.object({ status: z.enum(["active", "suspended", "deleted"]) }), req.body);
  const target = await editableUser(req, idParam(req.params.id as string));
  await setUserStatus(currentUser(req).id, target.id, body.status);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: target.id }, select: { id: true, role: true, status: true } });
  res.json({ user });
});

/** POST /admin/users/:id/sign-out — ends every session, e.g. after a lost phone. */
adminUsersRouter.post("/users/:id/sign-out", async (req, res) => {
  const target = await editableUser(req, idParam(req.params.id as string));
  await revokeAllSessions(target.id);
  await logAdmin(currentUser(req).id, "user.sign_out", "user", target.id);
  res.json({ ok: true });
});

adminUsersRouter.post("/users/:id/resend-verification", async (req, res) => {
  const target = await editableUser(req, idParam(req.params.id as string));
  if (target.status !== "active") throw badRequest("This account is not active");
  if (target.emailVerifiedAt) throw badRequest("This email address is already confirmed");
  await sendVerificationEmail(target.id, target.email, target.name);
  await logAdmin(currentUser(req).id, "user.resend_verification", "user", target.id);
  res.json({ ok: true });
});

/** POST /admin/users/bulk — suspend or reactivate up to 100 accounts; team members and your own account are skipped. */
adminUsersRouter.post("/users/bulk", async (req, res) => {
  const body = parse(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), action: z.enum(["suspend", "reactivate"]) }), req.body);
  const adminId = currentUser(req).id;
  const targets = await prisma.user.findMany({
    where: { id: { in: body.ids.map(BigInt) }, role: { in: ["customer", "provider"] }, status: { not: "deleted" }, NOT: { id: adminId } },
    select: { id: true },
  });
  for (const t of targets) await setUserStatus(adminId, t.id, body.action === "suspend" ? "suspended" : "active");
  res.json({ updated: targets.length });
});
