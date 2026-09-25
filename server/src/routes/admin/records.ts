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
import { notify } from "../../services/notify.js";
import { recalculateProvider } from "../../services/ranking.js";
import { issueInvoice, presentInvoice } from "../../services/invoices.js";
import { razorpay } from "../../services/razorpay.js";
import { rcCustomerUrl } from "../../services/revenuecat.js";

/** Where the admin team can look a subscription up at the payment provider. */
export function externalSubscriptionUrl(s: { source: string; externalId: string | null }) {
  if (!s.externalId) return null;
  if (s.source === "razorpay") return `https://dashboard.razorpay.com/app/subscriptions/${s.externalId}`;
  if (s.source === "app_store" || s.source === "play_store") return rcCustomerUrl(s.externalId);
  return null;
}

/** Leads, reviews, payments and subscriptions: the lists, their actions, and the filters the CSV export reuses. */
export const adminRecordsRouter = Router();

const DAY = 24 * 60 * 60 * 1000;

// Leads ------------------------------------------------------------------------------------------

export const leadsQuery = paginationSchema.extend({
  channel: z.enum(["call", "whatsapp"]).optional(),
  providerId: z.coerce.number().int().positive().optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  dispute: z.enum(["open", "accepted", "rejected", "any"]).optional(),
});

export function leadWhere(q: z.infer<typeof leadsQuery>): Prisma.LeadWhereInput {
  return {
    ...(q.channel ? { channel: q.channel } : {}),
    ...(q.providerId ? { providerId: BigInt(q.providerId) } : {}),
    ...(q.days ? { createdAt: { gte: new Date(Date.now() - q.days * DAY) } } : {}),
    ...(q.dispute === "any" ? { disputeStatus: { not: "none" } } : q.dispute ? { disputeStatus: q.dispute } : {}),
  };
}

adminRecordsRouter.get("/leads", async (req, res) => {
  const q = parse(leadsQuery, req.query);
  const where = leadWhere(q);
  const [leads, total, openDisputes] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: q.dispute === "open" ? { disputedAt: "asc" } : { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, businessName: true, city: true } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
      },
    }),
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { disputeStatus: "open" } }),
  ]);
  res.json({ leads, openDisputes, ...pageMeta(q.page, q.pageSize, total) });
});

/**
 * PATCH /admin/leads/:id/dispute — decides a provider's report about a contact. Accepting removes it
 * from the provider's numbers and gives back what it cost their promotion.
 */
adminRecordsRouter.patch("/leads/:id/dispute", async (req, res) => {
  const { decision, note } = parse(z.object({ decision: z.enum(["accepted", "rejected"]), note: z.string().trim().max(500).optional() }), req.body);
  const lead = await prisma.lead.findUnique({ where: { id: idParam(req.params.id as string) }, include: { provider: { select: { userId: true, businessName: true } } } });
  if (!lead) throw notFound("Lead not found");
  if (lead.disputeStatus !== "open") throw badRequest("This report was already decided");
  const admin = currentUser(req);
  const refund = decision === "accepted" && lead.sponsoredListingId && lead.sponsoredCharge ? num(lead.sponsoredCharge)! : 0;
  await prisma.$transaction([
    prisma.lead.update({ where: { id: lead.id }, data: { disputeStatus: decision, disputeResolvedBy: admin.id, disputeResolvedAt: new Date() } }),
    ...(refund
      ? [
          prisma.sponsoredListing.update({
            where: { id: lead.sponsoredListingId! },
            data: { amountSpent: { decrement: refund }, clicks: { decrement: 1 } },
          }),
        ]
      : []),
  ]);
  if (refund) {
    // A campaign that ended only because its budget ran out can run again with the refund.
    await prisma.sponsoredListing.updateMany({
      where: { id: lead.sponsoredListingId!, status: "completed", endDate: { gte: new Date() } },
      data: { status: "active" },
    });
  }
  await logAdmin(admin.id, `lead.dispute_${decision}`, "lead", lead.id, { note, refund });
  void notify(
    lead.provider.userId,
    "lead",
    decision === "accepted" ? "Your report about a contact was accepted" : "Your report about a contact was not accepted",
    decision === "accepted"
      ? `It no longer counts in your numbers${refund ? ` and Rs ${refund} went back to your promotion budget` : ""}.`
      : note || "We checked the contact and it looks genuine.",
    { leadId: Number(lead.id) },
  );
  res.json({ ok: true, refund });
});

// Reviews ----------------------------------------------------------------------------------------

export const reviewsQuery = paginationSchema.extend({
  status: z.enum(["published", "flagged", "removed"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  q: z.string().trim().max(100).optional(),
});

export function reviewWhere(q: z.infer<typeof reviewsQuery>): Prisma.ReviewWhereInput {
  return {
    ...(q.status ? { status: q.status } : {}),
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.q ? { OR: [{ reviewText: { contains: q.q, mode: "insensitive" } }, { provider: { businessName: { contains: q.q, mode: "insensitive" } } }] } : {}),
  };
}

adminRecordsRouter.get("/reviews", async (req, res) => {
  const q = parse(reviewsQuery, req.query);
  const where = reviewWhere(q);
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, businessName: true, slug: true } },
        photos: { select: { photoUrl: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  const flags = await prisma.reportFlag.groupBy({ by: ["targetId"], where: { targetType: "review", status: "open", targetId: { in: reviews.map((r) => r.id) } }, _count: true });
  const flagMap = new Map(flags.map((f) => [f.targetId.toString(), f._count]));
  res.json({
    reviews: reviews.map((r) => ({ ...r, photos: r.photos.map((p) => p.photoUrl), openReports: flagMap.get(r.id.toString()) ?? 0 })),
    ...pageMeta(q.page, q.pageSize, total),
  });
});

const reviewStatus = z.enum(["published", "flagged", "removed"]);

/** Sets a review's status, closes its open reports and updates the provider's rating. */
async function moderateReview(adminId: bigint, id: bigint, status: z.infer<typeof reviewStatus>) {
  const review = await prisma.review.update({ where: { id }, data: { status } });
  await prisma.reportFlag.updateMany({ where: { targetType: "review", targetId: id, status: "open" }, data: { status: "resolved", resolvedBy: adminId } });
  await recalculateProvider(review.providerId);
  await logAdmin(adminId, "review.moderate", "review", id, { status });
  return review;
}

adminRecordsRouter.patch("/reviews/:id", async (req, res) => {
  const { status } = parse(z.object({ status: reviewStatus }), req.body);
  res.json({ review: await moderateReview(currentUser(req).id, idParam(req.params.id as string), status) });
});

adminRecordsRouter.post("/reviews/bulk", async (req, res) => {
  const body = parse(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), status: z.enum(["published", "removed"]) }), req.body);
  const adminId = currentUser(req).id;
  let updated = 0;
  for (const id of new Set(body.ids)) await moderateReview(adminId, BigInt(id), body.status).then(() => updated++, () => undefined);
  res.json({ updated });
});

// Payments ---------------------------------------------------------------------------------------

export const transactionsQuery = paginationSchema.extend({
  status: z.enum(["pending", "success", "failed", "refunded"]).optional(),
  type: z.enum(["subscription", "lead_fee", "sponsored_ad"]).optional(),
  gateway: z.enum(["manual", "razorpay", "app_store", "play_store"]).optional(),
  providerId: z.coerce.number().int().positive().optional(),
});

export function transactionWhere(q: z.infer<typeof transactionsQuery>): Prisma.TransactionWhereInput {
  return {
    ...(q.status ? { status: q.status } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...(q.gateway ? { gateway: q.gateway } : {}),
    ...(q.providerId ? { providerId: BigInt(q.providerId) } : {}),
  };
}

adminRecordsRouter.get("/transactions", async (req, res) => {
  const q = parse(transactionsQuery, req.query);
  const where = transactionWhere(q);
  const [transactions, total, sum] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        provider: { select: { id: true, businessName: true, slug: true } },
        invoice: true,
        subscription: { select: { id: true, billingCycle: true, plan: { select: { name: true } } } },
      },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({ where: { ...where, status: "success" }, _sum: { amount: true } }),
  ]);
  res.json({
    transactions: transactions.map(({ invoice, ...t }) => ({ ...t, invoice: invoice ? presentInvoice(invoice) : null })),
    revenue: sum._sum.amount ?? 0,
    ...pageMeta(q.page, q.pageSize, total),
  });
});

/** An offline payment (UPI, bank transfer, cash) received by the team. Also used by Grant plan and Create campaign. */
export const offlinePaymentSchema = z.object({
  amount: z.number().positive("Enter the amount received").max(10_000_000),
  reference: z.string().trim().min(3, "Enter the UPI or bank reference").max(80),
  note: z.string().trim().max(300).optional(),
});

/** Records a payment the team received and issues its GST invoice. */
export async function recordPayment(
  adminId: bigint,
  providerId: bigint,
  type: "subscription" | "sponsored_ad",
  payment: z.infer<typeof offlinePaymentSchema>,
  subscriptionId: bigint | null = null,
) {
  const transaction = await prisma.transaction.create({
    data: { providerId, subscriptionId, type, gateway: "manual", amount: payment.amount, status: "success", gatewayTxnId: payment.reference, note: payment.note ?? null },
  });
  await logAdmin(adminId, "transaction.create", "transaction", transaction.id, { providerId: Number(providerId), type, amount: payment.amount, reference: payment.reference });
  await issueInvoice(transaction.id);
  return transaction;
}

adminRecordsRouter.post("/transactions", async (req, res) => {
  const body = parse(offlinePaymentSchema.extend({ providerId: z.number().int().positive(), type: z.enum(["subscription", "sponsored_ad"]) }), req.body);
  const provider = await prisma.provider.findUnique({ where: { id: BigInt(body.providerId) }, select: { id: true } });
  if (!provider) throw notFound("Provider not found");
  const { providerId: _p, type, ...payment } = body;
  res.status(201).json({ transaction: await recordPayment(currentUser(req).id, provider.id, type, payment) });
});

/** PATCH /admin/transactions/:id — marks a payment refunded or failed; the reason is kept on the record. */
adminRecordsRouter.patch("/transactions/:id", async (req, res) => {
  const body = parse(z.object({ status: z.enum(["refunded", "failed"]), note: z.string().trim().min(3, "Say why").max(300) }), req.body);
  const id = idParam(req.params.id as string);
  const before = await prisma.transaction.findUnique({ where: { id }, include: { invoice: { select: { id: true } } } });
  if (!before) throw notFound("Payment not found");
  if (before.status !== "success") throw badRequest("Only successful payments can be refunded or marked failed");
  if (before.gateway === "app_store" || before.gateway === "play_store") throw badRequest("Store purchases are refunded by Apple or Google; the change arrives here automatically");
  // Razorpay payments are refunded through Razorpay; the refund webhook confirms it later too.
  if (body.status === "refunded" && before.gateway === "razorpay" && before.gatewayPaymentId) await razorpay.refund(before.gatewayPaymentId);
  const transaction = await prisma.transaction.update({ where: { id }, data: { status: body.status, note: body.note } });
  if (before.invoice) await prisma.invoice.update({ where: { id: before.invoice.id }, data: { status: "void" } });
  await logAdmin(currentUser(req).id, `transaction.${body.status}`, "transaction", id, { note: body.note, amount: num(before.amount) });
  res.json({ transaction });
});

// Subscriptions ----------------------------------------------------------------------------------

export const subscriptionsQuery = paginationSchema.extend({
  status: z.enum(["pending", "active", "past_due", "expired", "cancelled"]).optional(),
  planId: z.coerce.number().int().positive().optional(),
  source: z.enum(["admin", "razorpay", "app_store", "play_store"]).optional(),
});

export function subscriptionWhere(q: z.infer<typeof subscriptionsQuery>): Prisma.ProviderSubscriptionWhereInput {
  return {
    ...(q.status ? { status: q.status } : {}),
    ...(q.planId ? { planId: BigInt(q.planId) } : {}),
    ...(q.source ? { source: q.source } : {}),
  };
}

adminRecordsRouter.get("/subscriptions", async (req, res) => {
  const q = parse(subscriptionsQuery, req.query);
  const where = subscriptionWhere(q);
  const [subscriptions, total] = await Promise.all([
    prisma.providerSubscription.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        plan: { select: { id: true, code: true, name: true, price: true, billingCycle: true, prices: { select: { billingCycle: true, amount: true } } } },
        provider: { select: { id: true, businessName: true, city: true } },
      },
    }),
    prisma.providerSubscription.count({ where }),
  ]);
  res.json({
    subscriptions: subscriptions.map(({ plan: { prices, ...plan }, ...s }) => ({
      ...s,
      plan,
      amount: num(prices.find((p) => p.billingCycle === s.billingCycle)?.amount ?? plan.price),
      externalUrl: externalSubscriptionUrl(s),
    })),
    ...pageMeta(q.page, q.pageSize, total),
  });
});
