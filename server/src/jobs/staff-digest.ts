import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import type { AdminModule } from "../lib/permissions.js";
import { sendStaffDigest } from "../services/emails.js";

interface Queue {
  module: AdminModule;
  count: number;
  label: (n: number) => string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * One morning email per staff member listing what waits in the sections they can open. Nothing is
 * sent to someone whose queues are all empty, so a quiet day means no email.
 */
export async function sendStaffDigests(): Promise<string> {
  const [listings, claims, documents, tickets, flags, disputes] = await Promise.all([
    prisma.provider.count({ where: { status: "pending" } }),
    prisma.providerClaim.count({ where: { status: "pending" } }),
    prisma.verification.count({ where: { status: "pending" } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.reportFlag.count({ where: { status: "open" } }),
    prisma.lead.count({ where: { disputeStatus: "open" } }),
  ]);
  const all: Queue[] = [
    { module: "providers", count: listings, label: (n) => `${plural(n, "new listing")} to approve` },
    { module: "providers", count: claims, label: (n) => `${plural(n, "ownership claim")} to review` },
    { module: "verifications", count: documents, label: (n) => `${plural(n, "verification document")} to check` },
    { module: "support", count: tickets, label: (n) => `${plural(n, "support ticket")} waiting for a reply` },
    { module: "reviews", count: flags, label: (n) => `${plural(n, "reported item")} to look at` },
    { module: "leads", count: disputes, label: (n) => `${plural(n, "disputed contact")} to decide` },
  ];
  const queues = all.filter((q) => q.count > 0);
  if (!queues.length) return "nothing pending";

  const staff = await prisma.user.findMany({
    where: { status: "active", role: { in: ["super_admin", "admin"] } },
    select: { email: true, name: true, role: true, adminRole: { select: { permissions: true } } },
  });
  let sent = 0;
  for (const member of staff) {
    const allowed = member.role === "super_admin" ? null : new Set(member.adminRole?.permissions ?? []);
    const items = queues.filter((q) => !allowed || allowed.has(q.module)).map((q) => `• ${q.label(q.count)}`);
    if (!items.length) continue;
    await sendStaffDigest(member, items, env.adminUrl);
    sent++;
  }
  return `${sent} digests sent`;
}
