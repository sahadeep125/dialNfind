import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { EmptyState, PageSkeleton, Pager, SaveBar, Stars } from "@/components/common";
import { PageHeader, Panel } from "@/components/page-header";
import { Logo, LogoMark } from "@/components/logo";
import { json, mockApi, newQueryClient, profile, renderApp, signedIn } from "./helpers";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const where = () => screen.getByTestId("where").textContent;

const dashboard = (over: Record<string, unknown> = {}) => ({
  provider: { businessName: "Sharma TV Repair", avgRating: 4.25, totalReviews: 8, profileCompletenessPct: 60, verificationStatus: "partial", responseSignal: null, favorites: 2, city: "Mumbai", status: "active" },
  totals: { leads: 1200, calls: 1000, whatsapp: 200, views: 5000, impressions: 12000, leadsChangePct: 12, viewsChangePct: -4, conversionPct: 24, unrepliedReviews: 2 },
  ranking: { position: 3, outOf: 40 },
  series: [{ date: "2026-09-01", calls: 2, whatsapp: 1, views: 30, impressions: 90 }],
  checklist: [
    { key: "logo", label: "Upload a logo", done: false },
    { key: "mystery", label: "Something new", done: false },
    { key: "hours", label: "Set your working hours", done: true },
  ],
  recentLeads: [
    { id: 1, channel: "call", createdAt: "2026-09-27T10:00:00.000Z", customerName: "Asha", service: "TV Repair" },
    { id: 2, channel: "whatsapp", createdAt: "2026-09-27T10:00:00.000Z", customerName: "Hidden customer", service: null },
  ],
  recentReviews: [
    { id: 1, rating: 5, reviewText: "Great", providerReply: null, createdAt: "2026-09-01T00:00:00.000Z", author: "Meena" },
    { id: 2, rating: 4, reviewText: "Good", providerReply: "Thanks", createdAt: "2026-09-01T00:00:00.000Z", author: "Raj" },
  ],
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
    expect(await screen.findByText("We could not reach KaajVa")).toBeInTheDocument();
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
    mockApi(shell({}, { provider: null }));
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
    expect(await screen.findByText("We could not reach KaajVa")).toBeInTheDocument();
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
    const fetch = mockApi({ ...shell({}, { provider: null, claims }), "POST /auth/logout": { ok: true } });
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
    mockApi(shell({}, { provider: null }));
    await renderApp("/start");
    await screen.findByText(/Welcome, Ravi/);
    expect(screen.queryByText("Claim in progress")).not.toBeInTheDocument();
  });
});

describe("app layout", () => {
  it("shows the business, availability and approval state", async () => {
    mockApi({
      ...shell({}, { provider: { ...signedIn()["/provider/me"].provider, status: "pending" } }),
      "/provider/dashboard": dashboard({ provider: { ...dashboard().provider, status: "pending" } }),
    });
    await renderApp("/");
    expect(await screen.findByText("Available for work")).toBeInTheDocument();
    expect(screen.getAllByText("Sharma TV Repair").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Promote/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View public profile/ })).toHaveAttribute("href", "http://web.test/providers/sharma-tv");
    expect(screen.getByText(/waiting for approval. It will appear/)).toBeInTheDocument();
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
    mockApi({ ...shell(), "/provider/leads": { leads: [], total: 0, page: 1, totalPages: 1 } });
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
  it("shows KPIs, ranking, checklist, recent leads and reviews", async () => {
    const fetch = mockApi(shell());
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
    expect(screen.getByText("Hidden customer")).toBeInTheDocument();
    expect(screen.getByText("2 need a reply")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Reply" })).toHaveLength(1);
    expect(screen.queryByText(/plan/i)).not.toBeInTheDocument();
    expect(screen.getByText("Leads and profile views")).toBeInTheDocument();
    // Google visibility: the SEO score with the next fixes, each linking to where it is fixed.
    expect(screen.getByText("Google visibility")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "SEO score 62 of 100, Needs work" })).toBeInTheDocument();
    expect(screen.getByText("“tv repair in Mumbai”")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Business description\s*\+8/ })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /Service areas\s*\+1/ })).toHaveAttribute("href", "/areas");
    expect(screen.getByRole("link", { name: /Details/ })).toHaveAttribute("href", "/seo");

    await userEvent.click(screen.getByRole("button", { name: "7 days" }));
    await waitFor(() => expect(fetch.mock.calls.some(([u]) => String(u).includes("days=7"))).toBe(true));
  });

  it("handles empty data", async () => {
    mockApi({
      ...shell(),
      "/provider/dashboard": dashboard({
        provider: { ...dashboard().provider, totalReviews: 0, profileCompletenessPct: 90 },
        totals: { ...dashboard().totals, views: 0, impressions: 0, viewsChangePct: null, leadsChangePct: null, conversionPct: null, unrepliedReviews: 0 },
        checklist: [
          { key: "hours", label: "Set your working hours", done: true },
          { key: "verification", label: "Verify", done: true },
        ],
        recentLeads: [],
        recentReviews: [],
      }),
    });
    await renderApp("/");
    expect(await screen.findByText("Good to see you")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set your working hours" })).toHaveAttribute("href", "/hours");
    expect(screen.getByRole("link", { name: "Verify" })).toHaveAttribute("href", "/verification");
    expect(screen.getByText("No leads yet. Complete your profile to rank higher.")).toBeInTheDocument();
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Upgrade|Unlock/)).not.toBeInTheDocument();
  });

  it("shows a dash for a missing conversion rate", async () => {
    mockApi({
      ...shell(),
      "/provider/dashboard": dashboard({ totals: { ...dashboard().totals, conversionPct: null, leadsChangePct: 0 } }),
    });
    await renderApp("/");
    expect(await screen.findByText("Good to see you")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("small components", () => {
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
        <LogoMark className="m" />
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
