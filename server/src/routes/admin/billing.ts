import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { pageMeta, paginationSchema } from "../../lib/pagination.js";
import { num } from "../../lib/serialize.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { issueInvoice, presentInvoice } from "../../services/invoices.js";
import { razorpay, razorpayConfigured, toPaise } from "../../services/razorpay.js";
import { revenuecatConfigured } from "../../services/revenuecat.js";
import { LIVE_STATUSES } from "../../services/entitlements.js";
import { handleRazorpay, handleRevenueCat } from "../webhooks.js";

/** Billing for the admin team: revenue metrics, plan prices, invoices and the payment webhook log. */
export const adminBillingRouter = Router();

const DAY = 24 * 60 * 60 * 1000;

/** GET /admin/billing/overview — MRR, subscribers by plan and source, revenue and failures. */
adminBillingRouter.get("/billing/overview", async (_req, res) => {
  const since30 = new Date(Date.now() - 30 * DAY);
  const [live, prices, revenueByGateway, pastDue, pending, churned30, new30, failedWebhooks] = await Promise.all([
    prisma.providerSubscription.findMany({
      where: { status: { in: LIVE_STATUSES } },
      select: { source: true, billingCycle: true, planId: true, plan: { select: { code: true, name: true, price: true } } },
    }),
    prisma.planPrice.findMany({ select: { planId: true, billingCycle: true, amount: true } }),
    prisma.transaction.groupBy({ by: ["gateway"], where: { status: "success", createdAt: { gte: since30 } }, _sum: { amount: true }, _count: true }),
    prisma.providerSubscription.count({ where: { status: "past_due" } }),
    prisma.providerSubscription.count({ where: { status: "pending" } }),
    prisma.providerSubscription.count({ where: { status: { in: ["expired", "cancelled"] }, cancelledAt: { gte: since30 }, source: { not: "admin" } } }),
    prisma.providerSubscription.count({ where: { startDate: { gte: since30 }, status: { in: [...LIVE_STATUSES, "expired", "cancelled"] }, source: { not: "admin" } } }),
    prisma.webhookEvent.count({ where: { processedAt: null, createdAt: { gte: new Date(Date.now() - 7 * DAY) } } }),
  ]);
  const priceOf = (planId: bigint, cycle: string, fallback: unknown) =>
    num(prices.find((p) => p.planId === planId && p.billingCycle === cycle)?.amount ?? fallback) ?? 0;
  // Team-granted plans are not recurring revenue.
  const mrr = live
    .filter((s) => s.source !== "admin")
    .reduce((acc, s) => acc + (s.billingCycle === "yearly" ? priceOf(s.planId, "yearly", s.plan.price) / 12 : priceOf(s.planId, "monthly", s.plan.price)), 0);
  const count = <K extends string>(key: (s: (typeof live)[number]) => K) =>
    Object.entries(live.reduce<Record<string, number>>((acc, s) => ({ ...acc, [key(s)]: (acc[key(s)] ?? 0) + 1 }), {})).map(([label, value]) => ({ label, value }));
  res.json({
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    activeSubscriptions: live.length,
    paidSubscriptions: live.filter((s) => s.source !== "admin").length,
    byPlan: count((s) => s.plan.name),
    bySource: count((s) => s.source),
    pastDue,
    pendingCheckouts: pending,
    new30,
    churned30,
    revenue30: revenueByGateway.map((r) => ({ gateway: r.gateway, amount: num(r._sum.amount) ?? 0, count: r._count })),
    failedWebhooks7d: failedWebhooks,
    gateways: { razorpay: razorpayConfigured(), revenuecat: revenuecatConfigured() },
  });
});

// Plan prices -------------------------------------------------------------------------------------

const pricesSchema = z.object({
  prices: z
    .array(
      z.object({
        billingCycle: z.enum(["monthly", "yearly"]),
        amount: z.number().min(1).max(1_000_000),
        iosProductId: z.string().trim().max(100).nullable().optional(),
        androidProductId: z.string().trim().max(100).nullable().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .max(2),
});

/**
 * PUT /admin/plans/:id/prices — prices per billing cycle and the matching store products. Razorpay
 * plans cannot change price, so a new amount needs "Sync to Razorpay" again; current subscribers
 * keep the price they signed up at.
 */
adminBillingRouter.put("/plans/:id/prices", async (req, res) => {
  const planId = idParam(req.params.id as string);
  const { prices } = parse(pricesSchema, req.body);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId }, include: { prices: true } });
  if (!plan) throw notFound("Plan not found");
  if (plan.code === "free" && prices.length) throw badRequest("The Free plan has no price");
  await prisma.$transaction(async (tx) => {
    for (const p of prices) {
      const existing = plan.prices.find((e) => e.billingCycle === p.billingCycle);
      const data = {
        amount: p.amount,
        iosProductId: p.iosProductId || null,
        androidProductId: p.androidProductId || null,
        isActive: p.isActive,
        // A new amount needs a new Razorpay plan.
        ...(existing && num(existing.amount) !== p.amount ? { razorpayPlanId: null } : {}),
      };
      if (existing) await tx.planPrice.update({ where: { id: existing.id }, data });
      else await tx.planPrice.create({ data: { ...data, planId, billingCycle: p.billingCycle } });
    }
    const monthly = prices.find((p) => p.billingCycle === "monthly");
    if (monthly) await tx.subscriptionPlan.update({ where: { id: planId }, data: { price: monthly.amount } });
  });
  await logAdmin(currentUser(req).id, "plan.prices", "subscription_plan", planId, { prices });
  res.json({ prices: await prisma.planPrice.findMany({ where: { planId }, orderBy: { billingCycle: "asc" } }) });
});

/** POST /admin/plans/sync-razorpay — creates a Razorpay plan for every active price that has none. */
adminBillingRouter.post("/plans/sync-razorpay", async (req, res) => {
  if (!razorpayConfigured()) throw badRequest("Add the Razorpay keys to the server first");
  const missing = await prisma.planPrice.findMany({ where: { razorpayPlanId: null, isActive: true, plan: { isActive: true } }, include: { plan: true } });
  const created: { plan: string; billingCycle: string; razorpayPlanId: string }[] = [];
  for (const price of missing) {
    const rzp = await razorpay.createPlan({
      period: price.billingCycle,
      name: `DialNFind ${price.plan.name} (${price.billingCycle})`,
      amountPaise: toPaise(num(price.amount) ?? 0),
      notes: { planCode: price.plan.code, billingCycle: price.billingCycle },
    });
    await prisma.planPrice.update({ where: { id: price.id }, data: { razorpayPlanId: rzp.id } });
    created.push({ plan: price.plan.name, billingCycle: price.billingCycle, razorpayPlanId: rzp.id });
  }
  await logAdmin(currentUser(req).id, "plan.sync_razorpay", "subscription_plan", undefined, { created });
  res.json({ created });
});

// Invoices ----------------------------------------------------------------------------------------

export const invoicesQuery = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["issued", "void"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  providerId: z.coerce.number().int().positive().optional(),
});

export function invoiceWhere(q: z.infer<typeof invoicesQuery>): Prisma.InvoiceWhereInput {
  return {
    ...(q.status ? { status: q.status } : {}),
    ...(q.providerId ? { providerId: BigInt(q.providerId) } : {}),
    ...(q.from || q.to ? { issuedAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: new Date(q.to.getTime() + DAY) } : {}) } } : {}),
    ...(q.q
      ? { OR: [{ number: { contains: q.q, mode: "insensitive" } }, { provider: { businessName: { contains: q.q, mode: "insensitive" } } }] }
      : {}),
  };
}

adminBillingRouter.get("/invoices", async (req, res) => {
  const q = parse(invoicesQuery, req.query);
  const where = invoiceWhere(q);
  const [invoices, total, sums] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { provider: { select: { id: true, businessName: true } } },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({ where: { ...where, status: "issued" }, _sum: { total: true, taxable: true, cgst: true, sgst: true, igst: true } }),
  ]);
  res.json({
    invoices: invoices.map((i) => ({ ...presentInvoice(i), provider: i.provider, billedTo: i.billedTo, placeOfSupply: i.placeOfSupply })),
    totals: {
      total: num(sums._sum.total) ?? 0,
      taxable: num(sums._sum.taxable) ?? 0,
      tax: (num(sums._sum.cgst) ?? 0) + (num(sums._sum.sgst) ?? 0) + (num(sums._sum.igst) ?? 0),
    },
    ...pageMeta(q.page, q.pageSize, total),
  });
});

/** POST /admin/invoices/:id/void — cancels an invoice issued in error. The number is never reused. */
adminBillingRouter.post("/invoices/:id/void", async (req, res) => {
  const id = idParam(req.params.id as string);
  const { note } = parse(z.object({ note: z.string().trim().min(3, "Say why").max(300) }), req.body);
  const invoice = await prisma.invoice.update({ where: { id }, data: { status: "void" } });
  await logAdmin(currentUser(req).id, "invoice.void", "invoice", id, { number: invoice.number, note });
  res.json({ invoice: presentInvoice(invoice) });
});

/** POST /admin/transactions/:id/invoice — issues the invoice for a payment that has none (payments from before invoicing). */
adminBillingRouter.post("/transactions/:id/invoice", async (req, res) => {
  const id = idParam(req.params.id as string);
  const txn = await prisma.transaction.findUnique({ where: { id }, include: { invoice: true } });
  if (!txn) throw notFound("Payment not found");
  if (txn.invoice) throw badRequest("This payment already has an invoice");
  if (txn.status !== "success") throw badRequest("Only successful payments can be invoiced");
  if (txn.gateway === "app_store" || txn.gateway === "play_store") throw badRequest("Store purchases are invoiced by Apple or Google");
  const invoice = await issueInvoice(id);
  await logAdmin(currentUser(req).id, "invoice.issue", "transaction", id, { number: invoice?.number });
  res.status(201).json({ invoice: invoice && presentInvoice(invoice) });
});

// Webhook log -------------------------------------------------------------------------------------

const webhooksQuery = paginationSchema.extend({
  source: z.enum(["razorpay", "revenuecat"]).optional(),
  status: z.enum(["processed", "failed"]).optional(),
});

adminBillingRouter.get("/webhooks", async (req, res) => {
  const q = parse(webhooksQuery, req.query);
  const where: Prisma.WebhookEventWhereInput = {
    ...(q.source ? { source: q.source } : {}),
    ...(q.status === "processed" ? { processedAt: { not: null } } : q.status === "failed" ? { processedAt: null } : {}),
  };
  const [events, total] = await Promise.all([
    prisma.webhookEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    prisma.webhookEvent.count({ where }),
  ]);
  const providers = await prisma.provider.findMany({
    where: { id: { in: events.map((e) => e.providerId).filter((id): id is bigint => id !== null) } },
    select: { id: true, businessName: true },
  });
  res.json({
    events: events.map((e) => ({ ...e, provider: providers.find((p) => p.id === e.providerId) ?? null })),
    ...pageMeta(q.page, q.pageSize, total),
  });
});

/** POST /admin/webhooks/:id/reprocess — runs a stored event again, after fixing whatever made it fail. */
adminBillingRouter.post("/webhooks/:id/reprocess", async (req, res) => {
  const id = idParam(req.params.id as string);
  const event = await prisma.webhookEvent.findUnique({ where: { id } });
  if (!event) throw notFound("Event not found");
  try {
    const payload = event.payload as never as { event: unknown };
    const providerId =
      event.source === "razorpay" ? await handleRazorpay(payload as never) : await handleRevenueCat(payload.event as never);
    const updated = await prisma.webhookEvent.update({ where: { id }, data: { processedAt: new Date(), error: null, providerId } });
    await logAdmin(currentUser(req).id, "webhook.reprocess", "webhook_event", id, { ok: true });
    res.json({ event: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.webhookEvent.update({ where: { id }, data: { error: message.slice(0, 1000) } });
    throw badRequest(`Still failing: ${message}`);
  }
});
