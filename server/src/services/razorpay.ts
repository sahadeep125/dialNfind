import crypto from "node:crypto";
import { env } from "../env.js";
import { HttpError, notConfigured } from "../lib/errors.js";

/** Razorpay REST API (https://razorpay.com/docs/api/). Amounts are in paise; times in Unix seconds. */
const API = "https://api.razorpay.com/v1";

export const razorpayConfigured = () => !!(env.razorpay.keyId && env.razorpay.keySecret);

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired" | "paused";
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  charge_at: number | null;
  paid_count: number;
  short_url?: string;
  has_scheduled_changes?: boolean;
  notes: Record<string, string> | [];
}

export interface RazorpayPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  invoice_id?: string | null;
  email?: string;
  contact?: string;
}

export interface RazorpayPlan {
  id: string;
  period: string;
  interval: number;
  item: { name: string; amount: number; currency: string };
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!razorpayConfigured()) throw notConfigured("Online payments are not set up yet. Please contact support.");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { description?: string } } & T;
  if (!res.ok) {
    console.error(`[razorpay] ${method} ${path} failed (${res.status})`, data.error);
    throw new HttpError(502, data.error?.description ?? "The payment provider did not accept the request. Please try again.", "payment_gateway");
  }
  return data;
}

export const razorpay = {
  createPlan: (input: { period: "monthly" | "yearly"; name: string; amountPaise: number; notes?: Record<string, string> }) =>
    call<RazorpayPlan>("POST", "/plans", {
      period: input.period,
      interval: 1,
      item: { name: input.name, amount: input.amountPaise, currency: "INR" },
      notes: input.notes,
    }),
  createSubscription: (input: { planId: string; totalCount: number; notes: Record<string, string>; notifyEmail?: string; notifyPhone?: string }) =>
    call<RazorpaySubscription>("POST", "/subscriptions", {
      plan_id: input.planId,
      total_count: input.totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: input.notes,
      ...(input.notifyEmail || input.notifyPhone ? { notify_info: { notify_email: input.notifyEmail, notify_phone: input.notifyPhone } } : {}),
    }),
  fetchSubscription: (id: string) => call<RazorpaySubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`),
  /** atCycleEnd: keep the plan until the paid period ends, then stop. */
  cancelSubscription: (id: string, atCycleEnd: boolean) =>
    call<RazorpaySubscription>("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: atCycleEnd ? 1 : 0 }),
  /** Undo a cancel-at-cycle-end that has not happened yet. */
  cancelScheduledChanges: (id: string) => call<RazorpaySubscription>("POST", `/subscriptions/${encodeURIComponent(id)}/cancel_scheduled_changes`),
  /** Switch plan now. Only card mandates support this; UPI and e-mandates need a new subscription. */
  changePlan: (id: string, planId: string) =>
    call<RazorpaySubscription>("PATCH", `/subscriptions/${encodeURIComponent(id)}`, { plan_id: planId, schedule_change_at: "now", customer_notify: 1 }),
  fetchPayment: (id: string) => call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(id)}`),
  refund: (paymentId: string, amountPaise?: number) =>
    call<{ id: string; amount: number; status: string }>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, amountPaise ? { amount: amountPaise } : {}),
};

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmac = (secret: string, payload: string | Buffer) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

/** Checkout success handler signature: HMAC(payment_id|subscription_id) with the key secret. */
export function verifyCheckoutSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
  return !!env.razorpay.keySecret && safeEqual(hmac(env.razorpay.keySecret, `${paymentId}|${subscriptionId}`), signature);
}

/** X-Razorpay-Signature: HMAC of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  return !!env.razorpay.webhookSecret && !!signature && safeEqual(hmac(env.razorpay.webhookSecret, rawBody), signature);
}

export const fromUnix = (s: number | null | undefined) => (s ? new Date(s * 1000) : null);
export const toPaise = (rupees: number) => Math.round(rupees * 100);
