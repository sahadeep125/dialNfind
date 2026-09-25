import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, HttpError, notConfigured, notFound } from "../../lib/errors.js";
import { limits } from "../../lib/rate-limit.js";
import { num } from "../../lib/serialize.js";
import { GSTIN_PATTERN, GST_STATE_CODES, stateCodeFor } from "../../lib/gst.js";
import { env } from "../../env.js";
import { currentUser } from "../../middleware/auth.js";
import { getPlanState, liveSubscription } from "../../services/entitlements.js";
import { presentInvoice, renderInvoicePdf } from "../../services/invoices.js";
import { razorpay, razorpayConfigured, verifyCheckoutSignature } from "../../services/razorpay.js";
import { revenuecatConfigured } from "../../services/revenuecat.js";
import { syncRazorpaySubscription, syncRevenueCatProvider } from "../../services/billing-sync.js";
import { ownProvider } from "./common.js";

export const billingRouter = Router();

/** Where a store subscription is managed; the web cannot change it. */
export const STORE_MANAGE_URLS = {
  app_store: "https://apps.apple.com/account/subscriptions",
  play_store: "https://play.google.com/store/account/subscriptions?package=com.dialnfind.business",
} as const;

/** Paid plans on sale, with their prices per billing cycle. */
export async function plansForSale() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
    include: { badge: { select: { id: true, name: true } }, prices: { where: { isActive: true }, orderBy: { billingCycle: "asc" } } },
  });
  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    price: num(p.price),
    billingCycle: p.billingCycle,
    leadAccessLimit: p.leadAccessLimit,
    analyticsEnabled: p.analyticsEnabled,
    photoLimit: p.photoLimit,
    featuresJson: p.featuresJson,
    badge: p.badge,
    prices: p.prices.map((pr) => ({
      billingCycle: pr.billingCycle,
      amount: num(pr.amount),
      iosProductId: pr.iosProductId,
      androidProductId: pr.androidProductId,
      availableOnWeb: !!pr.razorpayPlanId,
    })),
  }));
}

/** GET /provider/billing — plan, plans on sale, payments, invoices and billing details. */
billingRouter.get("/billing", async (req, res) => {
  const provider = await ownProvider(req);
  const [state, plans, transactions, invoices] = await Promise.all([
    getPlanState(provider.id),
    plansForSale(),
    prisma.transaction.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" }, take: 30, include: { invoice: { select: { id: true, number: true } } } }),
    prisma.invoice.findMany({ where: { providerId: provider.id }, orderBy: { issuedAt: "desc" }, take: 30 }),
  ]);
  const source = state.subscription?.source;
  res.json({
    state,
    plans,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      gateway: t.gateway,
      amount: num(t.amount),
      currency: t.currency,
      status: t.status,
      gatewayTxnId: t.gatewayTxnId,
      invoiceNumber: t.invoice?.number ?? null,
      createdAt: t.createdAt,
    })),
    invoices: invoices.map(presentInvoice),
    billingProfile: {
      billingName: provider.billingName ?? provider.businessName,
      billingAddress: provider.billingAddress ?? ([provider.addressLine, provider.locality, provider.city, provider.pincode].filter(Boolean).join(", ") || null),
      billingStateCode: provider.billingStateCode ?? stateCodeFor(provider.state),
      gstin: provider.gstin,
    },
    web: { enabled: razorpayConfigured(), keyId: env.razorpay.keyId || null },
    store: { enabled: revenuecatConfigured() },
    /** Store subscriptions are managed in the store; everything else is managed here. */
    managedIn: source === "app_store" || source === "play_store" ? source : source === "razorpay" ? "web" : source === "admin" ? "support" : null,
    manageUrl: source === "app_store" || source === "play_store" ? STORE_MANAGE_URLS[source] : null,
  });
});

const profileSchema = z.object({
  billingName: z.string().trim().min(2).max(150),
  billingAddress: z.string().trim().min(5, "Enter the billing address").max(300),
  billingStateCode: z.string().refine((v) => Object.values(GST_STATE_CODES).includes(v), "Choose a state"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || GSTIN_PATTERN.test(v), "Enter a valid 15-character GSTIN, or leave it empty")
    .nullable()
    .optional(),
});

/** PUT /provider/billing/profile — who invoices are made out to. */
billingRouter.put("/billing/profile", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(profileSchema, req.body);
  if (body.gstin && body.gstin.slice(0, 2) !== body.billingStateCode) throw badRequest("The GSTIN does not match the chosen state", { gstin: ["The first two digits must be the state code"] });
  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data: { billingName: body.billingName, billingAddress: body.billingAddress, billingStateCode: body.billingStateCode, gstin: body.gstin || null },
    select: { billingName: true, billingAddress: true, billingStateCode: true, gstin: true },
  });
  res.json({ billingProfile: updated });
});

// Razorpay (web) ---------------------------------------------------------------------------------

const choiceSchema = z.object({ planCode: z.enum(["pro", "business"]), billingCycle: z.enum(["monthly", "yearly"]) });

async function webPrice(planCode: string, billingCycle: "monthly" | "yearly") {
  const price = await prisma.planPrice.findFirst({
    where: { billingCycle, isActive: true, plan: { code: planCode, isActive: true } },
    include: { plan: true },
  });
  if (!price) throw notFound("That plan is not available");
  if (!price.razorpayPlanId) throw notConfigured("This plan cannot be bought online yet. Please contact support.");
  return price;
}

/** Store and team-granted plans block buying on the web, so nobody pays twice. */
function assertCanBuyOnWeb(live: Awaited<ReturnType<typeof liveSubscription>>) {
  if (!live) return;
  if (live.source === "app_store") throw conflict("Your plan was bought in the App Store. Manage or cancel it there first.");
  if (live.source === "play_store") throw conflict("Your plan was bought on Google Play. Manage or cancel it there first.");
  if (live.source === "razorpay") throw conflict("You already have a plan. Use Change plan instead.");
}

/**
 * POST /provider/billing/razorpay/checkout — starts a Razorpay subscription. The web app opens
 * Razorpay Checkout with the returned id; the plan switches on once the first payment succeeds.
 */
billingRouter.post("/billing/razorpay/checkout", limits.billing, async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(choiceSchema, req.body);
  if (!razorpayConfigured()) throw notConfigured("Online payments are not set up yet. Please contact support.");
  const live = await liveSubscription(provider.id);
  if (live?.source !== "admin") assertCanBuyOnWeb(live);
  if (!(provider.billingStateCode ?? stateCodeFor(provider.state))) throw badRequest("Add your billing details first");
  const price = await webPrice(body.planCode, body.billingCycle);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id }, select: { name: true, email: true, phone: true } });

  const rzp = await razorpay.createSubscription({
    planId: price.razorpayPlanId!,
    // Razorpay needs an end; this is long enough to behave as "until cancelled".
    totalCount: body.billingCycle === "yearly" ? 10 : 120,
    notes: { providerId: String(provider.id), planCode: body.planCode, billingCycle: body.billingCycle },
  });
  await prisma.$transaction([
    prisma.providerSubscription.updateMany({ where: { providerId: provider.id, status: "pending" }, data: { status: "cancelled", cancelledAt: new Date() } }),
    prisma.providerSubscription.create({
      data: {
        providerId: provider.id,
        planId: price.planId,
        source: "razorpay",
        billingCycle: body.billingCycle,
        externalId: rzp.id,
        status: "pending",
        startDate: new Date(),
        autoRenew: true,
      },
    }),
  ]);
  res.status(201).json({
    subscriptionId: rzp.id,
    keyId: env.razorpay.keyId,
    name: "DialNFind",
    description: `${price.plan.name} plan, ${body.billingCycle}`,
    amount: num(price.amount),
    prefill: { name: user.name, email: user.email, contact: user.phone ?? undefined },
    notes: { providerId: String(provider.id) },
  });
});

const verifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/** POST /provider/billing/razorpay/verify — Checkout success. Switches the plan on without waiting for the webhook. */
billingRouter.post("/billing/razorpay/verify", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(verifySchema, req.body);
  if (!verifyCheckoutSignature(body.razorpay_payment_id, body.razorpay_subscription_id, body.razorpay_signature)) {
    throw badRequest("We could not confirm this payment. If you were charged, it will be applied within a few minutes.");
  }
  const ours = await prisma.providerSubscription.findFirst({ where: { source: "razorpay", externalId: body.razorpay_subscription_id, providerId: provider.id } });
  if (!ours) throw notFound("Subscription not found");
  const [rzp, payment] = await Promise.all([razorpay.fetchSubscription(body.razorpay_subscription_id), razorpay.fetchPayment(body.razorpay_payment_id)]);
  // Checkout can return before Razorpay marks the subscription active; the payment is proof enough.
  await syncRazorpaySubscription(rzp.status === "authenticated" && payment.status === "captured" ? { ...rzp, status: "active" } : rzp, payment);
  res.json({ state: await getPlanState(provider.id) });
});

/** POST /provider/billing/change-plan — switch plan or billing cycle on a web subscription. */
billingRouter.post("/billing/change-plan", limits.billing, async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(choiceSchema, req.body);
  const live = await liveSubscription(provider.id);
  if (!live || live.source !== "razorpay" || !live.externalId) throw badRequest("Only plans bought on the web can be changed here");
  if (live.plan.code === body.planCode && live.billingCycle === body.billingCycle) throw conflict("You are already on this plan");
  const price = await webPrice(body.planCode, body.billingCycle);
  let rzp;
  try {
    rzp = await razorpay.changePlan(live.externalId, price.razorpayPlanId!);
  } catch (err) {
    if (err instanceof HttpError && err.status === 502) {
      throw conflict("Your payment method cannot switch plans mid-cycle. Cancel the current plan and subscribe again when it ends, or contact support.");
    }
    throw err;
  }
  await syncRazorpaySubscription(rzp);
  res.json({ state: await getPlanState(provider.id) });
});

/** POST /provider/billing/cancel — stops renewal; the plan stays until the paid period ends. */
billingRouter.post("/billing/cancel", async (req, res) => {
  const provider = await ownProvider(req);
  const live = await liveSubscription(provider.id);
  if (!live) throw badRequest("You are on the Free plan");
  if (live.source === "app_store" || live.source === "play_store") {
    throw new HttpError(409, "This plan was bought in the app store. Cancel it from your store subscriptions.", "store_managed", { manageUrl: STORE_MANAGE_URLS[live.source] });
  }
  if (live.source === "admin") throw badRequest("This plan was set up by our team. Contact support to change it.");
  if (!live.autoRenew) throw conflict("Your plan is already set to end");
  await razorpay.cancelSubscription(live.externalId!, true);
  await prisma.providerSubscription.update({ where: { id: live.id }, data: { autoRenew: false } });
  res.json({ state: await getPlanState(provider.id) });
});

/** POST /provider/billing/resume — undoes a cancel before the period ends. */
billingRouter.post("/billing/resume", async (req, res) => {
  const provider = await ownProvider(req);
  const live = await liveSubscription(provider.id);
  if (!live || live.source !== "razorpay" || live.autoRenew) throw badRequest("There is nothing to resume");
  await razorpay.cancelScheduledChanges(live.externalId!);
  await prisma.providerSubscription.update({ where: { id: live.id }, data: { autoRenew: true } });
  res.json({ state: await getPlanState(provider.id) });
});

// RevenueCat (provider app) ------------------------------------------------------------------------

/** POST /provider/billing/revenuecat/sync — the app calls this after a purchase or restore. */
billingRouter.post("/billing/revenuecat/sync", limits.billing, async (req, res) => {
  const provider = await ownProvider(req);
  if (!revenuecatConfigured()) throw notConfigured("In-app purchases are not set up on the server yet");
  await syncRevenueCatProvider(provider.id);
  res.json({ state: await getPlanState(provider.id) });
});

// Invoices ---------------------------------------------------------------------------------------

/** GET /provider/invoices/:id/pdf — download with the session token (the web app); lists also carry signed links. */
billingRouter.get("/invoices/:id/pdf", async (req, res) => {
  const provider = await ownProvider(req);
  const invoice = await prisma.invoice.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!invoice || invoice.providerId !== provider.id) throw notFound("Invoice not found");
  const pdf = await renderInvoicePdf(invoice);
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.number.replace(/\//g, "-")}.pdf"`, "Cache-Control": "private, no-store" });
  res.send(pdf);
});
