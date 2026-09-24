import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { httpUrl } from "../../lib/rules.js";
import { pageMeta, paginationSchema } from "../../lib/pagination.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { notify } from "../../services/notify.js";
import { ticketListSelect, ticketRef } from "../../services/tickets.js";

/** Staff side of the help desk. */
export const adminSupportRouter = Router();

const listQuery = paginationSchema.extend({
  status: z.enum(["open", "pending", "resolved", "closed", "active"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignee: z.union([z.literal("me"), z.literal("none"), z.coerce.number().int().positive()]).optional(),
  q: z.string().trim().max(100).optional(),
});

adminSupportRouter.get("/tickets", async (req, res) => {
  const q = parse(listQuery, req.query);
  const me = currentUser(req).id;
  const ref = q.q?.match(/^(?:DNF-)?0*(\d+)$/i);
  const where: Prisma.SupportTicketWhereInput = {
    ...(q.status === "active" ? { status: { in: ["open", "pending"] } } : q.status ? { status: q.status } : {}),
    ...(q.priority ? { priority: q.priority } : {}),
    ...(q.assignee === "me" ? { assignedToId: me } : q.assignee === "none" ? { assignedToId: null } : q.assignee ? { assignedToId: BigInt(q.assignee) } : {}),
    ...(q.q
      ? ref
        ? { id: BigInt(ref[1]) }
        : { OR: [{ subject: { contains: q.q, mode: "insensitive" } }, { email: { contains: q.q, mode: "insensitive" } }, { name: { contains: q.q, mode: "insensitive" } }] }
      : {}),
  };
  const [tickets, total, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ lastActivityAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: ticketListSelect,
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: true }),
  ]);
  res.json({
    tickets: tickets.map((t) => ({ ...t, reference: ticketRef(t.id) })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    ...pageMeta(q.page, q.pageSize, total),
  });
});

/** Team members a ticket can be assigned to: active staff who can open support. */
adminSupportRouter.get("/tickets/assignees", async (_req, res) => {
  const staff = await prisma.user.findMany({
    where: { status: "active", OR: [{ role: "super_admin" }, { role: "admin", adminRole: { permissions: { has: "support" } } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  res.json({ assignees: staff });
});

adminSupportRouter.get("/tickets/:id", async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: idParam(req.params.id as string) },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } },
      provider: { select: { id: true, businessName: true, slug: true, city: true, status: true } },
      assignedTo: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
    },
  });
  if (!ticket) throw notFound("Ticket not found");
  const history = ticket.userId
    ? await prisma.supportTicket.findMany({ where: { userId: ticket.userId, id: { not: ticket.id } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, subject: true, status: true, createdAt: true } })
    : [];
  res.json({ ticket: { ...ticket, reference: ticketRef(ticket.id) }, history: history.map((h) => ({ ...h, reference: ticketRef(h.id) })) });
});

const updateSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  category: z.string().trim().min(2).max(30).optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
});

adminSupportRouter.patch("/tickets/:id", async (req, res) => {
  const body = parse(updateSchema, req.body);
  const id = idParam(req.params.id as string);
  const before = await prisma.supportTicket.findUnique({ where: { id } });
  if (!before) throw notFound("Ticket not found");
  if (body.assignedToId) {
    const staff = await prisma.user.findUnique({ where: { id: BigInt(body.assignedToId) }, select: { role: true, status: true } });
    if (!staff || !["super_admin", "admin"].includes(staff.role) || staff.status !== "active") throw badRequest("Assign the ticket to an active team member");
  }
  const { assignedToId, ...rest } = body;
  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { ...rest, ...(assignedToId !== undefined ? { assignedToId: assignedToId === null ? null : BigInt(assignedToId) } : {}) },
  });
  await logAdmin(currentUser(req).id, "ticket.update", "support_ticket", id, body);
  if (body.assignedToId && BigInt(body.assignedToId) !== currentUser(req).id && before.assignedToId?.toString() !== String(body.assignedToId)) {
    void notify(BigInt(body.assignedToId), "support", `${ticketRef(id)} assigned to you`, before.subject, { ticketId: Number(id) });
  }
  if (body.status === "resolved" && before.status !== "resolved") {
    void notify(before.userId, "support", `Ticket ${ticketRef(id)} resolved`, "Reply to the ticket if you still need help.", { ticketId: Number(id) });
  }
  res.json({ ticket });
});

const messageSchema = z.object({
  body: z.string().trim().min(1, "Write a reply").max(5000),
  isInternal: z.boolean().default(false),
  attachments: z.array(httpUrl).max(5).default([]),
  // Status to move to after replying; a public reply defaults to pending (waiting on the customer).
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
});

adminSupportRouter.post("/tickets/:id/messages", async (req, res) => {
  const body = parse(messageSchema, req.body);
  const id = idParam(req.params.id as string);
  const admin = currentUser(req);
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw notFound("Ticket not found");
  const message = await prisma.ticketMessage.create({
    data: { ticketId: id, authorId: admin.id, fromStaff: true, isInternal: body.isInternal, body: body.body, attachments: body.attachments },
  });
  const status = body.status ?? (body.isInternal ? ticket.status : "pending");
  await prisma.supportTicket.update({
    where: { id },
    data: { status, lastActivityAt: new Date(), ...(ticket.assignedToId ? {} : { assignedToId: admin.id }) },
  });
  if (!body.isInternal) {
    void notify(ticket.userId, "support", `New reply on ${ticketRef(id)}`, body.body.slice(0, 120), { ticketId: Number(id) });
  }
  await logAdmin(admin.id, body.isInternal ? "ticket.note" : "ticket.reply", "support_ticket", id);
  res.status(201).json({ message });
});
