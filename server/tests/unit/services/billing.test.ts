import { describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../../../src/lib/prisma.js";
import { env } from "../../../src/env.js";
import {
  applySubscriptionChange, assertFeature, getPlanState, graceEnd, hasEntitlement, leadsThisMonth, liveSubscription, lockedLeadIds, planOf,
} from "../../../src/services/entitlements.js";
import {
  fromUnix, razorpay, razorpayConfigured, toPaise, verifyCheckoutSignature, verifyOrderSignature, verifyWebhookSignature, type RazorpaySubscription,
} from "../../../src/services/razorpay.js";
import {
  activeEntitlements, appUserIdFor, fetchSubscriber, providerIdFromAppUserId, rcCustomerUrl, revenuecatConfigured, type RcSubscriber,
} from "../../../src/services/revenuecat.js";
import { reconcileSubscription, recordGatewayPayment, syncRazorpaySubscription, syncRevenueCatProvider } from "../../../src/services/billing-sync.js";
import { invoicePdfUrl, issueInvoice, presentInvoice, renderInvoicePdf } from "../../../src/services/invoices.js";
import { activateSponsoredOrder } from "../../../src/services/sponsored-orders.js";
import { createCategory, createLead, createOwner, createProvider, seedPlans, subscribe } from "../../helpers/factories.js";
import { json, mockFetch, sentMails, settle } from "../../helpers/app.js";

const DAY = 24 * 60 * 60 * 1000;
const hmac = (secret: string, s: string | Buffer) => crypto.createHmac("sha256", secret).update(s).digest("hex");

describe("entitlements", () => {
  it("reports Free for a provider without a subscription", async () => {
    await seedPlans();
    const p = await createProvider();
    const state = await getPlanState(p.id);
    expect(state).toMatchObject({ plan: { code: "free", name: "Free" }, entitlements: [], subscription: null, limits: { leads: { limit: 2, used: 0 }, photos: { limit: 3, used: 0 } } });
    expect(state.features).toEqual({ analytics: false, whatsapp: false, promote: false, priority_support: false });
    expect(hasEntitlement(state, "provider_pro")).toBe(false);
    await expect(assertFeature(p.id, "analytics")).rejects.toMatchObject({ status: 402, message: expect.stringContaining("Pro plan") });
    await expect(assertFeature(p.id, "promote")).rejects.toMatchObject({ message: expect.stringContaining("Business plan") });
    expect((await planOf(p.id)).code).toBe("free");
  });
  it("works without any plan rows", async () => {
    const p = await createProvider();
    expect((await getPlanState(p.id)).plan).toEqual({ id: null, code: "free", name: "Free" });
    expect(await planOf(p.id)).toEqual({ plan: null, code: "free", entitlements: [] });
  });
  it("reports a live plan", async () => {
    const plans = await seedPlans();
    const p = await createProvider();
    await subscribe(p.id, plans.business.id, { autoRenew: false, status: "past_due", graceUntil: new Date() });
    const state = await getPlanState(p.id);
    expect(state.plan.code).toBe("business");
    expect(state.subscription).toMatchObject({ status: "past_due", cancelAtPeriodEnd: true });
    expect(state.features.promote).toBe(true);
    await assertFeature(p.id, "promote");
    expect((await liveSubscription(p.id))!.planId).toBe(plans.business.id);
  });
  it("counts leads this month and locks the ones over the limit", async () => {
    const p = await createProvider();
    const leads = [];
    for (let i = 0; i < 4; i++) leads.push(await createLead(p.id));
    await createLead(p.id, { disputeStatus: "accepted" });
    await createLead(p.id, { createdAt: new Date(Date.now() - 70 * DAY) });
    expect(await leadsThisMonth(p.id)).toBe(4);
    expect(await lockedLeadIds(p.id, null, [leads[0]!.id])).toEqual(new Set());
    expect(await lockedLeadIds(p.id, 2, [])).toEqual(new Set());
    expect(await lockedLeadIds(p.id, 2, leads.map((l) => l.id))).toEqual(new Set([leads[2]!.id, leads[3]!.id]));
  });
  it("graceEnd adds three days", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(graceEnd(from).toISOString()).toBe("2026-01-04T00:00:00.000Z");
    expect(graceEnd().getTime()).toBeGreaterThan(Date.now());
  });

  describe("applySubscriptionChange", () => {
    const change = (providerId: bigint, over: Partial<Parameters<typeof applySubscriptionChange>[0]> = {}) =>
      applySubscriptionChange({ providerId, planCode: "pro", billingCycle: "monthly", source: "admin", status: "active", periodEnd: new Date(Date.now() + 30 * DAY), autoRenew: true, ...over });

    it("rejects unknown plans", async () => {
      const p = await createProvider();
      await expect(change(p.id, { planCode: "gold" as never })).rejects.toThrow("Unknown plan gold");
    });
    it("upgrades, switches, renews and ends plans with badges and messages", async () => {
      const plans = await seedPlans();
      const { user, provider } = await createOwner();

      const pro = await change(provider.id, { quiet: false });
      await settle();
      expect(pro.status).toBe("active");
      expect(await prisma.providerBadge.findMany({ select: { badgeId: true } })).toEqual([{ badgeId: plans.badges.pro.id }]);
      expect(sentMails().map((m) => m.subject)).toEqual(["You are now on the Pro plan"]);
      expect(sentMails()[0]!.text).toContain("active until");

      // Same external id: updated in place, no plan change message.
      await change(provider.id, { source: "razorpay", externalId: "sub_1", quiet: true, periodEnd: null });
      await change(provider.id, { source: "razorpay", externalId: "sub_1", periodEnd: null });
      await settle();
      expect(await prisma.providerSubscription.count({ where: { status: "active" } })).toBe(1);

      await change(provider.id, { planCode: "business", source: "razorpay", externalId: "sub_1", periodEnd: null });
      await settle();
      expect(await prisma.providerBadge.findMany({ select: { badgeId: true } })).toEqual([{ badgeId: plans.badges.business.id }]);
      expect(sentMails().at(-1)!.text).toContain("Your plan is active.");

      // Payment failure: once, not again while still past due.
      await change(provider.id, { planCode: "business", source: "razorpay", externalId: "sub_1", status: "past_due", graceUntil: graceEnd() });
      await change(provider.id, { planCode: "business", source: "razorpay", externalId: "sub_1", status: "past_due", graceUntil: graceEnd() });
      await settle();
      expect(await prisma.notification.count({ where: { userId: user.id, title: "Payment for your Business plan failed" } })).toBe(1);

      // Ending: the badge goes and the Free message is sent.
      const ended = await change(provider.id, { planCode: "free", source: "razorpay", externalId: "sub_1", status: "cancelled", periodEnd: null });
      await settle();
      expect(ended!.status).toBe("cancelled");
      expect(await prisma.providerBadge.count()).toBe(0);
      expect(sentMails().at(-1)!.subject).toBe("Your Business plan has ended");

      // Free with nothing live is a no-op.
      expect(await change(provider.id, { planCode: "free", status: "expired" })).toBeNull();
    });
    it("records a non-live change and a payment failure without a grace date", async () => {
      await seedPlans();
      const { provider } = await createOwner();
      const pending = await change(provider.id, { status: "pending", source: "razorpay", externalId: "sub_p" });
      expect(pending.cancelledAt).toBeInstanceOf(Date);
      await change(provider.id, { status: "past_due" });
      await settle();
      expect(sentMails().some((m) => m.text.includes("Update your payment method to keep your plan."))).toBe(true);
      await change(provider.id, { planCode: "free", status: "expired", periodEnd: new Date() });
    });
    it("handles plans without badges and providers without owners", async () => {
      const free = await prisma.subscriptionPlan.create({ data: { code: "free", name: "Free", price: 0 } });
      await prisma.subscriptionPlan.create({ data: { code: "pro", name: "Pro", price: 1 } });
      const p = await createProvider();
      await change(p.id);
      await change(p.id, { planCode: "free", status: "expired" });
      await settle();
      expect(free.id).toBeDefined();
      expect(await prisma.providerBadge.count()).toBe(0);
    });
  });
});

describe("razorpay client", () => {
  it("knows whether it is configured", () => {
    expect(razorpayConfigured()).toBe(true);
    expect(fromUnix(0)).toBeNull();
    expect(fromUnix(null)).toBeNull();
    expect(fromUnix(1)!.toISOString()).toBe("1970-01-01T00:00:01.000Z");
    expect(toPaise(5.995)).toBe(600);
  });
  it("calls the REST API with basic auth", async () => {
    const fetch = mockFetch(json({ id: "x" }));
    await razorpay.createPlan({ period: "monthly", name: "Pro", amountPaise: 100 });
    await razorpay.createSubscription({ planId: "p", totalCount: 12, notes: {}, notifyEmail: "a@b.co" });
    await razorpay.createSubscription({ planId: "p", totalCount: 12, notes: {} });
    await razorpay.fetchSubscription("s/1");
    await razorpay.cancelSubscription("s", false);
    await razorpay.cancelScheduledChanges("s");
    await razorpay.changePlan("s", "p2");
    await razorpay.createOrder({ amountPaise: 100, receipt: "r", notes: {} });
    await razorpay.fetchOrder("o");
    await razorpay.fetchPayment("pay");
    await razorpay.refund("pay", 50);
    await razorpay.refund("pay");
    const calls = fetch.mock.calls.map(([url, init]) => [init!.method, String(url).replace("https://api.razorpay.com/v1", ""), init!.body]);
    expect(calls).toEqual([
      ["POST", "/plans", expect.stringContaining('"period":"monthly"')],
      ["POST", "/subscriptions", expect.stringContaining('"notify_info":{"notify_email":"a@b.co"}')],
      ["POST", "/subscriptions", expect.not.stringContaining("notify_info")],
      ["GET", "/subscriptions/s%2F1", undefined],
      ["POST", "/subscriptions/s/cancel", '{"cancel_at_cycle_end":0}'],
      ["POST", "/subscriptions/s/cancel_scheduled_changes", undefined],
      ["PATCH", "/subscriptions/s", expect.stringContaining('"plan_id":"p2"')],
      ["POST", "/orders", expect.stringContaining('"amount":100')],
      ["GET", "/orders/o", undefined],
      ["GET", "/payments/pay", undefined],
      ["POST", "/payments/pay/refund", '{"amount":50}'],
      ["POST", "/payments/pay/refund", "{}"],
    ]);
    expect((fetch.mock.calls[0]![1]!.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("rzp_test_key:rzp_test_secret").toString("base64")}`);
  });
  it("turns errors into 502s and refuses when not configured", async () => {
    mockFetch(json({ error: { description: "Bad plan" } }, 400));
    await expect(razorpay.fetchOrder("x")).rejects.toMatchObject({ status: 502, message: "Bad plan" });
    mockFetch(new Response("not json", { status: 500 }));
    await expect(razorpay.fetchOrder("x")).rejects.toMatchObject({ status: 502, message: expect.stringContaining("did not accept") });
    const saved = env.razorpay.keySecret;
    env.razorpay.keySecret = "";
    await expect(razorpay.fetchOrder("x")).rejects.toMatchObject({ status: 501 });
    expect(verifyCheckoutSignature("a", "b", "c")).toBe(false);
    expect(verifyOrderSignature("a", "b", "c")).toBe(false);
    env.razorpay.keySecret = saved;
  });
  it("verifies signatures", () => {
    const secret = env.razorpay.keySecret;
    expect(verifyCheckoutSignature("pay", "sub", hmac(secret, "pay|sub"))).toBe(true);
    expect(verifyCheckoutSignature("pay", "sub", "bad")).toBe(false);
    expect(verifyOrderSignature("ord", "pay", hmac(secret, "ord|pay"))).toBe(true);
    const body = Buffer.from('{"a":1}');
    expect(verifyWebhookSignature(body, hmac(env.razorpay.webhookSecret, body))).toBe(true);
    expect(verifyWebhookSignature(body, undefined)).toBe(false);
    const saved = env.razorpay.webhookSecret;
    env.razorpay.webhookSecret = "";
    expect(verifyWebhookSignature(body, "x")).toBe(false);
    env.razorpay.webhookSecret = saved;
  });
});

describe("revenuecat client", () => {
  it("maps app user ids and entitlements", () => {
    expect(revenuecatConfigured()).toBe(true);
    expect(appUserIdFor(5n)).toBe("provider_5");
    expect(providerIdFromAppUserId("provider_12")).toBe(12n);
    expect(providerIdFromAppUserId("user_1")).toBeNull();
    expect(providerIdFromAppUserId(null)).toBeNull();
    expect(rcCustomerUrl("provider_1")).toBe("https://app.revenuecat.com/projects/rc_project/customers/provider_1");
    const saved = env.revenuecat.projectId;
    env.revenuecat.projectId = "";
    expect(rcCustomerUrl("x")).toBeNull();
    env.revenuecat.projectId = saved;
    const now = new Date("2026-01-10T00:00:00Z");
    const sub = {
      entitlements: {
        a: { expires_date: null, product_identifier: "a", purchase_date: "" },
        b: { expires_date: "2026-01-01T00:00:00Z", grace_period_expires_date: "2026-01-20T00:00:00Z", product_identifier: "b", purchase_date: "" },
        c: { expires_date: "2026-01-01T00:00:00Z", product_identifier: "c", purchase_date: "" },
      },
    } as unknown as RcSubscriber;
    expect(activeEntitlements(sub, now).map((e) => e.id)).toEqual(["a", "b"]);
    expect(activeEntitlements({ entitlements: {} } as RcSubscriber)).toEqual([]);
  });
  it("fetches subscribers", async () => {
    const fetch = mockFetch(json({ subscriber: { original_app_user_id: "provider_1" } }), json({}, 404));
    expect(await fetchSubscriber("provider_1")).toEqual({ original_app_user_id: "provider_1" });
    expect((fetch.mock.calls[0]![1]!.headers as Record<string, string>).Authorization).toBe("Bearer rc_secret");
    await expect(fetchSubscriber("provider_1")).rejects.toThrow("lookup failed (404)");
    const saved = env.revenuecat.secretKey;
    env.revenuecat.secretKey = "";
    await expect(fetchSubscriber("x")).rejects.toMatchObject({ status: 501 });
    env.revenuecat.secretKey = saved;
  });
});

const rzpSub = (over: Partial<RazorpaySubscription> = {}): RazorpaySubscription => ({
  id: "sub_1", plan_id: "plan_pro_m", status: "active", current_start: null, current_end: Math.floor((Date.now() + 30 * DAY) / 1000), ended_at: null, charge_at: null, paid_count: 1, notes: {}, ...over,
});

describe("billing sync: Razorpay", () => {
  it("activates, marks past due and ends subscriptions", async () => {
    const plans = await seedPlans();
    const { provider } = await createOwner({ state: "Maharashtra" });
    await expect(syncRazorpaySubscription(rzpSub({ notes: [] }))).rejects.toThrow("does not belong to a provider");

    const pending = await subscribe(provider.id, plans.pro.id, { status: "pending", source: "razorpay", externalId: "sub_1" });
    expect(await syncRazorpaySubscription(rzpSub({ status: "authenticated" }))).toMatchObject({ id: pending.id });
    expect(await syncRazorpaySubscription(rzpSub({ status: "created" }))).toMatchObject({ status: "pending" });

    const active = await syncRazorpaySubscription(rzpSub(), { id: "pay_1", amount: 59900, currency: "INR", status: "captured" });
    expect(active).toMatchObject({ status: "active", source: "razorpay" });
    const txn = await prisma.transaction.findFirstOrThrow({ include: { invoice: true } });
    expect(txn).toMatchObject({ gatewayPaymentId: "pay_1", gatewayTxnId: "sub_1", type: "subscription" });
    expect(txn.invoice).not.toBeNull();

    // Unknown plan id keeps the stored plan; missing period keeps the stored end.
    await syncRazorpaySubscription(rzpSub({ plan_id: "plan_unknown", current_end: null }), { id: "pay_x", amount: 1, currency: "INR", status: "failed" });
    const pastDue = await syncRazorpaySubscription(rzpSub({ status: "pending" }));
    expect(pastDue).toMatchObject({ status: "past_due" });
    expect(pastDue!.graceUntil).toBeInstanceOf(Date);
    await syncRazorpaySubscription(rzpSub({ status: "pending" }));

    const cancelled = await syncRazorpaySubscription(rzpSub({ status: "cancelled" }));
    expect(cancelled).toMatchObject({ status: "cancelled" });
    // Already ended: left alone.
    expect(await syncRazorpaySubscription(rzpSub({ status: "halted" }))).toMatchObject({ status: "cancelled" });
  });
  it("creates the subscription from notes and expires halted ones", async () => {
    await seedPlans();
    const { provider } = await createOwner();
    const sub = await syncRazorpaySubscription(rzpSub({ id: "sub_new", plan_id: "plan_biz_m", notes: { providerId: String(provider.id) } }));
    expect(sub).toMatchObject({ externalId: "sub_new", billingCycle: "monthly" });
    expect((await planOf(provider.id)).code).toBe("business");
    expect(await syncRazorpaySubscription(rzpSub({ id: "sub_new", status: "expired" }))).toMatchObject({ status: "expired" });
    // No price and no stored plan: treated as Free.
    const other = await createOwner();
    expect(await syncRazorpaySubscription(rzpSub({ id: "sub_free", plan_id: "nope", notes: { providerId: String(other.provider.id) } }))).toBeNull();
    expect(await syncRazorpaySubscription(rzpSub({ id: "sub_none", status: "halted", notes: { providerId: String(other.provider.id) } }))).toBeNull();
  });
  it("records gateway payments once and retries missing invoices", async () => {
    await seedPlans();
    const { provider } = await createOwner();
    const first = await recordGatewayPayment({ providerId: provider.id, subscriptionId: null, gateway: "razorpay", paymentId: "pay", amount: 118, currency: "INR", note: "n" });
    expect(first.note).toBe("n");
    await prisma.invoice.deleteMany();
    const again = await recordGatewayPayment({ providerId: provider.id, subscriptionId: null, gateway: "razorpay", paymentId: "pay", amount: 118, currency: "INR" });
    expect(again.id).toBe(first.id);
    expect(await prisma.invoice.count()).toBe(1);
    const store = await recordGatewayPayment({ providerId: provider.id, subscriptionId: null, gateway: "app_store", paymentId: "ios", amount: 1, currency: "USD", type: "subscription" });
    await recordGatewayPayment({ providerId: provider.id, subscriptionId: null, gateway: "app_store", paymentId: "ios", amount: 1, currency: "USD" });
    expect(store.gateway).toBe("app_store");
    expect(await prisma.invoice.count()).toBe(1);
  });
});

describe("billing sync: RevenueCat", () => {
  const subscriber = (entitlements: Record<string, { product: string; expires?: string | null; grace?: string | null }>, subs: Record<string, Partial<RcSubscriber["subscriptions"][string]>> = {}) =>
    json({
      subscriber: {
        original_app_user_id: "x",
        entitlements: Object.fromEntries(Object.entries(entitlements).map(([id, e]) => [id, { product_identifier: e.product, expires_date: e.expires === undefined ? new Date(Date.now() + 30 * DAY).toISOString() : e.expires, grace_period_expires_date: e.grace ?? null, purchase_date: "" }])),
        subscriptions: subs,
      },
    });

  it("applies store plans and never overrides web plans", async () => {
    const plans = await seedPlans();
    const { provider } = await createOwner();
    mockFetch(subscriber({}));
    expect(await syncRevenueCatProvider(provider.id)).toBeNull();

    mockFetch(subscriber({ provider_pro: { product: "dnf_pro_yearly" } }, { dnf_pro_yearly: { store: "app_store", unsubscribe_detected_at: "x", billing_issues_detected_at: null } }));
    const ios = await syncRevenueCatProvider(provider.id);
    expect(ios).toMatchObject({ source: "app_store", billingCycle: "yearly", autoRenew: false, status: "active", externalId: `provider_${provider.id}` });

    mockFetch(subscriber(
      { provider_pro: { product: "dnf_business:monthly" }, provider_business: { product: "dnf_business:monthly", grace: new Date(Date.now() + DAY).toISOString() } },
      { "dnf_business:monthly": { store: "play_store", unsubscribe_detected_at: null, billing_issues_detected_at: "x", grace_period_expires_date: new Date(Date.now() + DAY).toISOString() } },
    ));
    const play = await syncRevenueCatProvider(provider.id);
    expect(play).toMatchObject({ source: "play_store", status: "past_due" });
    expect((await planOf(provider.id)).code).toBe("business");

    mockFetch(subscriber({}));
    expect(await syncRevenueCatProvider(provider.id)).toMatchObject({ status: "expired" });

    const web = await createOwner();
    await subscribe(web.provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_w" });
    mockFetch(subscriber({ provider_pro: { product: "dnf_pro_monthly" } }));
    expect(await syncRevenueCatProvider(web.provider.id)).toMatchObject({ source: "razorpay" });
    expect(console.warn).toHaveBeenCalled();
    mockFetch(subscriber({}));
    expect(await syncRevenueCatProvider(web.provider.id)).toMatchObject({ source: "razorpay" });
  });
  it("guesses the billing cycle for unknown products and handles grace without dates", async () => {
    await seedPlans();
    const { provider } = await createOwner();
    mockFetch(subscriber({ provider_pro: { product: "com.x.annual", expires: null } }, { "com.x.annual": { store: "play_store", billing_issues_detected_at: "x", unsubscribe_detected_at: null } }));
    const s = await syncRevenueCatProvider(provider.id);
    expect(s).toMatchObject({ source: "play_store", billingCycle: "yearly", endDate: null, status: "past_due" });
    mockFetch(subscriber({ provider_pro: { product: "weekly_thing" } }));
    expect(await syncRevenueCatProvider(provider.id)).toMatchObject({ billingCycle: "monthly", source: "app_store" });
    mockFetch(subscriber({ provider_pro: { product: "weekly_thing" } }, { weekly_thing: { store: "app_store", billing_issues_detected_at: "x", unsubscribe_detected_at: null } }));
    expect((await syncRevenueCatProvider(provider.id))!.graceUntil).toBeInstanceOf(Date);
  });
});

describe("reconcileSubscription", () => {
  it("asks the gateway before expiring", async () => {
    const plans = await seedPlans();
    const { provider } = await createOwner();
    const admin = await subscribe(provider.id, plans.pro.id);
    expect(await reconcileSubscription(admin)).toBe(false);

    const rzp = await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_1", endDate: new Date(Date.now() - 1000) });
    mockFetch(json(rzpSub()));
    expect(await reconcileSubscription(rzp)).toBe(true);

    mockFetch(json(rzpSub({ status: "cancelled" })));
    expect(await reconcileSubscription(rzp)).toBe(false);

    // Gateway down: a day of grace after the period end.
    mockFetch(new Error("down"));
    expect(await reconcileSubscription({ ...rzp, endDate: new Date(Date.now() - 1000) })).toBe(true);
    expect(await reconcileSubscription({ ...rzp, endDate: new Date(Date.now() - 2 * DAY) })).toBe(false);
    expect(await reconcileSubscription({ ...rzp, endDate: null })).toBe(false);

    const other = await createOwner();
    const store = await subscribe(other.provider.id, plans.pro.id, { source: "play_store", externalId: `provider_${other.provider.id}` });
    mockFetch(json({ subscriber: { entitlements: { provider_pro: { product_identifier: "dnf_pro:monthly", expires_date: null, purchase_date: "" } }, subscriptions: { "dnf_pro:monthly": { store: "play_store" } } } }));
    expect(await reconcileSubscription(store)).toBe(true);
    const ios = await subscribe(other.provider.id, plans.pro.id, { source: "app_store" });
    mockFetch(json({ subscriber: { entitlements: {}, subscriptions: {} } }));
    expect(await reconcileSubscription(ios)).toBe(false);

    const saved = { ...env.revenuecat };
    env.revenuecat.secretKey = "";
    expect(await reconcileSubscription(store)).toBe(false);
    Object.assign(env.revenuecat, saved);
    expect(await reconcileSubscription({ ...rzp, externalId: null })).toBe(false);
  });
  it("counts past-due grace and deleted rows", async () => {
    const plans = await seedPlans();
    const { provider } = await createOwner();
    const sub = await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_1", endDate: new Date(Date.now() - DAY) });
    mockFetch(json(rzpSub({ status: "pending", current_end: Math.floor((Date.now() - DAY) / 1000) })));
    expect(await reconcileSubscription(sub)).toBe(true);
    await prisma.providerSubscription.update({ where: { id: sub.id }, data: { graceUntil: new Date(Date.now() - 1000) } });
    mockFetch(json(rzpSub({ status: "pending", current_end: Math.floor((Date.now() - DAY) / 1000) })));
    expect(await reconcileSubscription(sub)).toBe(false);
    mockFetch(json(rzpSub({ status: "pending", current_end: null })));
    await prisma.providerSubscription.update({ where: { id: sub.id }, data: { endDate: null } });
    expect(await reconcileSubscription(sub)).toBe(true);
    vi.spyOn(prisma.providerSubscription, "findUnique").mockResolvedValueOnce(null);
    mockFetch(json(rzpSub()));
    expect(await reconcileSubscription(sub)).toBe(false);
  });
});

describe("invoices", () => {
  it("issues sequential GST invoices once", async () => {
    const plans = await seedPlans();
    await prisma.setting.createMany({ data: [{ key: "invoice_state_code", value: "27" }, { key: "invoice_gstin", value: "27ABCDE1234F1Z5" }, { key: "invoice_address", value: "Mumbai HQ" }] });
    const { provider } = await createOwner({ state: "Maharashtra", addressLine: "1 Road", pincode: "400001" });
    const sub = await subscribe(provider.id, plans.pro.id, { billingCycle: "yearly" });
    const txn = await prisma.transaction.create({ data: { providerId: provider.id, subscriptionId: sub.id, type: "subscription", gateway: "razorpay", amount: 1180, status: "success" } });
    const inv = (await issueInvoice(txn.id))!;
    expect(inv.number).toMatch(/^DNF\/\d{4}-\d{2}\/00001$/);
    expect(Number(inv.cgst)).toBe(90);
    expect(Number(inv.igst)).toBe(0);
    expect(inv.billedTo).toMatchObject({ address: "1 Road, Mumbai, 400001", stateCode: "27", state: "Maharashtra" });
    expect((inv.lines as { description: string; period: string }[])[0]).toMatchObject({ description: "DialNFind Pro subscription (yearly)", period: expect.stringContaining("Until") });
    expect(await issueInvoice(txn.id)).toMatchObject({ id: inv.id });
    await settle();
    expect(sentMails().map((m) => m.subject)).toContain(`Invoice ${inv.number} from DialNFind`);

    const other = await createProvider({ state: "Karnataka", billingName: "Acme", billingAddress: "Blr", billingStateCode: "29", gstin: "29ABCDE1234F1Z5" });
    const ad = await prisma.transaction.create({ data: { providerId: other.id, type: "sponsored_ad", gateway: "manual", amount: 590, status: "success" } });
    const adInv = (await issueInvoice(ad.id, { email: false }))!;
    expect(adInv.number).toMatch(/00002$/);
    expect(Number(adInv.igst)).toBe(90);
    expect(adInv.billedTo).toMatchObject({ name: "Acme", address: "Blr", gstin: "29ABCDE1234F1Z5" });
    const fee = await prisma.transaction.create({ data: { providerId: other.id, type: "lead_fee", amount: 10, status: "success" } });
    expect(((await issueInvoice(fee.id))!.lines as { description: string }[])[0]!.description).toBe("DialNFind lead fee");
    const planless = await prisma.transaction.create({ data: { providerId: other.id, type: "subscription", amount: 10, status: "success" } });
    expect(((await issueInvoice(planless.id))!.lines as { description: string; period: null }[])[0]).toMatchObject({ description: "DialNFind plan subscription", period: null });
    const unknownState = await createProvider({ state: "Atlantis" });
    const u = await prisma.transaction.create({ data: { providerId: unknownState.id, type: "lead_fee", amount: 10, status: "success" } });
    expect((await issueInvoice(u.id))!.placeOfSupply).toBe("Atlantis");
  });
  it("skips failed, missing and store payments; works with blank seller settings", async () => {
    const p = await createProvider();
    const failed = await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", amount: 1, status: "failed" } });
    expect(await issueInvoice(failed.id)).toBeNull();
    expect(await issueInvoice(999n)).toBeNull();
    const store = await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", gateway: "play_store", amount: 1, status: "success" } });
    expect(await issueInvoice(store.id)).toBeNull();
    await prisma.setting.createMany({ data: ["invoice_legal_name", "invoice_state_code", "invoice_sac", "invoice_prefix"].map((key) => ({ key, value: "" })) });
    const ok = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", amount: 10, status: "success" } });
    const inv = (await issueInvoice(ok.id))!;
    expect(inv.number).toMatch(/^DNF\//);
    expect(inv.seller).toMatchObject({ name: "DialNFind", stateCode: null, state: null });
    expect((inv.lines as { sac: string }[])[0]!.sac).toBe("998365");
  });
  it("presents and renders invoices", async () => {
    const p = await createProvider();
    const txn = await prisma.transaction.create({ data: { providerId: p.id, type: "lead_fee", amount: 118, status: "success" } });
    const inv = (await issueInvoice(txn.id))!;
    const shown = presentInvoice(inv);
    expect(shown).toMatchObject({ total: 118, taxable: 100, tax: 18, pdfUrl: expect.stringContaining(`/api/v1/invoice-files/${inv.id}.pdf?exp=`) });
    expect(invoicePdfUrl(inv.id)).toContain("sig=");
    const pdf = await renderInvoicePdf(inv);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const intra = { ...inv, status: "void" as const, igst: 0 as never, cgst: 9 as never, sgst: 9 as never, placeOfSupply: null, seller: { name: "S", address: null, state: null, stateCode: null, gstin: null }, billedTo: { name: "B", address: "A", state: "Goa", stateCode: null, gstin: "G" }, lines: [{ description: "d", sac: "1", period: "p", taxable: 1 }] };
    expect((await renderInvoicePdf(intra as never)).length).toBeGreaterThan(100);
    expect(presentInvoice({ ...inv, cgst: null, sgst: null, igst: null } as never).tax).toBe(0);
  });
});

describe("sponsored orders", () => {
  it("activates a paid order once and records the payment", async () => {
    const cat = await createCategory();
    const { user, provider } = await createOwner();
    const order = await prisma.sponsoredOrder.create({ data: { providerId: provider.id, categoryId: cat.id, days: 7, budget: 500, amount: 590, razorpayOrderId: "order_1" } });
    const done = await activateSponsoredOrder(order, "pay_1");
    expect(done).toMatchObject({ status: "paid", sponsored: { status: "active" } });
    const listing = done.sponsored!;
    expect((listing.endDate.getTime() - listing.startDate.getTime()) / DAY).toBe(6);
    await settle();
    expect(await prisma.notification.count({ where: { userId: user.id, title: "Your campaign is live" } })).toBe(1);
    // Second call (webhook after checkout): nothing new.
    await activateSponsoredOrder(order, "pay_1");
    expect(await prisma.sponsoredListing.count()).toBe(1);
    expect(await prisma.transaction.count()).toBe(1);
  });
  it("finishes an order left paid without a campaign", async () => {
    const cat = await createCategory();
    const p = await createProvider();
    const order = await prisma.sponsoredOrder.create({ data: { providerId: p.id, categoryId: cat.id, days: 1, budget: 500, amount: 590, razorpayOrderId: "order_2", status: "paid" } });
    expect((await activateSponsoredOrder(order, "pay_2")).sponsoredListingId).not.toBeNull();
    const failed = await prisma.sponsoredOrder.create({ data: { providerId: p.id, categoryId: cat.id, days: 1, budget: 500, amount: 590, razorpayOrderId: "order_3", status: "failed" } });
    expect((await activateSponsoredOrder(failed, "pay_3")).sponsoredListingId).toBeNull();
  });
});
