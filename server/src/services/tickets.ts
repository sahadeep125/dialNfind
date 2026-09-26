import { prisma } from "../lib/prisma.js";
import { notify } from "./notify.js";
import { sendTicketReceived } from "./emails.js";
import { planOf } from "./entitlements.js";

export const TICKET_CATEGORIES = ["general", "account", "listing", "billing", "verification", "report", "technical"] as const;

/** Public reference shown to customers, e.g. DNF-000123. */
export const ticketRef = (id: bigint | number) => `DNF-${String(id).padStart(6, "0")}`;

export const ticketListSelect = {
  id: true,
  subject: true,
  category: true,
  priority: true,
  status: true,
  source: true,
  name: true,
  email: true,
  lastActivityAt: true,
  createdAt: true,
  assignedTo: { select: { id: true, name: true } },
  provider: { select: { id: true, businessName: true } },
  _count: { select: { messages: { where: { isInternal: false } } } },
} as const;

/** Staff to notify about new activity: the assignee, or everyone who can open support. */
export async function supportStaffIds(assignedToId: bigint | null): Promise<bigint[]> {
  if (assignedToId) return [assignedToId];
  const staff = await prisma.user.findMany({
    where: { status: "active", OR: [{ role: "super_admin" }, { role: "admin", adminRole: { permissions: { has: "support" } } }] },
    select: { id: true },
  });
  return staff.map((s) => s.id);
}

/** Opens a ticket for a signed-in user (customer or provider) and tells the support team. */
export async function openTicket(userId: bigint, input: { subject: string; category: (typeof TICKET_CATEGORIES)[number]; message: string; attachments?: string[] }) {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, provider: { select: { id: true } } } });
  // Business plan: priority support.
  const priority = me.provider && (await planOf(me.provider.id)).entitlements.includes("provider_business") ? "high" : "normal";
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: me.id,
      providerId: me.provider?.id ?? null,
      name: me.name,
      email: me.email,
      phone: me.phone,
      subject: input.subject,
      category: input.category,
      priority,
      source: me.provider ? "provider_app" : "web",
      messages: { create: { authorId: me.id, body: input.message, attachments: input.attachments ?? [] } },
    },
  });
  for (const id of await supportStaffIds(null)) void notify(id, "support", `New ticket ${ticketRef(ticket.id)}`, input.subject, { ticketId: Number(ticket.id) });
  void sendTicketReceived(me.email, me.name, ticketRef(ticket.id), input.subject, true);
  return { ...ticket, reference: ticketRef(ticket.id) };
}
