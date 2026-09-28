import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ApiError, UPGRADE_EVENT } from "@/lib/api";
import { EmptyState, PageSkeleton, Pager, SaveBar, Stars } from "@/components/common";
import { FeatureGate, LockedCard } from "@/components/plan";
import { PageHeader, Panel } from "@/components/page-header";
import { Logo } from "@/components/logo";
import { json, mockApi, newQueryClient, planState, profile, renderApp, renderWith, signedIn } from "./helpers";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const where = () => screen.getByTestId("where").textContent;

const dashboard = (over: Record<string, unknown> = {}) => ({
  provider: { businessName: "Sharma TV Repair", avgRating: 4.25, totalReviews: 8, profileCompletenessPct: 60, verificationStatus: "partial", responseSignal: null, favorites: 2, city: "Mumbai", status: "active" },
  analyticsLocked: false,
  totals: { leads: 1200, calls: 1000, whatsapp: 200, views: 5000, impressions: 12000, leadsChangePct: 12, viewsChangePct: -4, conversionPct: 24, unrepliedReviews: 2 },
  ranking: { position: 3, outOf: 40 },
  series: [{ date: "2026-09-01", calls: 2, whatsapp: 1, views: 30, impressions: 90 }],
  checklist: [
    { key: "logo", label: "Upload a logo", done: false },
    { key: "mystery", label: "Something new", done: false },
    { key: "hours", label: "Set your working hours", done: true },
  ],
  recentLeads: [
    { id: 1, channel: "call", createdAt: "2026-09-27T10:00:00.000Z", customerName: "Asha", service: "TV Repair", locked: false },
    { id: 2, channel: "whatsapp", createdAt: "2026-09-27T10:00:00.000Z", customerName: "Hidden customer", service: null, locked: true },
  ],
  recentReviews: [
    { id: 1, rating: 5, reviewText: "Great", providerReply: null, createdAt: "2026-09-01T00:00:00.000Z", author: "Meena" },
    { id: 2, rating: 4, reviewText: "Good", providerReply: "Thanks", createdAt: "2026-09-01T00:00:00.000Z", author: "Raj" },
  ],
  subscription: null,
  ...over,
});

/** Routes a signed-in provider needs for any page inside the app layout. */
const shell = (u: Record<string, unknown> = {}, me: Record<string, unknown> = {}) => ({
  ...signedIn(u, me),
  "/provider/profile": { provider: profile() },
  "/me/notifications": { notifications: [], unread: 0 },
  "/provider/dashboard": dashboard(),
});

describe("routing guards", () => {
  it("sends signed-out visitors to login with the page they wanted", async () => {
    await renderApp("/leads?page=2");
    expect(where()).toBe("/login?next=%2Fleads%3Fpage%3D2");
  });

  it("shows a loader while the session loads, then the dashboard", async () => {
    let release!: () => void;
    const routes = shell();
    mockApi({ ...routes, "/auth/me": () => new Promise<Response>((r) => (release = () => r(json(routes["/auth/me"])))) });
    await renderApp("/");
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    await act(async () => release());
    expect(await screen.findByText("Good to see you")).toBeInTheDocument();
  });

  it("shows the unreachable screen when the API is down, and retries", async () => {
    const routes = shell();
    let down = true;
    mockApi({ ...routes, "/auth/me": () => (down ? json({ error: { message: "Down" } }, 503) : json(routes["/auth/me"])) });
    await renderApp("/");
    expect(await screen.findByText("We could not reach DialNFind")).toBeInTheDocument();
    down = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Good to see you")).toBeInTheDocument();
  });

  it("treats a 401 from the session check as signed out", async () => {
    mockApi({ ...shell(), "/auth/me": json({ error: { message: "No" } }, 401) });
    await renderApp("/");
    await waitFor(() => expect(where()).toMatch(/^\/login/));
  });

  it("sends unverified accounts to verify their email", async () => {
    mockApi({ ...shell({ emailVerifiedAt: null }), "/auth/verify-email/resend": { ok: true } });
    await renderApp("/");
    await waitFor(() => expect(where()).toBe("/verify-email"));
  });

  it("sends accounts without a business to the start page", async () => {
    mockApi(shell({}, { provider: null, plan: null }));
    await renderApp("/leads");
    await waitFor(() => expect(where()).toBe("/start"));
    expect(screen.getByText(/Welcome, Ravi/)).toBeInTheDocument();
  });

  it("keeps public-only pages away from signed-in users, and shows loader and outage states there too", async () => {
    mockApi(shell());
    await renderApp("/login");
    await waitFor(() => expect(where()).toBe("/"));
  });

  it("shows the loader and the outage screen on public-only pages", async () => {
    let release!: () => void;
    mockApi({ ...shell(), "/auth/me": () => new Promise<Response>((r) => (release = () => r(json({ error: { message: "Down" } }, 500)))) });
    await renderApp("/register");
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    await act(async () => release());
    expect(await screen.findByText("We could not reach DialNFind")).toBeInTheDocument();
  });

  it("shows a not-found page for unknown paths", async () => {
    mockApi(shell());
    await renderApp("/nope");
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Go to the dashboard" }));
    expect(where()).toBe("/");
  });
});

describe("onboarding layout and start page", () => {
  it("lists pending claims and logs out", async () => {
    const claims = [
      { id: 1, status: "pending", method: "document", provider: { id: 9, businessName: "Old Shop", city: "Pune" } },
      { id: 2, status: "pending", method: "otp", provider: { id: 10, businessName: "Other Shop", city: "Goa" } },
      { id: 3, status: "rejected", method: "otp", provider: { id: 11, businessName: "Gone Shop", city: "Goa" } },
    ];
    const fetch = mockApi({ ...shell({}, { provider: null, plan: null, claims }), "POST /auth/logout": { ok: true } });
    await renderApp("/start");
    expect(await screen.findByText("Claim in progress")).toBeInTheDocument();
    expect(screen.getByText(/Old Shop, Pune. Our team is reviewing/)).toBeInTheDocument();
    expect(screen.getByText(/Other Shop, Goa. Enter the code/)).toBeInTheDocument();
    expect(screen.queryByText(/Gone Shop/)).not.toBeInTheDocument();
    expect(screen.getByText("ravi@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Log out/ }));
    await waitFor(() => expect(where()).toMatch(/^\/login/));
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith("/auth/logout"))).toBe(true);
  });

  it("sends accounts that already have a business to the dashboard", async () => {
    mockApi(shell());
    await renderApp("/start");
    await waitFor(() => expect(where()).toBe("/"));
  });

  it("shows no claim box when there are no pending claims", async () => {
    mockApi(shell({}, { provider: null, plan: null }));
    await renderApp("/start");
    await screen.findByText(/Welcome, Ravi/);
    expect(screen.queryByText("Claim in progress")).not.toBeInTheDocument();
  });
});

describe("app layout", () => {
  it("shows the business, plan chip, availability and a locked Promote item", async () => {
    mockApi({
      ...shell({}, { provider: { ...signedIn()["/provider/me"].provider, status: "pending" } }),
      "/provider/dashboard": dashboard({ provider: { ...dashboard().provider, status: "pending" } }),
    });
    await renderApp("/");
    expect(await screen.findByText("Available for work")).toBeInTheDocument();
    expect(screen.getAllByText("Sharma TV Repair").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Needs an upgrade").length).toBe(1);
    const chip = screen.getByTitle("Free plan");
    expect(chip).toHaveTextContent("Free· Upgrade");
    expect(screen.getByRole("link", { name: /View public profile/ })).toHaveAttribute("href", "http://web.test/providers/sharma-tv");
    expect(screen.getByText(/waiting for approval. It will appear/)).toBeInTheDocument();
  });

  it("shows a paid chip with its source and unlocks Promote on Business", async () => {
    const sub = { status: "active", source: "razorpay", cancelAtPeriodEnd: false, endDate: null, graceUntil: null };
    mockApi(shell({}, { plan: planState("business", { subscription: sub }) }));
    await renderApp("/");
    const chip = await screen.findByTitle("Business, paid online");
    expect(chip).not.toHaveTextContent("Upgrade");
    expect(screen.queryByLabelText("Needs an upgrade")).not.toBeInTheDocument();
  });

  it("toggles availability both ways and reports failures", async () => {
    let available = true;
    let fail = false;
    const fetch = mockApi({
      ...shell(),
      "/provider/profile": (_u: URL, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          if (fail) return json({ error: { message: "Could not save" } }, 500);
          available = JSON.parse(String(init.body)).isAvailable;
          return json({ ok: true });
        }
        return json({ provider: profile({ isAvailable: available }) });
      },
    });
    await renderApp("/");
    await userEvent.click(await screen.findByRole("switch"));
    expect(await screen.findByText(/Marked as unavailable/)).toBeInTheDocument();
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(await screen.findByText("You are visible as available")).toBeInTheDocument();
    fail = true;
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeDisabled());
    await userEvent.click(screen.getByRole("switch"));
    expect(await screen.findByText("Could not save")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalled();
  });

  it("opens the mobile menu and closes it on navigation", async () => {
    mockApi({ ...shell(), "/provider/leads": { leads: [], total: 0, page: 1, totalPages: 1, locked: 0 } });
    await renderApp("/");
    await screen.findByText("Good to see you");
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("link", { name: /Leads/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(where()).toBe("/leads");
  });

  it("has an account menu with links and log out", async () => {
    mockApi({ ...shell(), "POST /auth/logout": json({ error: { message: "x" } }, 500) });
    await renderApp("/");
    await screen.findByText("Good to see you");
    const trigger = screen.getByText("RK");
    await userEvent.click(trigger);
    expect(await screen.findByRole("menuitem", { name: /Account settings/ })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: /Help and support/ })).toHaveAttribute("href", "/support");
    await userEvent.click(screen.getByRole("menuitem", { name: /Log out/ }));
    await waitFor(() => expect(where()).toMatch(/^\/login/));
  });

  it("opens the upgrade dialog for a 402 with a known feature, and goes to the plans", async () => {
    mockApi(shell());
    await renderApp("/");
    await screen.findByText("Good to see you");
    act(() => {
      window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { entitlement: "provider_business", feature: "promote", message: "Business only" } }));
    });
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Promote your listing")).toBeInTheDocument();
    expect(within(dialog).getByText("Business only")).toBeInTheDocument();
    expect(within(dialog).getByText(/sponsored campaigns/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "See Business" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(where()).toBe("/subscription");
  });

  it("opens the upgrade dialog for an unknown feature and can be dismissed", async () => {
    mockApi(shell());
    await renderApp("/");
    await screen.findByText("Good to see you");
    act(() => {
      window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { feature: "mystery", message: "Upgrade needed" } }));
    });
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Upgrade to Pro")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Not now" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    act(() => {
      window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { feature: "mystery", message: "Again" } }));
    });
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("notifications", () => {
  it("shows an empty list and does not mark anything read", async () => {
    const fetch = mockApi(shell());
    await renderApp("/");
    await screen.findByText("Good to see you");
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You are all caught up.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(fetch.mock.calls.some(([u]) => String(u).includes("/notifications/read"))).toBe(false);
  });

  it("lists notifications, links support ones, and marks all read", async () => {
    let unread = 12;
    const notifications = [
      { id: 1, type: "support", title: "Ticket answered", body: "See reply", isRead: false, createdAt: "2026-09-27T00:00:00.000Z", dataJson: { ticketId: 5 } },
      { id: 2, type: "lead", title: "New lead", body: "Asha called", isRead: true, createdAt: "2026-09-27T00:00:00.000Z" },
      { id: 3, type: "weird", title: "Other", body: "Hmm", isRead: true, createdAt: "2026-09-27T00:00:00.000Z", dataJson: null },
      { id: 4, type: "support", title: "Support note", body: "No ticket", isRead: true, createdAt: "2026-09-27T00:00:00.000Z", dataJson: {} },
    ];
    const fetch = mockApi({
      ...shell(),
      "/me/notifications": () => json({ notifications, unread }),
      "POST /me/notifications/read": () => {
        unread = 0;
        return json({ ok: true });
      },
    });
    await renderApp("/");
    const bell = await screen.findByRole("button", { name: "12 unread notifications" });
    expect(bell).toHaveTextContent("9+");
    await userEvent.click(bell);
    expect(await screen.findByRole("link", { name: /Ticket answered/ })).toHaveAttribute("href", "/support/5");
    expect(screen.queryByRole("link", { name: /Support note/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument());
    expect(fetch.mock.calls.filter(([u]) => String(u).includes("/notifications/read"))).toHaveLength(1);
  });

  it("marks notifications read when the popover closes with unread ones", async () => {
    let unread = 2;
    const fetch = mockApi({
      ...shell(),
      "/me/notifications": () => json({ notifications: [{ id: 1, type: "review", title: "Review", body: "5 stars", isRead: false, createdAt: "2026-09-27T00:00:00.000Z" }], unread }),
      "POST /me/notifications/read": () => {
        unread = 0;
        return json({ ok: true });
      },
    });
    await renderApp("/");
    const bell = await screen.findByRole("button", { name: "2 unread notifications" });
    expect(bell).toHaveTextContent("2");
    await userEvent.click(bell);
    await screen.findByText("5 stars");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(fetch.mock.calls.some(([u]) => String(u).includes("/notifications/read"))).toBe(true));
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});

describe("dashboard", () => {
  it("shows KPIs, ranking, checklist, recent leads and reviews on a paid plan", async () => {
    const sub = { status: "active", source: "razorpay", cancelAtPeriodEnd: false, endDate: "2026-10-28T00:00:00.000Z", graceUntil: null };
    const fetch = mockApi(shell({}, { plan: planState("pro", { subscription: sub }) }));
    await renderApp("/");
    expect(await screen.findByText("Good to see you")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("4%")).toBeInTheDocument();
    expect(screen.getByText("24%")).toBeInTheDocument();
    expect(screen.getByText("4.3")).toBeInTheDocument();
    expect(screen.getByText("12,000 search impressions")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Something new" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Upload a logo" })).toHaveAttribute("href", "/profile");
    expect(screen.queryByText("Set your working hours")).not.toBeInTheDocument();
    expect(screen.getByText("Tapped Call · TV Repair")).toBeInTheDocument();
    expect(screen.getByText("Opened WhatsApp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hidden customer/ })).toHaveAttribute("href", "/subscription");
    expect(screen.getByText("2 need a reply")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Reply" })).toHaveLength(1);
    expect(screen.getByText(/Renews on/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage plan" })).toBeInTheDocument();
    expect(screen.getByText("Leads and profile views")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "7 days" }));
    await waitFor(() => expect(fetch.mock.calls.some(([u]) => String(u).includes("days=7"))).toBe(true));
  });

  it("locks analytics and handles empty data on Free", async () => {
    mockApi({
      ...shell({}, { plan: planState("free", { limits: { leads: { limit: 10, used: 12 }, photos: { limit: 3, used: 0 } } }) }),
      "/provider/dashboard": dashboard({
        analyticsLocked: true,
        provider: { ...dashboard().provider, totalReviews: 0, profileCompletenessPct: 90 },
        totals: { ...dashboard().totals, views: null, impressions: null, viewsChangePct: null, leadsChangePct: null, conversionPct: null, unrepliedReviews: 0 },
        ranking: null,
        checklist: [
          { key: "hours", label: "Set your working hours", done: true },
          { key: "verification", label: "Verify", done: true },
        ],
        recentLeads: [],
        recentReviews: [],
      }),
    });
    await renderApp("/");
    expect(await screen.findByText("Upgrade to see who views you")).toBeInTheDocument();
    expect(screen.getAllByText("Unlock with Pro").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("See who is looking at your business")).toBeInTheDocument();
    expect(screen.getByText("See where you rank")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set your working hours" })).toHaveAttribute("href", "/hours");
    expect(screen.getByRole("link", { name: "Verify" })).toHaveAttribute("href", "/verification");
    expect(screen.getByText("No leads yet. Complete your profile to rank higher.")).toBeInTheDocument();
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText(/10 of 10 leads used this month. Upgrade/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upgrade" })).toBeInTheDocument();
    expect(screen.getByText("You have used all 10 free leads this month")).toBeInTheDocument();
    expect(screen.getByText(/details stay hidden/)).toBeInTheDocument();
  });

  it("shows a dash for a missing conversion rate and unlimited plans without an end date", async () => {
    mockApi({
      ...shell({}, { plan: planState("pro") }),
      "/provider/dashboard": dashboard({ totals: { ...dashboard().totals, conversionPct: null, leadsChangePct: 0 } }),
    });
    await renderApp("/");
    expect(await screen.findByText("Unlimited leads and profile analytics.")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows the ending date when the plan is cancelled", async () => {
    const sub = { status: "active", source: "admin", cancelAtPeriodEnd: true, endDate: "2026-10-28T00:00:00.000Z", graceUntil: null };
    mockApi(shell({}, { plan: planState("pro", { subscription: sub }) }));
    await renderApp("/");
    expect(await screen.findByText(/^Ends on/)).toBeInTheDocument();
    expect(screen.getByText(/Pro ends on/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Keep Pro" })).toBeInTheDocument();
  });
});

describe("plan banner", () => {
  const withPlan = async (plan: ReturnType<typeof planState>) => {
    mockApi(shell({}, { plan }));
    await renderApp("/");
    await screen.findByText("Good to see you");
  };

  it("warns about a failed payment with a grace date", async () => {
    await withPlan(planState("pro", { subscription: { status: "past_due", source: "razorpay", cancelAtPeriodEnd: false, endDate: null, graceUntil: "2026-10-05T00:00:00.000Z" } }));
    expect(screen.getByText("Your last payment did not go through")).toBeInTheDocument();
    expect(screen.getByText(/until 5 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Check the card or UPI mandate/)).toBeInTheDocument();
  });

  it("points store subscribers to the store and has no grace date", async () => {
    await withPlan(planState("pro", { subscription: { status: "past_due", source: "app_store", cancelAtPeriodEnd: false, endDate: null, graceUntil: null } }));
    expect(screen.getByText(/for a few days/)).toBeInTheDocument();
    expect(screen.getByText(/Update your payment method in the store/)).toBeInTheDocument();
  });

  it("points Play Store subscribers to the store too", async () => {
    await withPlan(planState("pro", { subscription: { status: "past_due", source: "play_store", cancelAtPeriodEnd: false, endDate: null, graceUntil: null } }));
    expect(screen.getByText(/Update your payment method in the store/)).toBeInTheDocument();
  });

  it("shows nothing for a cancelled plan without an end date on a paid plan", async () => {
    await withPlan(planState("pro", { subscription: { status: "active", source: "play_store", cancelAtPeriodEnd: true, endDate: null, graceUntil: null } }));
    expect(screen.queryByText(/ends on/)).not.toBeInTheDocument();
    expect(screen.queryByText("You are on the Free plan")).not.toBeInTheDocument();
  });

  it("prompts Free plans below the limit", async () => {
    await withPlan(planState("free"));
    expect(screen.getByText("You are on the Free plan")).toBeInTheDocument();
    expect(screen.getByText("3 of 10 leads used this month.")).toBeInTheDocument();
    expect(screen.getByText(/Pro unlocks unlimited leads/)).toBeInTheDocument();
  });

  it("prompts Free plans without a lead limit", async () => {
    await withPlan(planState("free", { limits: { leads: { limit: null, used: 3 }, photos: { limit: null, used: 0 } } }));
    expect(screen.getByText("You are on the Free plan")).toBeInTheDocument();
    expect(screen.queryByText(/leads used this month\./)).not.toBeInTheDocument();
  });

  it("falls back to the Free plan when the provider has no plan yet", async () => {
    await withPlan(null as unknown as ReturnType<typeof planState>);
    expect(screen.getByText("You are on the Free plan")).toBeInTheDocument();
  });
});

describe("small components", () => {
  it("FeatureGate shows children when entitled and a locked card otherwise", async () => {
    mockApi(signedIn({}, { plan: planState("pro") }));
    renderWith(
      <>
        <FeatureGate feature="analytics">
          <div>secret stats</div>
        </FeatureGate>
        <FeatureGate feature="promote" className="x">
          <div>promo</div>
        </FeatureGate>
        <LockedCard feature="photos" compact />
      </>,
    );
    expect(await screen.findByText("secret stats")).toBeInTheDocument();
    expect(screen.queryByText("promo")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upgrade to Business" })).toBeInTheDocument();
    expect(screen.getByText("Show more of your work")).toBeInTheDocument();
    expect(screen.queryByText(/Free listings show 3 photos/)).not.toBeInTheDocument();
  });

  it("Pager, SaveBar, Stars, EmptyState, PageHeader, Panel and Logo render their states", async () => {
    const onPage = vi.fn();
    const onSave = vi.fn();
    const onReset = vi.fn();
    const Icon = () => <svg />;
    const { rerender } = render(
      <div>
        <Pager page={1} totalPages={1} onPage={onPage} />
        <Pager page={2} totalPages={3} onPage={onPage} />
        <SaveBar dirty saving={false} onSave={onSave} onReset={onReset} />
        <Stars rating={3.6} className="s" />
        <EmptyState icon={Icon} title="Nothing" text="Empty here">
          <button type="button">Act</button>
        </EmptyState>
        <EmptyState icon={Icon} title="Bare" text="No children" />
        <PageHeader title="Title" description="Desc" actions={<button type="button">Do</button>} />
        <PageHeader title="Only title" />
        <Panel title="Panel" description="Pd" actions={<span>pa</span>}>
          body
        </Panel>
        <Panel>untitled</Panel>
      </div>,
    );
    expect(screen.getAllByText(/Page \d of \d/)).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /Previous/ }));
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(onPage.mock.calls).toEqual([[1], [3]]);
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    await userEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    expect(onReset).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
    expect(screen.getByLabelText("3.6 out of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
    expect(screen.getByText("Only title")).toBeInTheDocument();
    expect(screen.getByText("untitled")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SaveBar dirty={false} saving onSave={onSave} />
        <Logo />
        <Logo light className="c" />
      </MemoryRouter>,
    );
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save changes/ })).toBeDisabled();
  });

  it("PageSkeleton shows a skeleton while loading and a retry after a failure", async () => {
    const qc = newQueryClient();
    let fail = true;
    // A short delay, as with a real request, so the page sees the query fetching before it fails.
    const tick = () => new Promise((r) => setTimeout(r, 20));
    const fn = vi.fn(async () => {
      await tick();
      if (fail) throw new ApiError(500, "Server said no");
      return 1;
    });
    const plain = vi.fn(async () => {
      await tick();
      throw "boom";
    });
    function Page({ k, f }: { k: string; f: () => Promise<number> }) {
      const q = useQuery({ queryKey: [k], queryFn: f });
      return q.data ? <div>loaded</div> : <PageSkeleton />;
    }
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <Page k="a" f={fn} />
      </QueryClientProvider>,
    );
    expect(document.querySelector('[data-slot="skeleton"], .animate-pulse')).toBeInTheDocument();
    expect(await screen.findByText("Server said no")).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("loaded")).toBeInTheDocument();
    unmount();

    render(
      <QueryClientProvider client={newQueryClient()}>
        <Page k="b" f={plain} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Check your connection and try again.")).toBeInTheDocument();
  });
});
