import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { badRequest, notFound } from "../lib/errors.js";
import { httpUrl } from "../lib/rules.js";
import { pageMeta, paginationSchema } from "../lib/pagination.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { notify } from "../services/notify.js";
import { supportStaffIds, TICKET_CATEGORIES, ticketListSelect, ticketRef } from "../services/tickets.js";

/** Help-desk tickets for signed-in customers and providers. Staff side lives in routes/admin/support.ts. */
export const supportRouter = Router();
supportRouter.use(requireAuth);

const createSchema = z.object({
  subject: z.string().trim().min(5, "Write a short subject, at least 5 characters").max(120),
  category: z.enum(TICKET_CATEGORIES).default("general"),
  message: z.string().trim().min(10, "Describe the problem in at least 10 characters").max(5000),
  attachments: z.array(httpUrl).max(5).default([]),
});

supportRouter.get("/tickets", async (req, res) => {
  const q = parse(paginationSchema, req.query);
  const where = { userId: currentUser(req).id };
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({ where, orderBy: { lastActivityAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, select: ticketListSelect }),
    prisma.supportTicket.count({ where }),
  ]);
  res.json({ tickets: tickets.map(({ assignedTo: _a, ...t }) => ({ ...t, reference: ticketRef(t.id) })), ...pageMeta(q.page, q.pageSize, total) });
});

supportRouter.post("/tickets", async (req, res) => {
  const body = parse(createSchema, req.body);
  const me = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id }, select: { id: true, name: true, email: true, phone: true, provider: { select: { id: true } } } });
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: me.id,
      providerId: me.provider?.id ?? null,
      name: me.name,
      email: me.email,
      phone: me.phone,
      subject: body.subject,
      category: body.category,
      source: me.provider ? "provider_app" : "web",
      messages: { create: { authorId: me.id, body: body.message, attachments: body.attachments } },
    },
  });
  for (const id of await supportStaffIds(null)) void notify(id, "support", `New ticket ${ticketRef(ticket.id)}`, body.subject, { ticketId: Number(ticket.id) });
  res.status(201).json({ ticket: { ...ticket, reference: ticketRef(ticket.id) } });
});

async function ownTicket(req: Parameters<typeof currentUser>[0]) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!ticket || ticket.userId !== currentUser(req).id) throw notFound("Ticket not found");
  return ticket;
}

supportRouter.get("/tickets/:id", async (req, res) => {
  const ticket = await ownTicket(req);
  const messages = await prisma.supportTicket
    .findUniqueOrThrow({ where: { id: ticket.id } })
    .messages({ where: { isInternal: false }, orderBy: { createdAt: "asc" }, select: { id: true, body: true, attachments: true, fromStaff: true, createdAt: true, author: { select: { name: true } } } });
  res.json({
    ticket: { ...ticket, reference: ticketRef(ticket.id) },
    // Requesters see "DialNFind Support" rather than the individual staff member's name.
    messages: messages.map((m) => ({ ...m, authorName: m.fromStaff ? "DialNFind Support" : (m.author?.name ?? ticket.name), author: undefined })),
  });
});

const replySchema = z.object({ body: z.string().trim().min(1, "Write a message").max(5000), attachments: z.array(httpUrl).max(5).default([]) });

supportRouter.post("/tickets/:id/messages", async (req, res) => {
  const body = parse(replySchema, req.body);
  const ticket = await ownTicket(req);
  if (ticket.status === "closed") throw badRequest("This ticket is closed. Open a new ticket if you still need help.");
  const message = await prisma.ticketMessage.create({ data: { ticketId: ticket.id, authorId: currentUser(req).id, body: body.body, attachments: body.attachments } });
  // A customer reply reopens a ticket that was waiting on them or marked resolved.
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "open", lastActivityAt: new Date() } });
  for (const id of await supportStaffIds(ticket.assignedToId)) void notify(id, "support", `Reply on ${ticketRef(ticket.id)}`, body.body.slice(0, 120), { ticketId: Number(ticket.id) });
  res.status(201).json({ message });
});

/** The requester can close their own ticket once it is sorted. */
supportRouter.post("/tickets/:id/close", async (req, res) => {
  const ticket = await ownTicket(req);
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "closed", lastActivityAt: new Date() } });
  res.json({ ok: true });
});
