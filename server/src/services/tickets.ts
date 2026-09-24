import { prisma } from "../lib/prisma.js";

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
