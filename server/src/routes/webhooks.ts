import express, { Router, type Request, type Response } from "express";
import { Prisma, type WebhookSource } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../env.js";
import { verifyWebhookSignature, type RazorpayPayment, type RazorpaySubscription } from "../services/razorpay.js";
import { providerIdFromAppUserId, type RcWebhookEvent } from "../services/revenuecat.js";
import { recordGatewayPayment, syncRazorpaySubscription, syncRevenueCatProvider } from "../services/billing-sync.js";
import { liveSubscription } from "../services/entitlements.js";

/**
 * Payment webhooks. Mounted before the JSON body parser: Razorpay signs the raw bytes. Every event
 * is stored first, so a retry of an event already handled is acknowledged without doing it twice,
 * and a failed one answers 500 so the sender retries it.
 */
export const webhooksRouter = Router();
webhooksRouter.use(express.raw({ type: "*/*", limit: "1mb" }));

async function once(source: WebhookSource, eventId: string, type: string, payload: unknown, res: Response, handle: () => Promise<bigint | null | void>) {
  const key = { source_eventId: { source, eventId } };
  const seen = await prisma.webhookEvent.findUnique({ where: key });
  if (seen?.processedAt) {
    res.json({ ok: true, duplicate: true });
    return;
  }
  const event = seen ?? (await prisma.webhookEvent.create({ data: { source, eventId, type, payload: payload as Prisma.InputJsonValue } }));
  try {
    const providerId = await handle();
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: null, providerId: providerId ?? null } });
    res.json({ ok: true });
  } catch (err) {
    console.error(`[webhook] ${source} ${type} ${eventId} failed`, err);
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { error: err instanceof Error ? err.message.slice(0, 1000) : String(err) } });
    res.status(500).json({ ok: false });
  }
}

const parseJson = (req: Request): unknown => {
  try {
    return JSON.parse((req.body as Buffer).toString("utf8"));
  } catch {
    return null;
  }
};

// Razorpay --------------------------------------------------------------------------------------

interface RazorpayEvent {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscription };
    payment?: { entity: RazorpayPayment };
    refund?: { entity: { id: string; payment_id: string; amount: number } };
  };
}

webhooksRouter.post("/razorpay", async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, req.get("x-razorpay-signature"))) {
    res.status(401).json({ ok: false });
    return;
  }
  const body = parseJson(req) as RazorpayEvent | null;
  if (!body) {
    res.status(400).json({ ok: false });
    return;
  }
  const eventId = req.get("x-razorpay-event-id") ?? `${body.event}:${body.payload.subscription?.entity.id ?? body.payload.payment?.entity.id ?? Date.now()}`;
  await once("razorpay", eventId, body.event, body, res, () => handleRazorpay(body));
});

export async function handleRazorpay(body: RazorpayEvent): Promise<bigint | null> {
  const sub = body.payload.subscription?.entity;
  if (body.event.startsWith("subscription.") && sub) {
    const payment = body.event === "subscription.charged" || body.event === "subscription.activated" ? body.payload.payment?.entity : null;
    const saved = await syncRazorpaySubscription(sub, payment);
    return saved?.providerId ?? null;
  }
  const refund = body.payload.refund?.entity;
  if (body.event === "refund.processed" && refund) {
    const txn = await prisma.transaction.findUnique({ where: { gatewayPaymentId: refund.payment_id }, include: { invoice: true } });
    if (!txn) return null;
    const full = refund.amount >= Math.round(Number(txn.amount) * 100);
    await prisma.transaction.update({
      where: { id: txn.id },
      data: full ? { status: "refunded", note: `Refunded (${refund.id})` } : { note: `Partly refunded: Rs ${(refund.amount / 100).toFixed(2)} (${refund.id})` },
    });
    if (full && txn.invoice) await prisma.invoice.update({ where: { id: txn.invoice.id }, data: { status: "void" } });
    return txn.providerId;
  }
  // Other events (payment.failed and so on) are covered by the subscription events.
  return null;
}

// RevenueCat ------------------------------------------------------------------------------------

const STORE_GATEWAY: Record<string, "app_store" | "play_store"> = { APP_STORE: "app_store", MAC_APP_STORE: "app_store", PLAY_STORE: "play_store" };
const PAID_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"]);

webhooksRouter.post("/revenuecat", async (req, res) => {
  if (!env.revenuecat.webhookAuth || req.get("authorization") !== env.revenuecat.webhookAuth) {
    res.status(401).json({ ok: false });
    return;
  }
  const body = parseJson(req) as { event?: RcWebhookEvent } | null;
  const event = body?.event;
  if (!event?.id) {
    res.status(400).json({ ok: false });
    return;
  }
  await once("revenuecat", event.id, event.type, body, res, () => handleRevenueCat(event));
});

export async function handleRevenueCat(event: RcWebhookEvent): Promise<bigint | null> {
  if (event.type === "TEST") return null;
  const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_to ?? []), ...(event.transferred_from ?? [])];
  const providerIds = [...new Set(ids.map(providerIdFromAppUserId).filter((id): id is bigint => id !== null))];
  if (!providerIds.length) throw new Error(`No provider for app user ${event.app_user_id}`);
  const existing = await prisma.provider.findMany({ where: { id: { in: providerIds } }, select: { id: true } });
  for (const p of existing) await syncRevenueCatProvider(p.id);

  const providerId = providerIdFromAppUserId(event.app_user_id) ?? existing[0]?.id ?? null;
  const gateway = STORE_GATEWAY[event.store ?? ""];
  if (providerId && gateway && PAID_EVENTS.has(event.type) && event.transaction_id && (event.price_in_purchased_currency ?? 0) > 0) {
    const live = await liveSubscription(providerId);
    await recordGatewayPayment({
      providerId,
      subscriptionId: live && live.source === gateway ? live.id : null,
      gateway,
      paymentId: `${gateway}:${event.transaction_id}`,
      amount: event.price_in_purchased_currency!,
      currency: event.currency ?? "INR",
      reference: event.product_id ?? null,
      note: event.environment === "SANDBOX" ? "Sandbox purchase" : null,
    });
  }
  if (event.type === "CANCELLATION" && (event as { cancel_reason?: string }).cancel_reason === "CUSTOMER_SUPPORT" && gateway && event.transaction_id) {
    await prisma.transaction.updateMany({ where: { gatewayPaymentId: `${gateway}:${event.transaction_id}` }, data: { status: "refunded", note: "Refunded by the store" } });
  }
  return providerId;
}
