import { Prisma, type BillingCycle, type SubscriptionSource, type SubscriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../env.js";
import { upgradeRequired } from "../lib/errors.js";
import { entitlementsFor, FEATURES, GRACE_DAYS, type Entitlement, type Feature, type PlanCode } from "../lib/plans.js";
import { notifyAndEmail } from "./notify.js";
import { recalculateProvider } from "./ranking.js";

/** Statuses in which a subscription still unlocks its plan. */
export const LIVE_STATUSES: SubscriptionStatus[] = ["active", "past_due"];

type Db = Prisma.TransactionClient | typeof prisma;

/** The subscription currently giving the provider its plan, if any. */
export function liveSubscription(providerId: bigint, db: Db = prisma) {
  return db.providerSubscription.findFirst({
    where: { providerId, status: { in: LIVE_STATUSES } },
    include: { plan: true },
    orderBy: { startDate: "desc" },
  });
}

const freePlan = () => prisma.subscriptionPlan.findUnique({ where: { code: "free" } });

/** Leads this calendar month (platform timezone), not counting contacts the team accepted as spam. */
export async function leadsThisMonth(providerId: bigint): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM leads
    WHERE provider_id = ${providerId} AND dispute_status <> 'accepted'
      AND created_at AT TIME ZONE 'UTC' >= (date_trunc('month', now() AT TIME ZONE ${env.timezone}) AT TIME ZONE ${env.timezone})`;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Of the given leads, the ones past the plan's monthly limit. Each calendar month the first `limit`
 * leads show in full; later ones are locked until the provider upgrades.
 */
export async function lockedLeadIds(providerId: bigint, limit: number | null, ids: bigint[]): Promise<Set<bigint>> {
  if (limit === null || !ids.length) return new Set();
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM (
      SELECT id, row_number() OVER (
        PARTITION BY date_trunc('month', created_at AT TIME ZONE 'UTC' AT TIME ZONE ${env.timezone})
        ORDER BY created_at, id) AS n
      FROM leads WHERE provider_id = ${providerId} AND dispute_status <> 'accepted'
    ) ranked WHERE n > ${limit} AND id IN (${Prisma.join(ids)})`;
  return new Set(rows.map((r) => r.id));
}

export type PlanState = Awaited<ReturnType<typeof getPlanState>>;

/**
 * Everything the apps need to show the plan and gate features. A provider without a live
 * subscription is on Free.
 */
export async function getPlanState(providerId: bigint) {
  const [sub, free, leadsUsed, photosUsed] = await Promise.all([
    liveSubscription(providerId),
    freePlan(),
    leadsThisMonth(providerId),
    prisma.providerPortfolio.count({ where: { providerId } }),
  ]);
  const plan = sub?.plan ?? free;
  const code = (plan?.code ?? "free") as PlanCode;
  const entitlements = entitlementsFor(code);
  return {
    plan: { id: plan?.id ?? null, code, name: plan?.name ?? "Free" },
    entitlements,
    features: Object.fromEntries(Object.entries(FEATURES).map(([k, f]) => [k, entitlements.includes(f.entitlement)])) as Record<Feature, boolean>,
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          source: sub.source,
          billingCycle: sub.billingCycle,
          startDate: sub.startDate,
          endDate: sub.endDate,
          cancelAtPeriodEnd: !sub.autoRenew,
          graceUntil: sub.graceUntil,
        }
      : null,
    limits: {
      leads: { limit: plan?.leadAccessLimit ?? null, used: leadsUsed },
      photos: { limit: plan?.photoLimit ?? null, used: photosUsed },
    },
  };
}

export const hasEntitlement = (state: { entitlements: readonly string[] }, e: Entitlement) => state.entitlements.includes(e);

/** Throws 402 upgrade_required unless the provider's plan includes the feature. */
export async function assertFeature(providerId: bigint, feature: Feature): Promise<void> {
  const sub = await liveSubscription(providerId);
  const f = FEATURES[feature];
  if (entitlementsFor(sub?.plan.code).includes(f.entitlement)) return;
  const planName = f.entitlement === "provider_business" ? "Business" : "Pro";
  throw upgradeRequired(`${f.label} is part of the ${planName} plan. Upgrade to use it.`, f.entitlement, feature);
}

/** Plan limits and entitlements for one provider, without the usage counts. */
export async function planOf(providerId: bigint, db: Db = prisma) {
  const sub = await liveSubscription(providerId, db);
  const plan = sub?.plan ?? (await freePlan());
  return { plan, code: (plan?.code ?? "free") as PlanCode, entitlements: entitlementsFor(plan?.code) };
}

// Changing plans -------------------------------------------------------------------------------

export interface SubscriptionChange {
  providerId: bigint;
  planCode: PlanCode;
  billingCycle: BillingCycle;
  source: SubscriptionSource;
  /** Razorpay subscription id or store original transaction id. Same id = same subscription, updated in place. */
  externalId?: string | null;
  status: SubscriptionStatus;
  periodEnd: Date | null;
  autoRenew: boolean;
  graceUntil?: Date | null;
  /** Skip the "you are now on X" message, e.g. for a renewal of the same plan. */
  quiet?: boolean;
}

const longDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: env.timezone });

/**
 * The one place subscriptions are written, for admin grants, Razorpay and RevenueCat alike. Keeps
 * at most one live subscription per provider, hands out or takes back the plan's badge, and
 * refreshes the ranking boost.
 */
export async function applySubscriptionChange(change: SubscriptionChange) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: change.planCode } });
  if (!plan) throw new Error(`Unknown plan ${change.planCode}`);
  const now = new Date();
  const live = LIVE_STATUSES.includes(change.status);

  const { subscription, previous } = await prisma.$transaction(async (tx) => {
    const previous = await liveSubscription(change.providerId, tx);
    const existing = change.externalId
      ? await tx.providerSubscription.findFirst({ where: { source: change.source, externalId: change.externalId }, orderBy: { startDate: "desc" } })
      : null;

    // A free plan is the absence of a subscription.
    if (change.planCode === "free") {
      const target = existing ?? previous;
      const ended = target
        ? await tx.providerSubscription.update({
            where: { id: target.id },
            data: { status: change.status === "cancelled" ? "cancelled" : "expired", autoRenew: false, cancelledAt: now, endDate: change.periodEnd ?? now, graceUntil: null },
          })
        : null;
      return { subscription: ended, previous };
    }

    if (live) {
      await tx.providerSubscription.updateMany({
        where: { providerId: change.providerId, status: { in: LIVE_STATUSES }, ...(existing ? { id: { not: existing.id } } : {}) },
        data: { status: "cancelled", autoRenew: false, cancelledAt: now, endDate: now },
      });
    }
    const data = {
      planId: plan.id,
      source: change.source,
      billingCycle: change.billingCycle,
      status: change.status,
      endDate: change.periodEnd,
      autoRenew: change.autoRenew,
      graceUntil: change.graceUntil ?? null,
      cancelledAt: live ? null : now,
    };
    const subscription = existing
      ? await tx.providerSubscription.update({ where: { id: existing.id }, data })
      : await tx.providerSubscription.create({ data: { ...data, providerId: change.providerId, externalId: change.externalId ?? null, startDate: now } });
    return { subscription, previous };
  });

  const before = previous?.plan.code ?? "free";
  const after = (await liveSubscription(change.providerId))?.plan.code ?? "free";
  if (before !== after) await onPlanChanged(change.providerId, before, after, change.quiet ? null : change.periodEnd);
  return subscription;
}

/** Badge, ranking and a message when a provider moves between plans. */
async function onPlanChanged(providerId: bigint, before: string, after: string, periodEnd: Date | null) {
  const [plans, provider] = await Promise.all([
    prisma.subscriptionPlan.findMany({ where: { code: { in: [before, after] } }, select: { code: true, name: true, badgeId: true } }),
    prisma.provider.findUnique({ where: { id: providerId }, select: { userId: true } }),
  ]);
  const oldPlan = plans.find((p) => p.code === before);
  const newPlan = plans.find((p) => p.code === after);
  if (oldPlan?.badgeId && oldPlan.badgeId !== newPlan?.badgeId) {
    await prisma.providerBadge.deleteMany({ where: { providerId, badgeId: oldPlan.badgeId } });
  }
  if (newPlan?.badgeId) {
    await prisma.providerBadge.upsert({
      where: { providerId_badgeId: { providerId, badgeId: newPlan.badgeId } },
      create: { providerId, badgeId: newPlan.badgeId },
      update: {},
    });
  }
  await recalculateProvider(providerId);

  if (after === "free") {
    await notifyAndEmail(
      provider?.userId,
      "subscription",
      `Your ${oldPlan?.name ?? "paid"} plan has ended`,
      "You are on the Free plan now. Your listing stays on DialNFind; upgrade any time to get unlimited leads and analytics back.",
      { plan: after },
      { label: "See plans", url: `${env.providerUrl}/subscription` },
    );
  } else {
    await notifyAndEmail(
      provider?.userId,
      "subscription",
      `You are now on the ${newPlan?.name ?? after} plan`,
      periodEnd ? `Your plan is active until ${longDate(periodEnd)}.` : "Your plan is active.",
      { plan: after },
      { label: "See your plan", url: `${env.providerUrl}/subscription` },
    );
  }
}

/** Marks a failed renewal: the plan keeps working for GRACE_DAYS while the payment is retried. */
export function graceEnd(from = new Date()) {
  return new Date(from.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
}
