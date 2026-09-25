import { prisma } from "../lib/prisma.js";
import { localToday } from "../lib/hours.js";
import { env } from "../env.js";
import { notifyAndEmail } from "../services/notify.js";
import { recalculateProvider } from "../services/ranking.js";

const longDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Plans whose end date has passed become expired, and the provider loses the plan's ranking boost. */
export async function expireSubscriptions(): Promise<string> {
  const due = await prisma.providerSubscription.findMany({
    where: { status: "active", endDate: { lt: localToday() } },
    include: { plan: { select: { name: true } }, provider: { select: { id: true, userId: true } } },
  });
  for (const sub of due) {
    await prisma.providerSubscription.update({ where: { id: sub.id }, data: { status: "expired" } });
    await recalculateProvider(sub.providerId);
    await notifyAndEmail(
      sub.provider.userId,
      "subscription",
      `Your ${sub.plan.name} plan has ended`,
      "Your listing stays on DialNFind. Contact us from Plan and billing to renew and keep the extra reach.",
      { subscriptionId: Number(sub.id) },
      { label: "Renew your plan", url: `${env.providerUrl}/subscription` },
    );
  }
  return `${due.length} expired`;
}

/** Three days before a plan ends, the provider is reminded to renew. */
export async function remindExpiringSubscriptions(): Promise<string> {
  const due = await prisma.providerSubscription.findMany({
    where: { status: "active", endDate: localToday(3) },
    include: { plan: { select: { name: true } }, provider: { select: { userId: true } } },
  });
  for (const sub of due) {
    await notifyAndEmail(
      sub.provider.userId,
      "subscription",
      `Your ${sub.plan.name} plan ends on ${longDate(sub.endDate!)}`,
      "Contact us from Plan and billing if you would like to renew. Your listing stays on DialNFind either way.",
      { subscriptionId: Number(sub.id) },
      { label: "Renew your plan", url: `${env.providerUrl}/subscription` },
    );
  }
  return `${due.length} reminded`;
}
