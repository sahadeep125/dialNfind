import { prisma } from "../lib/prisma.js";
import { env } from "../env.js";
import { notifyAndEmail } from "../services/notify.js";
import { applySubscriptionChange } from "../services/entitlements.js";
import { reconcileSubscription } from "../services/billing-sync.js";

const longDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: env.timezone });
const HOUR = 60 * 60 * 1000;

/**
 * Plans whose paid period (or grace period after a failed payment) is over drop to Free. Paid
 * subscriptions are checked with Razorpay or RevenueCat first, in case a renewal webhook was missed.
 */
export async function expireSubscriptions(): Promise<string> {
  const now = new Date();
  const due = await prisma.providerSubscription.findMany({
    where: {
      OR: [
        { status: "active", endDate: { lt: now } },
        { status: "past_due", OR: [{ graceUntil: { lt: now } }, { graceUntil: null, endDate: { lt: now } }] },
      ],
    },
    include: { plan: { select: { code: true } } },
  });
  let expired = 0;
  for (const sub of due) {
    if (sub.source !== "admin" && (await reconcileSubscription(sub))) continue;
    await applySubscriptionChange({
      providerId: sub.providerId,
      planCode: "free",
      billingCycle: sub.billingCycle,
      source: sub.source,
      externalId: sub.externalId,
      status: "expired",
      periodEnd: sub.endDate,
      autoRenew: false,
    });
    expired++;
  }
  // Checkouts nobody finished within a day are dropped.
  const abandoned = await prisma.providerSubscription.updateMany({
    where: { status: "pending", createdAt: { lt: new Date(now.getTime() - 24 * HOUR) } },
    data: { status: "cancelled", cancelledAt: now },
  });
  return `${expired} expired, ${abandoned.count} abandoned checkouts closed`;
}

/**
 * Three days before a plan that will not renew ends, the provider is reminded. Plans that renew
 * automatically are charged without a reminder.
 */
export async function remindExpiringSubscriptions(): Promise<string> {
  const from = new Date(Date.now() + 2 * 24 * HOUR);
  const to = new Date(Date.now() + 3 * 24 * HOUR);
  const due = await prisma.providerSubscription.findMany({
    where: { status: "active", autoRenew: false, endDate: { gte: from, lt: to } },
    include: { plan: { select: { name: true } }, provider: { select: { userId: true } } },
  });
  for (const sub of due) {
    await notifyAndEmail(
      sub.provider.userId,
      "subscription",
      `Your ${sub.plan.name} plan ends on ${longDate(sub.endDate!)}`,
      "Renew from Plan and billing to keep unlimited leads and analytics. Your listing stays on DialNFind either way.",
      { subscriptionId: Number(sub.id) },
      { label: "Renew your plan", url: `${env.providerUrl}/subscription` },
    );
  }
  return `${due.length} reminded`;
}
