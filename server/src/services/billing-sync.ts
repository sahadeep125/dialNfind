import type { BillingCycle, ProviderSubscription, SubscriptionSource } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { planCodeForEntitlements, type PlanCode } from "../lib/plans.js";
import { applySubscriptionChange, graceEnd, liveSubscription, LIVE_STATUSES } from "./entitlements.js";
import { issueInvoice } from "./invoices.js";
import { fromUnix, razorpay, razorpayConfigured, type RazorpayPayment, type RazorpaySubscription } from "./razorpay.js";
import { activeEntitlements, appUserIdFor, fetchSubscriber, revenuecatConfigured } from "./revenuecat.js";

/** The plan and billing cycle behind a Razorpay plan id or store product id. */
async function priceFor(where: { razorpayPlanId: string } | { iosProductId: string } | { androidProductId: string }) {
  return prisma.planPrice.findFirst({ where, include: { plan: { select: { code: true } } } });
}

const cycleFromProductId = (id: string): BillingCycle => (/year|annual/i.test(id) ? "yearly" : "monthly");

// Razorpay ---------------------------------------------------------------------------------------

/**
 * Brings our record of a Razorpay subscription in line with Razorpay's, and records the payment
 * (with its invoice) when one came with the event.
 */
export async function syncRazorpaySubscription(rzp: RazorpaySubscription, payment?: RazorpayPayment | null) {
  const existing = await prisma.providerSubscription.findFirst({
    where: { source: "razorpay", externalId: rzp.id },
    include: { plan: { select: { code: true } } },
    orderBy: { startDate: "desc" },
  });
  const notes = Array.isArray(rzp.notes) ? {} : rzp.notes;
  const providerId = existing?.providerId ?? (notes.providerId ? BigInt(notes.providerId) : null);
  if (!providerId) throw new Error(`Razorpay subscription ${rzp.id} does not belong to a provider`);
  const price = await priceFor({ razorpayPlanId: rzp.plan_id });
  const planCode = (price?.plan.code ?? existing?.plan.code ?? "free") as PlanCode;
  const billingCycle = price?.billingCycle ?? existing?.billingCycle ?? "monthly";
  const periodEnd = fromUnix(rzp.current_end) ?? existing?.endDate ?? null;
  const base = { providerId, billingCycle, source: "razorpay" as const, externalId: rzp.id, periodEnd };

  let subscription: ProviderSubscription | null;
  switch (rzp.status) {
    case "created":
    case "authenticated":
      // Mandate set up, first charge not in yet.
      subscription = existing;
      break;
    case "active":
      subscription = await applySubscriptionChange({
        ...base,
        planCode,
        status: "active",
        autoRenew: existing?.autoRenew ?? true,
        quiet: existing?.status === "active",
      });
      break;
    case "pending":
      // A renewal failed; Razorpay retries it for a few days. The plan keeps working meanwhile.
      subscription = await applySubscriptionChange({
        ...base,
        planCode,
        status: "past_due",
        autoRenew: existing?.autoRenew ?? true,
        graceUntil: existing?.graceUntil ?? graceEnd(),
        quiet: true,
      });
      break;
    default:
      // halted (retries exhausted), cancelled, completed, expired, paused: back to Free.
      subscription = existing && LIVE_STATUSES.includes(existing.status)
        ? await applySubscriptionChange({ ...base, planCode: "free", status: rzp.status === "cancelled" ? "cancelled" : "expired", autoRenew: false })
        : existing;
  }

  if (payment && payment.status === "captured") {
    await recordGatewayPayment({
      providerId,
      subscriptionId: subscription?.id ?? existing?.id ?? null,
      gateway: "razorpay",
      paymentId: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      reference: rzp.id,
    });
  }
  return subscription;
}

/** Records a payment from a gateway once (the payment id is unique) and invoices it when we are the seller. */
export async function recordGatewayPayment(input: {
  providerId: bigint;
  subscriptionId: bigint | null;
  gateway: "razorpay" | "app_store" | "play_store";
  paymentId: string;
  amount: number;
  currency: string;
  reference?: string | null;
  note?: string | null;
  /** What was paid for; plans unless said otherwise. */
  type?: "subscription" | "sponsored_ad";
}) {
  const existing = await prisma.transaction.findUnique({ where: { gatewayPaymentId: input.paymentId } });
  if (existing) return existing;
  const txn = await prisma.transaction.create({
    data: {
      providerId: input.providerId,
      subscriptionId: input.subscriptionId,
      type: input.type ?? "subscription",
      gateway: input.gateway,
      amount: input.amount,
      currency: input.currency,
      status: "success",
      gatewayPaymentId: input.paymentId,
      gatewayTxnId: input.reference ?? input.paymentId,
      note: input.note ?? null,
    },
  });
  if (input.gateway === "razorpay") await issueInvoice(txn.id);
  return txn;
}

// RevenueCat -------------------------------------------------------------------------------------

/**
 * Reads the provider's store subscriptions from RevenueCat and applies them. Store subscriptions
 * never override one bought on the web or granted by the team while that one is live.
 */
export async function syncRevenueCatProvider(providerId: bigint) {
  const appUserId = appUserIdFor(providerId);
  const subscriber = await fetchSubscriber(appUserId);
  const active = activeEntitlements(subscriber);
  const planCode = planCodeForEntitlements(active.map((e) => e.id));
  const live = await liveSubscription(providerId);
  const storeOwned = !live || live.source === "app_store" || live.source === "play_store";

  if (planCode === "free") {
    if (live && storeOwned) {
      return applySubscriptionChange({
        providerId,
        planCode: "free",
        billingCycle: live.billingCycle,
        source: live.source,
        externalId: live.externalId,
        status: "expired",
        periodEnd: live.endDate,
        autoRenew: false,
      });
    }
    return live;
  }
  if (!storeOwned) {
    console.warn(`[billing] provider ${providerId} has a store subscription while a ${live!.source} plan is live; keeping the ${live!.source} plan`);
    return live;
  }

  const top = active.find((e) => e.id === (planCode === "business" ? "provider_business" : "provider_pro"))!;
  const storeSub = subscriber.subscriptions[top.product_identifier];
  const source: SubscriptionSource = storeSub?.store === "play_store" ? "play_store" : "app_store";
  const price = await priceFor(source === "play_store" ? { androidProductId: top.product_identifier } : { iosProductId: top.product_identifier });
  const inGrace = !!storeSub?.billing_issues_detected_at;
  return applySubscriptionChange({
    providerId,
    planCode,
    billingCycle: price?.billingCycle ?? cycleFromProductId(top.product_identifier),
    source,
    externalId: appUserId,
    status: inGrace ? "past_due" : "active",
    periodEnd: top.expires_date ? new Date(top.expires_date) : null,
    autoRenew: !storeSub?.unsubscribe_detected_at,
    graceUntil: inGrace ? new Date(storeSub?.grace_period_expires_date ?? top.expires_date ?? Date.now()) : null,
    quiet: live?.plan.code === planCode,
  });
}

// Reconcile --------------------------------------------------------------------------------------

/**
 * Before a paid plan is expired, asks the gateway whether it actually renewed. Returns true when
 * the subscription is still live afterwards.
 */
export async function reconcileSubscription(sub: ProviderSubscription): Promise<boolean> {
  try {
    if (sub.source === "razorpay" && sub.externalId && razorpayConfigured()) {
      await syncRazorpaySubscription(await razorpay.fetchSubscription(sub.externalId));
    } else if ((sub.source === "app_store" || sub.source === "play_store") && revenuecatConfigured()) {
      await syncRevenueCatProvider(sub.providerId);
    } else {
      return false;
    }
  } catch (err) {
    console.error(`[billing] could not check subscription ${sub.id} with ${sub.source}`, err);
    // Give a gateway outage a day before taking the plan away.
    return !!sub.endDate && Date.now() - sub.endDate.getTime() < 24 * 60 * 60 * 1000;
  }
  const after = await prisma.providerSubscription.findUnique({ where: { id: sub.id } });
  return !!after && LIVE_STATUSES.includes(after.status) && (!after.endDate || after.endDate > new Date() || (!!after.graceUntil && after.graceUntil > new Date()));
}
