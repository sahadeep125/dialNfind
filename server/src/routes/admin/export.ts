import { Router, type Response } from "express";
import type { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { csvLine } from "../../lib/csv.js";
import { num } from "../../lib/serialize.js";
import type { AdminModule } from "../../lib/permissions.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { providerQuery, providerWhere } from "./providers.js";
import { usersQuery, userWhere } from "./users.js";
import { invoicesQuery, invoiceWhere } from "./billing.js";
import { leadsQuery, leadWhere, reviewsQuery, reviewWhere, subscriptionsQuery, subscriptionWhere, transactionsQuery, transactionWhere } from "./records.js";

/** CSV downloads of the admin lists, with the same filters as the list pages. */
export const adminExportRouter = Router();

const BATCH = 1000;
const MAX_ROWS = 50_000;
const date = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

interface Exporter<Q extends z.ZodTypeAny> {
  module: AdminModule;
  query: Q;
  header: string[];
  /** One batch of rows after the given id, oldest first, as CSV values. */
  batch: (q: z.infer<Q>, afterId: bigint, take: number) => Promise<{ id: bigint; values: unknown[] }[]>;
}

const exporter = <Q extends z.ZodTypeAny>(e: Exporter<Q>) => e;

const EXPORTS = {
  providers: exporter({
    module: "providers",
    query: providerQuery,
    header: ["id", "business_name", "phone", "email", "city", "locality", "state", "status", "verification", "claimed_by", "rating", "reviews", "completeness_pct", "created"],
    batch: async (q, afterId, take) =>
      (
        await prisma.provider.findMany({
          where: { AND: [providerWhere(q), { id: { gt: afterId } }] },
          orderBy: { id: "asc" },
          take,
          include: { user: { select: { email: true } } },
        })
      ).map((p) => ({
        id: p.id,
        values: [p.id, p.businessName, p.phone, p.email, p.city, p.locality, p.state, p.status, p.verificationStatus, p.user?.email, num(p.avgRating), p.totalReviews, p.profileCompletenessPct, date(p.createdAt)],
      })),
  }),
  users: exporter({
    module: "users",
    query: usersQuery,
    header: ["id", "name", "email", "phone", "role", "status", "email_confirmed", "business", "created", "last_sign_in"],
    batch: async (q, afterId, take) =>
      (
        await prisma.user.findMany({
          where: { AND: [userWhere(q), { id: { gt: afterId } }] },
          orderBy: { id: "asc" },
          take,
          include: { provider: { select: { businessName: true } } },
        })
      ).map((u) => ({ id: u.id, values: [u.id, u.name, u.email, u.phone, u.role, u.status, u.emailVerifiedAt ? "yes" : "no", u.provider?.businessName, date(u.createdAt), date(u.lastLoginAt)] })),
  }),
  leads: exporter({
    module: "leads",
    query: leadsQuery,
    header: ["id", "date", "channel", "source", "provider", "provider_city", "service", "customer", "customer_email", "responded", "dispute"],
    batch: async (q, afterId, take) =>
      (
        await prisma.lead.findMany({
          where: { AND: [leadWhere(q), { id: { gt: afterId } }] },
          orderBy: { id: "asc" },
          take,
          include: { user: { select: { name: true, email: true } }, provider: { select: { businessName: true, city: true } }, category: { select: { name: true } }, subcategory: { select: { name: true } } },
        })
      ).map((l) => ({
        id: l.id,
        values: [
          l.id,
          l.createdAt,
          l.channel,
          l.source,
          l.provider.businessName,
          l.provider.city,
          l.subcategory?.name ?? l.category?.name,
          l.user?.name ?? "Guest",
          l.user?.email,
          l.customerReportedResponse === null ? "" : l.customerReportedResponse ? "yes" : "no",
          l.disputeStatus === "none" ? "" : l.disputeStatus,
        ],
      })),
  }),
  reviews: exporter({
    module: "reviews",
    query: reviewsQuery,
    header: ["id", "date", "provider", "customer", "rating", "status", "review"],
    batch: async (q, afterId, take) =>
      (
        await prisma.review.findMany({
          where: { AND: [reviewWhere(q), { id: { gt: afterId } }] },
          orderBy: { id: "asc" },
          take,
          include: { user: { select: { name: true } }, provider: { select: { businessName: true } } },
        })
      ).map((r) => ({ id: r.id, values: [r.id, date(r.createdAt), r.provider.businessName, r.user.name, r.rating, r.status, r.reviewText] })),
  }),
  transactions: exporter({
    module: "plans",
    query: transactionsQuery,
    header: ["id", "date", "provider", "type", "gateway", "amount", "currency", "status", "reference", "invoice", "note"],
    batch: async (q, afterId, take) =>
      (
        await prisma.transaction.findMany({
          where: { AND: [transactionWhere(q), { id: { gt: afterId } }] },
          orderBy: { id: "asc" },
          take,
          include: { provider: { select: { businessName: true } }, invoice: { select: { number: true } } },
        })
      ).map((t) => ({
        id: t.id,
        values: [t.id, t.createdAt, t.provider.businessName, t.type, t.gateway, num(t.amount), t.currency, t.status, t.gatewayTxnId, t.invoice?.number, t.note],
      })),
  }),
  subscriptions: exporter({
    module: "plans",
    query: subscriptionsQuery,
    header: ["id", "provider", "city", "plan", "source", "cycle", "status", "auto_renew", "start", "end", "external_id"],
    batch: async (q, afterId, take) =>
      (
        await prisma.providerSubscription.findMany({
          where: { AND: [subscriptionWhere(q), { id: { gt: afterId } }] },
          orderBy: { id: "asc" },
          take,
          include: { plan: { select: { name: true, price: true } }, provider: { select: { businessName: true, city: true } } },
        })
      ).map((s) => ({
        id: s.id,
        values: [s.id, s.provider.businessName, s.provider.city, s.plan.name, s.source, s.billingCycle, s.status, s.autoRenew, date(s.startDate), date(s.endDate), s.externalId],
      })),
  }),
  invoices: exporter({
    module: "plans",
    query: invoicesQuery,
    header: ["number", "date", "provider", "billed_to", "gstin", "place_of_supply", "taxable", "cgst", "sgst", "igst", "total", "status"],
    batch: async (q, afterId, take) =>
      (
        await prisma.invoice.findMany({
          where: { AND: [invoiceWhere(q), { id: { gt: afterId } }] },
          orderBy: { id: "asc" },
          take,
          include: { provider: { select: { businessName: true } } },
        })
      ).map((i) => {
        const to = i.billedTo as { name?: string; gstin?: string | null };
        return {
          id: i.id,
          values: [i.number, date(i.issuedAt), i.provider.businessName, to.name, to.gstin, i.placeOfSupply, num(i.taxable), num(i.cgst), num(i.sgst), num(i.igst), num(i.total), i.status],
        };
      }),
  }),
};

async function stream(res: Response, e: Exporter<z.ZodTypeAny>, q: unknown): Promise<number> {
  res.write("﻿" + csvLine(e.header)); // BOM so Excel opens UTF-8 names correctly
  let afterId = 0n;
  let written = 0;
  while (written < MAX_ROWS) {
    const rows = await e.batch(q, afterId, Math.min(BATCH, MAX_ROWS - written));
    for (const r of rows) res.write(csvLine(r.values));
    written += rows.length;
    if (rows.length < BATCH) break;
    afterId = rows[rows.length - 1].id;
  }
  return written;
}

/** GET /admin/export/:entity?<list filters> — streams a CSV (up to 50,000 rows). Needs the same section as the list. */
adminExportRouter.get("/export/:entity", async (req, res) => {
  const entity = req.params.entity as keyof typeof EXPORTS;
  const e = EXPORTS[entity] as unknown as Exporter<z.ZodTypeAny> | undefined;
  if (!e) throw notFound("Unknown export");
  if (!req.permissions?.has(e.module)) throw forbidden("Your role does not include this section");
  const q = parse(e.query, req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="dialnfind-${entity}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader("Cache-Control", "no-store");
  const rows = await stream(res, e, q);
  res.end();
  await logAdmin(currentUser(req).id, "export", entity, undefined, { rows, filters: req.query });
});
