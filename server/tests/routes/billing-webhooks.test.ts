import { describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { issueInvoice } from "../../src/services/invoices.js";
import { api, authed, json, mockFetch } from "../helpers/app.js";
import { createCategory, createOwner, createProvider, seedPlans, subscribe } from "../helpers/factories.js";

const DAY = 24 * 60 * 60 * 1000;
const rzpSub = (over: Record<string, unknown> = {}) => ({ id: "sub_1", plan_id: "plan_pro_m", status: "active", current_end: Math.floor((Date.now() + 30 * DAY) / 1000), notes: {}, ...over });
const sign = (s: string) => crypto.createHmac("sha256", env.razorpay.keySecret).update(s).digest("hex");

describe("provider billing", () => {
  it("shows plans, payments, invoices and where the plan is managed", async () => {
    const plans = await seedPlans();
    const { user, provider } = await createOwner({ state: "Maharashtra", addressLine: "1 Road", pincode: "400001" });
    const txn = await prisma.transaction.create({ data: { providerId: provider.id, type: "subscription", gateway: "razorpay", amount: 599, status: "success" } });
    await issueInvoice(txn.id, { email: false });
    const c = await authed(user);
    const res = await c.get("/api/v1/provider/billing");
    expect(res.body).toMatchObject({
      managedIn: null, manageUrl: null, web: { enabled: true, keyId: "rzp_test_key" }, store: { enabled: true },
      billingProfile: { billingName: provider.businessName, billingAddress: "1 Road, Mumbai, 400001", billingStateCode: "27", gstin: null },
    });
    expect(res.body.plans.map((p: { code: string }) => p.code)).toEqual(["free", "pro", "business"]);
    expect(res.body.plans[1].prices[0]).toMatchObject({ billingCycle: "monthly", availableOnWeb: true });
    expect(res.body.plans[2].prices[1]).toMatchObject({ billingCycle: "yearly", availableOnWeb: false });
    expect(res.body.transactions[0].invoiceNumber).toMatch(/^DNF\//);
    expect(res.body.invoices).toHaveLength(1);

    for (const [source, managedIn] of [["app_store", "app_store"], ["play_store", "play_store"], ["razorpay", "web"], ["admin", "support"]] as const) {
      await prisma.providerSubscription.deleteMany();
      await subscribe(provider.id, plans.pro.id, { source });
      const body = (await c.get("/api/v1/provider/billing")).body;
      expect(body.managedIn).toBe(managedIn);
      expect(body.manageUrl === null).toBe(source === "razorpay" || source === "admin");
    }
    const saved = { ...env.razorpay };
    env.razorpay.keyId = "";
    await prisma.provider.update({ where: { id: provider.id }, data: { addressLine: null, pincode: null, city: "" } });
    const off = (await c.get("/api/v1/provider/billing")).body;
    expect(off.web).toEqual({ enabled: false, keyId: null });
    expect(off.billingProfile.billingAddress).toBeNull();
    Object.assign(env.razorpay, saved);
  });
  it("saves billing details with GSTIN checks", async () => {
    const { user } = await createOwner();
    const c = await authed(user);
    const put = (body: Record<string, unknown>) => c.put("/api/v1/provider/billing/profile").send({ billingName: "Acme Pvt Ltd", billingAddress: "12 MG Road, Pune", billingStateCode: "27", ...body });
    expect((await put({ gstin: "27abcde1234f1z5" })).body.billingProfile).toEqual({ billingName: "Acme Pvt Ltd", billingAddress: "12 MG Road, Pune", billingStateCode: "27", gstin: "27ABCDE1234F1Z5" });
    expect((await put({ gstin: "" })).body.billingProfile.gstin).toBeNull();
    expect((await put({ gstin: "29ABCDE1234F1Z5" })).body.error.message).toBe("The GSTIN does not match the chosen state");
    expect((await put({ gstin: "bad" })).status).toBe(400);
    expect((await put({ billingStateCode: "99" })).status).toBe(400);
  });

  it("starts a Razorpay checkout and verifies it", async () => {
    await seedPlans();
    const { user, provider } = await createOwner({ state: "Maharashtra" });
    const c = await authed(user);
    const fetch = mockFetch(json(rzpSub({ status: "created" })));
    const res = await c.post("/api/v1/provider/billing/razorpay/checkout").send({ planCode: "pro", billingCycle: "monthly" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ subscriptionId: "sub_1", amount: 599, description: "Pro plan, monthly" });
    expect(res.body.prefill).not.toHaveProperty("contact");
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toMatchObject({ total_count: 120 });
    // A second checkout replaces the pending one.
    mockFetch(json(rzpSub({ id: "sub_2", status: "created" })));
    await prisma.user.update({ where: { id: user.id }, data: { phone: "+919876543210" } });
    const yearly = await c.post("/api/v1/provider/billing/razorpay/checkout").send({ planCode: "pro", billingCycle: "yearly" });
    expect(yearly.body.prefill.contact).toBe("+919876543210");
    expect(await prisma.providerSubscription.count({ where: { status: "pending" } })).toBe(1);

    const verify = (sub: string, pay: string, sig = sign(`${pay}|${sub}`)) => c.post("/api/v1/provider/billing/razorpay/verify").send({ razorpay_payment_id: pay, razorpay_subscription_id: sub, razorpay_signature: sig });
    expect((await verify("sub_2", "pay_1", "bad")).status).toBe(400);
    expect((await verify("sub_other", "pay_1")).status).toBe(404);
    mockFetch((url) => (url.includes("/payments/") ? json({ id: "pay_1", amount: 599000, currency: "INR", status: "captured" }) : json(rzpSub({ id: "sub_2", plan_id: "plan_pro_y", status: "authenticated", notes: { providerId: String(provider.id) } }))));
    const ok = await verify("sub_2", "pay_1");
    expect(ok.body.state.plan.code).toBe("pro");
    expect(await prisma.transaction.count()).toBe(1);
  });
  it("verifies without forcing activation when the payment is not captured", async () => {
    await seedPlans();
    const { user, provider } = await createOwner({ state: "Maharashtra" });
    await prisma.providerSubscription.create({ data: { providerId: provider.id, planId: (await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "pro" } })).id, source: "razorpay", externalId: "sub_9", status: "pending", startDate: new Date() } });
    mockFetch((url) => (url.includes("/payments/") ? json({ id: "pay_9", amount: 1, currency: "INR", status: "authorized" }) : json(rzpSub({ id: "sub_9", status: "authenticated" }))));
    const res = await (await authed(user)).post("/api/v1/provider/billing/razorpay/verify").send({ razorpay_payment_id: "pay_9", razorpay_subscription_id: "sub_9", razorpay_signature: sign("pay_9|sub_9") });
    expect(res.body.state.plan.code).toBe("free");
  });
  it("refuses checkout when it cannot be bought on the web", async () => {
    const plans = await seedPlans();
    const { user, provider } = await createOwner({ state: "Maharashtra" });
    const c = await authed(user);
    const checkout = (body = { planCode: "pro", billingCycle: "monthly" }) => c.post("/api/v1/provider/billing/razorpay/checkout").send(body);
    for (const [source, message] of [["app_store", "App Store"], ["play_store", "Google Play"], ["razorpay", "Change plan"]] as const) {
      await prisma.providerSubscription.deleteMany();
      await subscribe(provider.id, plans.pro.id, { source });
      expect((await checkout()).body.error.message).toContain(message);
    }
    await prisma.providerSubscription.deleteMany();
    await subscribe(provider.id, plans.pro.id, { source: "admin" });
    expect((await checkout({ planCode: "business", billingCycle: "yearly" })).status).toBe(501);
    await prisma.planPrice.updateMany({ where: { billingCycle: "monthly", planId: plans.business.id }, data: { isActive: false } });
    expect((await checkout({ planCode: "business", billingCycle: "monthly" })).status).toBe(404);
    await prisma.provider.update({ where: { id: provider.id }, data: { state: "Atlantis" } });
    expect((await checkout()).body.error.code).toBe("billing_details_required");
    const saved = env.razorpay.keyId;
    env.razorpay.keyId = "";
    expect((await checkout()).status).toBe(501);
    env.razorpay.keyId = saved;
  });
  it("changes, cancels and resumes web plans", async () => {
    const plans = await seedPlans();
    const { user, provider } = await createOwner();
    const c = await authed(user);
    expect((await c.post("/api/v1/provider/billing/change-plan").send({ planCode: "business", billingCycle: "monthly" })).status).toBe(400);
    expect((await c.post("/api/v1/provider/billing/cancel")).body.error.message).toBe("You are on the Free plan");
    expect((await c.post("/api/v1/provider/billing/resume")).status).toBe(400);
    await subscribe(provider.id, plans.pro.id, { source: "razorpay", externalId: "sub_1" });
    expect((await c.post("/api/v1/provider/billing/change-plan").send({ planCode: "pro", billingCycle: "monthly" })).status).toBe(409);
    mockFetch(json(rzpSub({ plan_id: "plan_biz_m" })));
    expect((await c.post("/api/v1/provider/billing/change-plan").send({ planCode: "business", billingCycle: "monthly" })).body.state.plan.code).toBe("business");
    mockFetch(json({ error: { description: "UPI mandate" } }, 400));
    expect((await c.post("/api/v1/provider/billing/change-plan").send({ planCode: "pro", billingCycle: "yearly" })).body.error.message).toMatch(/cannot switch plans mid-cycle/);
    const saved = env.razorpay.keyId;
    env.razorpay.keyId = "";
    expect((await c.post("/api/v1/provider/billing/change-plan").send({ planCode: "pro", billingCycle: "yearly" })).status).toBe(501);
    env.razorpay.keyId = saved;

    mockFetch(json(rzpSub()));
    expect((await c.post("/api/v1/provider/billing/cancel")).body.state.subscription.cancelAtPeriodEnd).toBe(true);
    expect((await c.post("/api/v1/provider/billing/cancel")).status).toBe(409);
    expect((await c.post("/api/v1/provider/billing/resume")).body.state.subscription.cancelAtPeriodEnd).toBe(false);
    expect((await c.post("/api/v1/provider/billing/resume")).status).toBe(400);

    await prisma.providerSubscription.updateMany({ data: { source: "play_store" } });
    const store = await c.post("/api/v1/provider/billing/cancel");
    expect(store.body.error).toMatchObject({ code: "store_managed", details: { manageUrl: expect.stringContaining("play.google.com") } });
    await prisma.providerSubscription.updateMany({ data: { source: "app_store" } });
    expect((await c.post("/api/v1/provider/billing/cancel")).body.error.details.manageUrl).toContain("apps.apple.com");
    await prisma.providerSubscription.updateMany({ data: { source: "admin" } });
    expect((await c.post("/api/v1/provider/billing/cancel")).body.error.message).toMatch(/set up by our team/);
  });
  it("syncs store purchases and downloads invoices", async () => {
    await seedPlans();
    const { user, provider } = await createOwner();
    const c = await authed(user);
    mockFetch(json({ subscriber: { entitlements: {}, subscriptions: {} } }));
    expect((await c.post("/api/v1/provider/billing/revenuecat/sync")).body.state.plan.code).toBe("free");
    const saved = env.revenuecat.secretKey;
    env.revenuecat.secretKey = "";
    expect((await c.post("/api/v1/provider/billing/revenuecat/sync")).status).toBe(501);
    env.revenuecat.secretKey = saved;

    const txn = await prisma.transaction.create({ data: { providerId: provider.id, type: "lead_fee", amount: 10, status: "success" } });
    const inv = (await issueInvoice(txn.id, { email: false }))!;
    const pdf = await c.get(`/api/v1/provider/invoices/${inv.id}/pdf`).buffer(true);
    expect(pdf.headers["content-disposition"]).toContain("attachment");
    expect(pdf.body.subarray(0, 4).toString()).toBe("%PDF");
    const other = await createOwner();
    expect((await (await authed(other.user)).get(`/api/v1/provider/invoices/${inv.id}/pdf`)).status).toBe(404);
  });
});

describe("Razorpay webhook", () => {
  const send = (body: unknown, headers: Record<string, string> = {}) => {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    const signature = crypto.createHmac("sha256", env.razorpay.webhookSecret).update(raw).digest("hex");
    let r = api().post("/api/v1/webhooks/razorpay").set("content-type", "application/json").set("x-razorpay-signature", signature);
    for (const [k, v] of Object.entries(headers)) r = r.set(k, v);
    return r.send(raw);
  };

  it("checks the signature and body", async () => {
    expect((await api().post("/api/v1/webhooks/razorpay").send({ a: 1 })).status).toBe(401);
    expect((await send("not json")).status).toBe(400);
  });
  it("applies subscription events once", async () => {
    await seedPlans();
    const { provider } = await createOwner({ state: "Maharashtra" });
    const event = {
      event: "subscription.charged",
      payload: { subscription: { entity: rzpSub({ notes: { providerId: String(provider.id) } }) }, payment: { entity: { id: "pay_1", amount: 59900, currency: "INR", status: "captured" } } },
    };
    expect((await send(event, { "x-razorpay-event-id": "evt_1" })).body).toEqual({ ok: true });
    expect((await send(event, { "x-razorpay-event-id": "evt_1" })).body).toEqual({ ok: true, duplicate: true });
    const stored = await prisma.webhookEvent.findFirstOrThrow();
    expect(stored).toMatchObject({ providerId: provider.id, error: null });
    // Without an event id the body hash is the id.
    expect((await send({ ...event, event: "subscription.updated" })).body).toEqual({ ok: true });
    expect((await send({ ...event, event: "subscription.updated" })).body.duplicate).toBe(true);
    // Unknown subscription and no notes: fails and is recorded for a retry.
    const bad = await send({ event: "subscription.halted", payload: { subscription: { entity: rzpSub({ id: "sub_x" }) } } }, { "x-razorpay-event-id": "evt_bad" });
    expect(bad.status).toBe(500);
    expect((await prisma.webhookEvent.findFirstOrThrow({ where: { eventId: "evt_bad" } })).error).toMatch(/does not belong/);
    // The retry is handled again (not treated as a duplicate).
    expect((await send({ event: "subscription.halted", payload: { subscription: { entity: rzpSub({ id: "sub_x" }) } } }, { "x-razorpay-event-id": "evt_bad" })).status).toBe(500);
  });
  it("activates paid promotion orders, including from payment events", async () => {
    const cat = await createCategory();
    const p = await createProvider();
    await prisma.sponsoredOrder.create({ data: { providerId: p.id, categoryId: cat.id, days: 7, budget: 500, amount: 590, razorpayOrderId: "order_1" } });
    const paid = await send({ event: "order.paid", payload: { order: { entity: { id: "order_1" } }, payment: { entity: { id: "pay_1", amount: 59000, currency: "INR", status: "captured" } } } }, { "x-razorpay-event-id": "e1" });
    expect(paid.body).toEqual({ ok: true });
    expect((await prisma.sponsoredOrder.findFirstOrThrow()).sponsoredListingId).not.toBeNull();
    await send({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 59000, currency: "INR", status: "captured" } } } }, { "x-razorpay-event-id": "e2" });
    await send({ event: "payment.captured", payload: { payment: { entity: { id: "pay_2", order_id: "order_unknown", amount: 1, currency: "INR", status: "captured" } } } }, { "x-razorpay-event-id": "e3" });
    await send({ event: "order.paid", payload: { order: { entity: { id: "order_1" } } } }, { "x-razorpay-event-id": "e4" });
    await send({ event: "payment.failed", payload: { payment: { entity: { id: "pay_3", amount: 1, currency: "INR", status: "failed" } } } }, { "x-razorpay-event-id": "e5" });
    expect(await prisma.sponsoredListing.count()).toBe(1);
    expect((await prisma.webhookEvent.findMany({ orderBy: { id: "asc" } })).map((e) => e.providerId)).toEqual([p.id, p.id, null, null, null]);
  });
  it("records refunds and voids invoices on a full refund", async () => {
    const p = await createProvider();
    const full = await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", gateway: "razorpay", amount: 599, status: "success", gatewayPaymentId: "pay_full" } });
    await issueInvoice(full.id, { email: false });
    await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", gateway: "razorpay", amount: 599, status: "success", gatewayPaymentId: "pay_part" } });
    const refund = (paymentId: string, amount: number, id: string) => send({ event: "refund.processed", payload: { refund: { entity: { id, payment_id: paymentId, amount } } } }, { "x-razorpay-event-id": id });
    await refund("pay_full", 59900, "rf_1");
    await refund("pay_part", 10000, "rf_2");
    await refund("pay_none", 1, "rf_3");
    const txns = await prisma.transaction.findMany({ orderBy: { id: "asc" }, include: { invoice: true } });
    expect(txns[0]).toMatchObject({ status: "refunded", note: "Refunded (rf_1)", invoice: { status: "void" } });
    expect(txns[1]).toMatchObject({ status: "success", note: "Partly refunded: Rs 100.00 (rf_2)" });
    const noInvoice = await prisma.transaction.create({ data: { providerId: p.id, type: "subscription", gateway: "app_store", amount: 5, status: "success", gatewayPaymentId: "pay_store" } });
    await refund("pay_store", 500, "rf_4");
    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: noInvoice.id } })).status).toBe("refunded");
  });
  it("acknowledges a concurrent duplicate delivery and surfaces other storage errors", async () => {
    const dup = new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" });
    vi.spyOn(prisma.webhookEvent, "create").mockRejectedValueOnce(dup);
    expect((await send({ event: "x", payload: {} }, { "x-razorpay-event-id": "c1" })).body).toEqual({ ok: true, duplicate: true });
    vi.spyOn(prisma.webhookEvent, "create").mockRejectedValueOnce(new Error("db down"));
    expect((await send({ event: "x", payload: {} }, { "x-razorpay-event-id": "c2" })).status).toBe(500);
  });
  it("records non-Error failures as text", async () => {
    await seedPlans();
    const p = await createProvider();
    vi.spyOn(prisma.providerSubscription, "findFirst").mockRejectedValueOnce("plain failure");
    await send({ event: "subscription.activated", payload: { subscription: { entity: rzpSub({ notes: { providerId: String(p.id) } }) } } }, { "x-razorpay-event-id": "s1" });
    expect((await prisma.webhookEvent.findFirstOrThrow()).error).toBe("plain failure");
  });
});

describe("RevenueCat webhook", () => {
  const send = (event: Record<string, unknown> | null, auth = "Bearer rc-webhook") =>
    api().post("/api/v1/webhooks/revenuecat").set("authorization", auth).set("content-type", "application/json").send(event === null ? "{}" : JSON.stringify({ event }));
  const subscriber = (entitlements: Record<string, string>) =>
    json({ subscriber: { entitlements: Object.fromEntries(Object.entries(entitlements).map(([id, product]) => [id, { product_identifier: product, expires_date: new Date(Date.now() + 30 * DAY).toISOString(), purchase_date: "" }])), subscriptions: {} } });

  it("checks the auth header and body", async () => {
    expect((await send({ id: "e" }, "wrong")).status).toBe(401);
    expect((await api().post("/api/v1/webhooks/revenuecat").send({})).status).toBe(401);
    expect((await send(null)).status).toBe(400);
    const saved = env.revenuecat.webhookAuth;
    env.revenuecat.webhookAuth = "";
    expect((await send({ id: "e" })).status).toBe(401);
    env.revenuecat.webhookAuth = saved;
  });
  it("syncs providers and records paid store purchases", async () => {
    await seedPlans();
    const { provider } = await createOwner();
    mockFetch(subscriber({ provider_pro: "dnf_pro_monthly" }));
    expect((await send({ id: "t", type: "TEST", app_user_id: "x" })).body).toEqual({ ok: true });
    expect((await send({ id: "a1", type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:1" })).body).toEqual({ ok: true });
    const res = await send({
      id: "p1", type: "INITIAL_PURCHASE", app_user_id: `provider_${provider.id}`, aliases: ["$RCAnonymousID:1"], transferred_from: ["provider_999"], store: "APP_STORE",
      environment: "PRODUCTION", transaction_id: "tx1", price_in_purchased_currency: 599, currency: "INR", product_id: "dnf_pro_monthly",
    });
    expect(res.body).toEqual({ ok: true });
    const txn = await prisma.transaction.findFirstOrThrow();
    expect(txn).toMatchObject({ gateway: "app_store", gatewayPaymentId: "app_store:tx1", gatewayTxnId: "dnf_pro_monthly" });
    expect(txn.subscriptionId).not.toBeNull();
    // Sandbox, free and unknown-store events do not record payments.
    await send({ id: "p2", type: "RENEWAL", app_user_id: `provider_${provider.id}`, store: "PLAY_STORE", environment: "SANDBOX", transaction_id: "tx2", price_in_purchased_currency: 599 });
    await send({ id: "p3", type: "RENEWAL", app_user_id: `provider_${provider.id}`, store: "PLAY_STORE", transaction_id: "tx3", price_in_purchased_currency: 0 });
    await send({ id: "p4", type: "RENEWAL", app_user_id: `provider_${provider.id}`, store: "STRIPE", transaction_id: "tx4", price_in_purchased_currency: 1 });
    await send({ id: "p5", type: "RENEWAL", app_user_id: `provider_${provider.id}`, store: "PLAY_STORE", transaction_id: "tx5" });
    await send({ id: "p6", type: "EXPIRATION", app_user_id: `provider_${provider.id}`, store: "PLAY_STORE", transaction_id: "tx6", price_in_purchased_currency: 1 });
    expect(await prisma.transaction.count()).toBe(1);
    // A Play renewal while the live plan came from the App Store: recorded without a subscription link.
    await send({ id: "p7", type: "RENEWAL", app_user_id: `provider_${provider.id}`, store: "PLAY_STORE", transaction_id: "tx7", price_in_purchased_currency: 599 });
    expect((await prisma.transaction.findFirstOrThrow({ where: { gatewayPaymentId: "play_store:tx7" } })).subscriptionId).toBeNull();
    // Refund through support.
    await send({ id: "c1", type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", app_user_id: `provider_${provider.id}`, store: "APP_STORE", transaction_id: "tx1" });
    await send({ id: "c2", type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE", app_user_id: `provider_${provider.id}`, store: "APP_STORE", transaction_id: "tx1" });
    await send({ id: "c3", type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", app_user_id: `provider_${provider.id}` });
    expect((await prisma.transaction.findFirstOrThrow({ where: { gatewayPaymentId: "app_store:tx1" } })).status).toBe("refunded");
  });
  it("finds the provider through aliases when the app user id is anonymous", async () => {
    await seedPlans();
    const { provider } = await createOwner();
    mockFetch(subscriber({}));
    await send({ id: "x1", type: "RENEWAL", app_user_id: "$RCAnonymousID:9", original_app_user_id: `provider_${provider.id}`, store: "MAC_APP_STORE", transaction_id: "m1", price_in_purchased_currency: 10 });
    expect(await prisma.transaction.findFirstOrThrow()).toMatchObject({ gateway: "app_store", currency: "INR", subscriptionId: null });
    expect((await prisma.webhookEvent.findFirstOrThrow()).providerId).toBe(provider.id);
    // Provider ids that do not exist: nothing to sync, no provider.
    await send({ id: "x2", type: "RENEWAL", app_user_id: "$RCAnonymousID:9", aliases: ["provider_999"] });
    expect((await prisma.webhookEvent.findFirstOrThrow({ where: { eventId: "x2" } })).providerId).toBeNull();
  });
});
