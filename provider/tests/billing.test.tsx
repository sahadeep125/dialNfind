import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { inApp, json, lastBody, mockApi, pickOption, planState, renderApp } from "./helpers";

type Outcome = "pay" | "dismiss" | "fail" | "fail-silent";

/** A Razorpay Checkout stand-in that pays, is closed, or fails, as `outcome()` says. */
function stubRazorpay(outcome: () => Outcome) {
  const opened: Record<string, unknown>[] = [];
  class Checkout {
    private failed?: (r: { error: { description: string } }) => void;
    constructor(private options: { handler: (r: unknown) => void; modal: { ondismiss: () => void } } & Record<string, unknown>) {
      opened.push(options);
    }
    on(_event: string, cb: (r: { error: { description: string } }) => void) {
      this.failed = cb;
    }
    open() {
      const o = outcome();
      setTimeout(() => {
        if (o === "pay") this.options.handler({ razorpay_payment_id: "pay_1", razorpay_subscription_id: "sub_1", razorpay_signature: "sig" });
        else if (o === "dismiss") this.options.modal.ondismiss();
        else this.failed!({ error: { description: o === "fail" ? "Card declined" : "" } });
      }, 0);
    }
  }
  vi.stubGlobal("Razorpay", Checkout);
  return opened;
}

const plan = (code: "free" | "pro" | "business", over: Record<string, unknown> = {}) => ({
  id: code === "free" ? 1 : code === "pro" ? 2 : 3,
  code,
  name: code[0]!.toUpperCase() + code.slice(1),
  price: 0,
  leadAccessLimit: null,
  photoLimit: null,
  featuresJson: code === "free" ? null : [`${code} feature`],
  badge: null,
  prices:
    code === "free"
      ? []
      : [
          { billingCycle: "monthly", amount: code === "pro" ? 499 : 999, availableOnWeb: true },
          { billingCycle: "yearly", amount: code === "pro" ? 4990 : 9990, availableOnWeb: code === "pro" },
        ],
  ...over,
});

const sub = (over: Record<string, unknown> = {}) => ({
  id: 1,
  status: "active",
  source: "razorpay",
  billingCycle: "monthly",
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-10-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  graceUntil: null,
  ...over,
});

const billing = (over: Record<string, unknown> = {}) => ({
  state: planState("free"),
  plans: [plan("free"), plan("pro"), plan("business")],
  transactions: [],
  invoices: [],
  billingProfile: { billingName: "Sharma TV", billingAddress: null, billingStateCode: null, gstin: null },
  web: { enabled: true, keyId: "rzp_test" },
  managedIn: null,
  manageUrl: null,
  ...over,
});

const checkoutSession = { subscriptionId: "sub_1", keyId: "rzp_test", name: "DialNFind", description: "Pro", prefill: {}, notes: {} };

describe("subscription page", () => {
  it("buys a plan with Razorpay, and handles closing, failures and API errors", async () => {
    let outcome: Outcome = "dismiss";
    const opened = stubRazorpay(() => outcome);
    let checkoutFails = false;
    const fetch = mockApi({
      ...inApp(),
      "/provider/billing": billing(),
      "POST /provider/billing/razorpay/checkout": () => (checkoutFails ? json({ error: { message: "Payments are paused" } }, 503) : json(checkoutSession)),
      "POST /provider/billing/razorpay/verify": { ok: true },
    });
    await renderApp("/subscription");
    expect(await screen.findByText("Free forever. Upgrade any time.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
    expect(screen.getByText("Most popular")).toBeInTheDocument();
    expect(screen.getByText("3 of 10")).toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("No invoices yet.")).toBeInTheDocument();
    expect(screen.getByText("No payments yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel plan" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Get Pro" }));
    await waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0]).toMatchObject({ key: "rzp_test", subscription_id: "sub_1" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Get Pro" })).toBeEnabled());

    outcome = "fail";
    await userEvent.click(screen.getByRole("button", { name: "Get Pro" }));
    expect(await screen.findByText("Card declined")).toBeInTheDocument();
    outcome = "fail-silent";
    await userEvent.click(screen.getByRole("button", { name: "Get Pro" }));
    expect(await screen.findByText("The payment did not go through")).toBeInTheDocument();
    checkoutFails = true;
    await userEvent.click(screen.getByRole("button", { name: "Get Pro" }));
    expect(await screen.findByText("Payments are paused")).toBeInTheDocument();

    checkoutFails = false;
    outcome = "pay";
    await userEvent.click(screen.getByRole("radio", { name: /Yearly/ }));
    expect(screen.getByText("₹416 a month, billed yearly")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us to upgrade" })).toHaveAttribute("href", "/support");
    await userEvent.click(screen.getByRole("button", { name: "Get Pro" }));
    expect(await screen.findByText(/Welcome to Pro. Your invoice is below and on its way to ravi@example.com/)).toBeInTheDocument();
    expect(lastBody(fetch, "/razorpay/checkout")).toEqual({ planCode: "pro", billingCycle: "yearly" });
    expect(lastBody(fetch, "/razorpay/verify")).toEqual({ razorpay_payment_id: "pay_1", razorpay_subscription_id: "sub_1", razorpay_signature: "sig" });
  });

  it("switches plans on the web, cancels and resumes", async () => {
    let cancelled = false;
    let fail = true;
    const fetch = mockApi({
      ...inApp({}, { plan: planState("pro") }),
      "/provider/billing": () => json(billing({ state: planState("pro", { subscription: sub({ cancelAtPeriodEnd: cancelled }) }), managedIn: "web" })),
      "POST /provider/billing/change-plan": () => (fail ? json({ error: { message: "Cannot switch now" } }, 409) : json({ ok: true })),
      "POST /provider/billing/cancel": () => {
        if (fail) return json({ error: { message: "Cannot cancel" } }, 409);
        cancelled = true;
        return json({ ok: true });
      },
      "POST /provider/billing/resume": () => {
        if (fail) return json({ error: { message: "Cannot resume" } }, 409);
        cancelled = false;
        return json({ ok: true });
      },
    });
    await renderApp("/subscription");
    expect(await screen.findByText("Paid online · billed monthly · renews on 1 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Your plan")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("3 (unlimited)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Switch to Business" }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/new price of ₹999 per month/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Not now" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Switch to Business" }));
    dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Switch plan/ }));
    expect(await screen.findByText("Cannot switch now")).toBeInTheDocument();
    fail = false;
    await userEvent.click(within(dialog).getByRole("button", { name: /Switch plan/ }));
    expect(await screen.findByText("You are now on Business")).toBeInTheDocument();
    expect(lastBody(fetch, "/change-plan")).toEqual({ planCode: "business", billingCycle: "monthly" });

    fail = true;
    await userEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/stays active until 1 Oct 2026/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /^Cancel plan/ }));
    expect(await screen.findByText("Cannot cancel")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep Pro" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /^Cancel plan/ }));
    expect(await screen.findByText(/will not renew/)).toBeInTheDocument();
    expect(await screen.findByText("Does not renew")).toBeInTheDocument();
    expect(screen.getByText(/ends on 1 Oct 2026/)).toBeInTheDocument();

    fail = true;
    await userEvent.click(screen.getByRole("button", { name: /Keep my plan/ }));
    expect(await screen.findByText("Cannot resume")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Keep my plan/ }));
    expect(await screen.findByText("Your plan will renew as usual")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("describes store and support managed plans, history and invoices", async () => {
    mockApi({
      ...inApp(),
      "/provider/billing": billing({
        state: planState("pro", { subscription: sub({ status: "past_due", source: "app_store", billingCycle: "yearly", graceUntil: "2026-10-05T00:00:00.000Z" }), limits: { leads: { limit: 10, used: 14 }, photos: { limit: null, used: 4 } } }),
        managedIn: "app_store",
        manageUrl: "https://apps.apple.com/account/subscriptions",
        invoices: [
          { id: 1, number: "DNF-1", total: 590, taxable: 500, tax: 90, status: "issued", issuedAt: "2026-09-01T00:00:00.000Z", pdfUrl: "http://api.test/i/1.pdf" },
          { id: 2, number: "DNF-2", total: 590, taxable: 500, tax: 90, status: "void", issuedAt: "2026-09-02T00:00:00.000Z", pdfUrl: "http://api.test/i/2.pdf" },
        ],
        transactions: [
          { id: 1, type: "subscription", gateway: "razorpay", amount: 590, currency: "INR", status: "success", gatewayTxnId: null, invoiceNumber: "DNF-1", createdAt: "2026-09-01T00:00:00.000Z" },
          { id: 2, type: "sponsored_ad", gateway: "manual", amount: 1000, currency: "INR", status: "refunded", gatewayTxnId: null, invoiceNumber: null, createdAt: "2026-09-01T00:00:00.000Z" },
          { id: 3, type: "lead_fee", gateway: "app_store", amount: 4.99, currency: "USD", status: "failed", gatewayTxnId: null, invoiceNumber: null, createdAt: "2026-09-01T00:00:00.000Z" },
          { id: 4, type: "subscription", gateway: "play_store", amount: 499, currency: "INR", status: "success", gatewayTxnId: null, invoiceNumber: null, createdAt: "2026-09-01T00:00:00.000Z" },
        ],
      }),
    });
    await renderApp("/subscription");
    expect(await screen.findByText("Payment failed")).toBeInTheDocument();
    expect(screen.getByText(/Bought in the App Store · billed yearly · renews on/)).toBeInTheDocument();
    expect(screen.getByText(/keeps working until 5 Oct 2026 while it is retried/)).toBeInTheDocument();
    expect(screen.getByText("14, first 10 in full")).toBeInTheDocument();
    expect(screen.getByText("4 (unlimited)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage in App Store/ })).toHaveAttribute("href", "https://apps.apple.com/account/subscriptions");
    expect(screen.getByText(/This plan is billed by Apple/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Change in the app/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Current plan" })).not.toBeInTheDocument();
    expect(screen.getByText("Void")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /PDF/ })[0]).toHaveAttribute("href", "http://api.test/i/1.pdf");
    expect(screen.getByText("Sponsored campaign")).toBeInTheDocument();
    expect(screen.getByText("Lead fee")).toBeInTheDocument();
    expect(screen.getByText("refunded")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText("Paid to our team")).toBeInTheDocument();
    expect(screen.getByText("USD 4.99")).toBeInTheDocument();
    expect(screen.getAllByText("Store receipt")).toHaveLength(2);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows Google Play plans, admin plans and support-managed billing", async () => {
    mockApi({
      ...inApp(),
      "/provider/billing": billing({
        state: planState("business", { subscription: sub({ source: "play_store", status: "past_due", endDate: null }) }),
        managedIn: "play_store",
        manageUrl: "https://play.google.com/store/account/subscriptions",
      }),
    });
    const view = await renderApp("/subscription");
    expect(await screen.findByRole("link", { name: /Manage in Google Play/ })).toBeInTheDocument();
    expect(screen.getByText(/This plan is billed by Google/)).toBeInTheDocument();
    expect(screen.getByText("Bought on Google Play · billed monthly")).toBeInTheDocument();
    expect(screen.getByText("The last renewal payment failed.")).toBeInTheDocument();
    view.unmount();

    mockApi({
      ...inApp(),
      "/provider/billing": billing({ state: planState("pro", { subscription: sub({ source: "admin", status: "pending" }) }), managedIn: "support", web: { enabled: false, keyId: null } }),
    });
    await renderApp("/subscription");
    expect(await screen.findByText("Waiting for payment")).toBeInTheDocument();
    expect(screen.getByText(/Set up by the DialNFind team · billed monthly · ends on/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "/support");
    expect(screen.getByText(/Online payments are being set up/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Contact us to upgrade" })).toHaveLength(1);
  });

  it("labels ended and cancelled plans, and a yearly subscriber on the monthly view", async () => {
    mockApi({ ...inApp(), "/provider/billing": billing({ state: planState("pro", { subscription: sub({ status: "expired", billingCycle: "yearly" }) }), managedIn: "web" }) });
    const view = await renderApp("/subscription");
    expect(await screen.findByText("Ended")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to Pro" })).toBeInTheDocument();
    view.unmount();
    mockApi({ ...inApp(), "/provider/billing": billing({ state: planState("pro", { subscription: sub({ status: "cancelled", cancelAtPeriodEnd: true, endDate: null }) }), managedIn: "web" }) });
    await renderApp("/subscription");
    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Does not renew")).not.toBeInTheDocument();
  });

  it("names the end of the period when a cancel has no end date", async () => {
    mockApi({ ...inApp(), "/provider/billing": billing({ state: planState("pro", { subscription: sub({ endDate: null }) }), managedIn: "web" }) });
    await renderApp("/subscription");
    await userEvent.click(await screen.findByRole("button", { name: "Cancel plan" }));
    expect(await screen.findByText(/until the end of this period/)).toBeInTheDocument();
  });

  it("keeps a spinner on the plan being bought", async () => {
    stubRazorpay(() => "dismiss");
    let release!: () => void;
    mockApi({ ...inApp(), "/provider/billing": billing(), "POST /provider/billing/razorpay/checkout": () => new Promise<Response>((r) => (release = () => r(json(checkoutSession)))) });
    await renderApp("/subscription");
    await userEvent.click(await screen.findByRole("button", { name: "Get Business" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Get Business/ }).querySelector(".animate-spin")).not.toBeNull());
    expect(screen.getByRole("button", { name: /Get Pro/ }).querySelector(".animate-spin")).toBeNull();
    release();
    await waitFor(() => expect(screen.getByRole("button", { name: /Get Business/ })).toBeEnabled());
  });

  it("saves billing details with validation", async () => {
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "/provider/billing": billing({ billingProfile: { billingName: null, billingAddress: "1 Road, Mumbai", billingStateCode: "27", gstin: "27ABCDE1234F1Z5" } }),
      "PUT /provider/billing/profile": () => (fail ? json({ error: { message: "GSTIN not found" } }, 400) : json({ ok: true })),
    });
    await renderApp("/subscription");
    const save = await screen.findByRole("button", { name: /Save billing details/ });
    expect(save).toBeDisabled();
    expect(screen.getByLabelText(/GSTIN/)).toHaveValue("27ABCDE1234F1Z5");
    await userEvent.clear(screen.getByLabelText(/GSTIN/));
    await userEvent.type(screen.getByLabelText(/GSTIN/), "bad");
    await userEvent.click(save);
    expect(await screen.findByText("Enter the name for invoices")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid 15-character GSTIN, or leave it empty")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Name on invoice/), "Sharma TV Repair");
    await userEvent.clear(screen.getByLabelText(/GSTIN/));
    await userEvent.type(screen.getByLabelText(/GSTIN/), "19abcde1234f1z5");
    await userEvent.click(save);
    expect(await screen.findByText("The first two digits must match the state")).toBeInTheDocument();
    await pickOption(screen.getByRole("combobox", { name: /State/ }), "West Bengal");
    await userEvent.click(save);
    expect(await screen.findByText("GSTIN not found")).toBeInTheDocument();
    fail = false;
    await userEvent.clear(screen.getByLabelText(/GSTIN/));
    await userEvent.click(save);
    expect(await screen.findByText(/Billing details saved/)).toBeInTheDocument();
    expect(lastBody(fetch, "/billing/profile")).toEqual({ billingName: "Sharma TV Repair", billingAddress: "1 Road, Mumbai", billingStateCode: "19", gstin: null });
  });

  it("asks for the state and address on an empty profile", async () => {
    mockApi({ ...inApp(), "/provider/billing": billing({ billingProfile: { billingName: "X Y", billingAddress: null, billingStateCode: null, gstin: null } }) });
    await renderApp("/subscription");
    await userEvent.type(await screen.findByLabelText(/Billing address/), "1");
    await userEvent.click(screen.getByRole("button", { name: /Save billing details/ }));
    expect(await screen.findByText("Enter the billing address")).toBeInTheDocument();
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain(" Choose a state");
  });
});

const campaign = (over: Record<string, unknown> = {}) => ({
  id: 1,
  status: "active",
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2099-01-01T00:00:00.000Z",
  budget: 2000,
  amountSpent: 500,
  impressions: 12000,
  clicks: 40,
  ctrPct: 0.3,
  targetLocation: "Mumbai",
  category: { id: 1, name: "Electronics Repair" },
  ...over,
});

const promote = (over: Record<string, unknown> = {}) => ({
  locked: false,
  listings: [],
  categories: [
    { id: 1, name: "Electronics Repair" },
    { id: 2, name: "Plumbing" },
  ],
  pricing: { costPerClick: 10, minBudget: 500, city: "Mumbai", gstRate: 18 },
  checkoutEnabled: true,
  ...over,
});

const orderSession = { orderId: "order_1", keyId: "rzp_test", amount: 1770, currency: "INR", name: "DialNFind", description: "Campaign", prefill: {} };

describe("promote page", () => {
  it("validates the budget and pays online", async () => {
    let outcome: Outcome = "dismiss";
    const opened = stubRazorpay(() => outcome);
    let checkout: Response | (() => Response) = () => json(orderSession);
    const fetch = mockApi({
      ...inApp(),
      "/provider/sponsored": promote(),
      "POST /provider/sponsored/checkout": () => (typeof checkout === "function" ? checkout() : checkout.clone()),
      "POST /provider/sponsored/verify": { ok: true },
    });
    await renderApp("/promote");
    expect(await screen.findByText("No campaigns yet")).toBeInTheDocument();
    expect(screen.getByText(/Pay online and your campaign starts straight away/)).toBeInTheDocument();
    expect(screen.getByText(/Start a campaign to reach more customers/)).toBeInTheDocument();
    const budget = screen.getByLabelText(/Budget/);
    expect(screen.getByText(/up to 150 customer contacts/)).toBeInTheDocument();
    expect(screen.getByText("₹1,770")).toBeInTheDocument();

    await userEvent.clear(budget);
    expect(screen.getByText(/up to 0 customer contacts/)).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByText("Enter a budget")).toBeInTheDocument();
    await userEvent.type(budget, "1a00");
    expect(budget).toHaveValue("100");
    expect(screen.queryByText("Enter a budget")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Pay and start/ }));
    expect(screen.getByText("The minimum budget is ₹500")).toBeInTheDocument();
    await userEvent.clear(budget);
    await userEvent.type(budget, "20000000");
    expect(budget).toHaveValue("2000000");
    await userEvent.click(screen.getByRole("button", { name: /Pay and start/ }));
    expect(screen.getByText("Keep the budget under Rs 10,00,000")).toBeInTheDocument();
    await userEvent.clear(budget);
    await userEvent.type(budget, "1500");

    await pickOption(screen.getByRole("combobox"), "Plumbing");
    await userEvent.click(screen.getByRole("button", { name: "30 days" }));
    await userEvent.click(screen.getByRole("button", { name: /Pay and start/ }));
    await waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0]).toMatchObject({ order_id: "order_1", amount: 177000 });
    expect(lastBody(fetch, "/sponsored/checkout")).toEqual({ categoryId: 2, days: 30, budget: 1500 });
    await waitFor(() => expect(screen.getByRole("button", { name: /Pay and start/ })).toBeEnabled());

    outcome = "fail";
    await userEvent.click(screen.getByRole("button", { name: /Pay and start/ }));
    expect(await screen.findByText("Card declined")).toBeInTheDocument();

    checkout = json({ error: { message: "Add billing", code: "billing_details_required" } }, 400);
    await userEvent.click(screen.getByRole("button", { name: /Pay and start/ }));
    expect(await screen.findByText(/Add your billing details first/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add details" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/subscription"));
  });

  it("finishes an online payment", async () => {
    stubRazorpay(() => "pay");
    const fetch = mockApi({ ...inApp(), "/provider/sponsored": promote(), "POST /provider/sponsored/checkout": orderSession, "POST /provider/sponsored/verify": { ok: true } });
    await renderApp("/promote");
    await userEvent.click(await screen.findByRole("button", { name: /Pay and start/ }));
    expect(await screen.findByText("Payment received. Your campaign is live.")).toBeInTheDocument();
    expect(lastBody(fetch, "/sponsored/verify")).toMatchObject({ razorpay_payment_id: "pay_1" });
    expect(lastBody(fetch, "/sponsored/checkout")).toEqual({ categoryId: 1, days: 14, budget: 1500 });
  });

  it("reports other checkout errors", async () => {
    mockApi({ ...inApp(), "/provider/sponsored": promote(), "POST /provider/sponsored/checkout": json({ error: { message: "Try later" } }, 503) });
    await renderApp("/promote");
    await userEvent.click(await screen.findByRole("button", { name: /Pay and start/ }));
    expect(await screen.findByText("Try later")).toBeInTheDocument();
  });

  it("asks the team to set up a campaign, online or not", async () => {
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "/provider/sponsored": promote(),
      "POST /provider/sponsored/request": () => (fail ? json({ error: { message: "Request failed" } }, 500) : json({ ticket: { id: 9, reference: "SUP-9" } })),
      "/support/tickets/9": { ticket: { id: 9, reference: "SUP-9", subject: "Promotion", category: "billing", status: "open", lastActivityAt: "2026-09-01T00:00:00.000Z", createdAt: "2026-09-01T00:00:00.000Z" }, messages: [] },
    });
    await renderApp("/promote");
    const ask = await screen.findByRole("button", { name: /Or ask our team/ });
    await userEvent.clear(screen.getByLabelText(/Budget/));
    await userEvent.click(ask);
    expect(screen.getByText("Enter a budget")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Budget/), "900");
    await userEvent.click(ask);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
    fail = false;
    await userEvent.click(ask);
    expect(await screen.findByText(/Request sent \(SUP-9\)/)).toBeInTheDocument();
    expect(lastBody(fetch, "/sponsored/request")).toEqual({ categoryId: 1, days: 14, budget: 900 });
    await userEvent.click(screen.getByRole("button", { name: "View" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/support/9"));
  });

  it("requests campaigns when online payment is off", async () => {
    const fetch = mockApi({ ...inApp(), "/provider/sponsored": promote({ checkoutEnabled: false }), "POST /provider/sponsored/request": { ticket: { id: 9, reference: "SUP-9" } } });
    await renderApp("/promote");
    expect(await screen.findByText("Request a campaign")).toBeInTheDocument();
    expect(screen.getByText(/Request a campaign and our team will set it up/)).toBeInTheDocument();
    expect(screen.getByText(/Request a campaign to reach more customers/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Request campaign/ }));
    await waitFor(() => expect(lastBody(fetch, "/sponsored/request")).toEqual({ categoryId: 1, days: 14, budget: 1500 }));
  });

  it("lists campaigns and pauses or resumes them", async () => {
    let fail = false;
    const fetch = mockApi({
      ...inApp(),
      "/provider/sponsored": promote({
        listings: [
          campaign(),
          campaign({ id: 2, status: "paused", ctrPct: null, targetLocation: null, budget: 0, amountSpent: 0 }),
          campaign({ id: 3, status: "completed" }),
          campaign({ id: 4, endDate: "2020-01-01T00:00:00.000Z" }),
        ],
      }),
      "PATCH /provider/sponsored/1": () => (fail ? json({ error: { message: "Toggle failed" } }, 500) : json({ ok: true })),
      "PATCH /provider/sponsored/2": { ok: true },
    });
    await renderApp("/promote");
    expect(await screen.findByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getAllByText("Ended")).toHaveLength(2);
    expect(screen.getAllByText("0.3% of views")).toHaveLength(3);
    expect(screen.getAllByText(/ · Mumbai/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /Pause/ }));
    await waitFor(() => expect(lastBody(fetch, "/sponsored/1")).toEqual({ status: "paused" }));
    await userEvent.click(screen.getByRole("button", { name: /Resume/ }));
    await waitFor(() => expect(lastBody(fetch, "/sponsored/2")).toEqual({ status: "active" }));
    fail = true;
    await userEvent.click(screen.getByRole("button", { name: /Pause/ }));
    expect(await screen.findByText("Toggle failed")).toBeInTheDocument();
  });

  it("locks new campaigns without the Business plan and hides Resume on paused ones", async () => {
    mockApi({ ...inApp(), "/provider/sponsored": promote({ locked: true, listings: [campaign({ status: "paused" }), campaign({ id: 2 })] }) });
    await renderApp("/promote");
    expect(await screen.findByText("Promote your listing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Resume/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pause/ })).toBeInTheDocument();
  });

  it("asks for a service before a campaign", async () => {
    mockApi({ ...inApp(), "/provider/sponsored": promote({ categories: [] }) });
    await renderApp("/promote");
    expect(await screen.findByText(/Add a service first/)).toBeInTheDocument();
  });

  it("types a budget with the keyboard only", async () => {
    mockApi({ ...inApp(), "/provider/sponsored": promote() });
    await renderApp("/promote");
    fireEvent.change(await screen.findByLabelText(/Budget/), { target: { value: "" } });
    expect(screen.getByText("₹0")).toBeInTheDocument();
  });
});
