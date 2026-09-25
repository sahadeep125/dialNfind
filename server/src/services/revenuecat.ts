import { env } from "../env.js";
import { notConfigured } from "../lib/errors.js";

/**
 * RevenueCat REST API v1, used to read a subscriber's store subscriptions. Store purchases are
 * made by the business, so the app user id is the provider, not the person signed in.
 */
const API = "https://api.revenuecat.com/v1";

export const revenuecatConfigured = () => !!env.revenuecat.secretKey;
export const appUserIdFor = (providerId: bigint | number) => `provider_${providerId}`;

export function providerIdFromAppUserId(id: string | undefined | null): bigint | null {
  const m = /^provider_(\d+)$/.exec(id ?? "");
  return m ? BigInt(m[1]) : null;
}

export interface RcEntitlement {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
  purchase_date: string;
}

export interface RcSubscription {
  store: "app_store" | "play_store" | "stripe" | "promotional" | "amazon" | "mac_app_store" | "rc_billing" | string;
  expires_date: string | null;
  purchase_date: string;
  original_purchase_date: string;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
  grace_period_expires_date?: string | null;
  refunded_at?: string | null;
  period_type: string;
  is_sandbox: boolean;
  store_transaction_id?: string;
}

export interface RcSubscriber {
  original_app_user_id: string;
  entitlements: Record<string, RcEntitlement>;
  subscriptions: Record<string, RcSubscription>;
}

export async function fetchSubscriber(appUserId: string): Promise<RcSubscriber> {
  if (!revenuecatConfigured()) throw notConfigured("In-app purchases are not set up on the server yet");
  const res = await fetch(`${API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${env.revenuecat.secretKey}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`RevenueCat subscriber lookup failed (${res.status})`);
  const body = (await res.json()) as { subscriber: RcSubscriber };
  return body.subscriber;
}

/** Entitlements still in force, counting a store grace period after a failed renewal. */
export function activeEntitlements(sub: RcSubscriber, now = new Date()) {
  return Object.entries(sub.entitlements)
    .filter(([, e]) => {
      const until = e.grace_period_expires_date ?? e.expires_date;
      return until === null || new Date(until) > now;
    })
    .map(([id, e]) => ({ id, ...e }));
}

/** Webhook body as documented at https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields */
export interface RcWebhookEvent {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
  product_id?: string;
  entitlement_ids?: string[] | null;
  store?: string;
  environment?: "SANDBOX" | "PRODUCTION";
  transaction_id?: string;
  original_transaction_id?: string;
  price_in_purchased_currency?: number;
  currency?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  period_type?: string;
}

export const rcCustomerUrl = (appUserId: string) =>
  env.revenuecat.projectId ? `https://app.revenuecat.com/projects/${env.revenuecat.projectId}/customers/${encodeURIComponent(appUserId)}` : null;
