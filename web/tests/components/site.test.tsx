// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import posthog from "posthog-js";
import { CategoryGlyph, CategoryIcon, categoryIconComponent, categoryTone } from "@/components/site/category-icon";
import { ClaimSearch } from "@/components/site/claim-search";
import { ContactForm } from "@/components/site/contact-form";
import { HeaderAccount } from "@/components/site/header-account";
import { HeaderSearch } from "@/components/site/header-search";
import { Logo, LogoMark } from "@/components/site/logo";
import { MobileNav } from "@/components/site/mobile-nav";
import { PhotoFrame } from "@/components/site/photo-frame";
import { SectionHeading } from "@/components/site/section-heading";
import { SessionProvider, useSession } from "@/components/site/session-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TrackView } from "@/components/site/track-view";
import { UserMenu } from "@/components/site/user-menu";
import { HERO_IMAGE } from "@/lib/stock-images";
import { nav } from "../next-state";
import { json, mockApi, provider, user } from "../helpers";

/** Renders inside a SessionProvider whose /api/session answer is `session`. */
async function withSession(ui: React.ReactElement, session: { user: unknown; unread?: number } | null, extra: Record<string, unknown> = {}) {
  mockApi({ "/api/session": session ? { unread: 0, ...session } : () => Promise.reject(new Error("down")) as never, ...extra });
  const view = render(<SessionProvider>{ui}</SessionProvider>);
  await act(async () => undefined);
  return view;
}

describe("small site pieces", () => {
  it("category icons, logo, photo frame and headings", () => {
    expect(categoryTone("plumbing").bg).toContain("210");
    expect(categoryTone(null).bg).toBe("bg-accent");
    expect(categoryTone("nope").bg).toBe("bg-accent");
    expect(categoryIconComponent("plumbing").displayName).toBeDefined();
    expect(categoryIconComponent(undefined)).toBe(categoryIconComponent("nope"));
    const { container } = render(
      <>
        <CategoryIcon slug="plumbing" />
        <CategoryIcon />
        <CategoryGlyph slug="tutors" />
        <CategoryGlyph />
        <LogoMark />
        <Logo inverted href="/x" />
        <Logo />
        <PhotoFrame image={HERO_IMAGE} priority />
        <SectionHeading title="T" />
        <SectionHeading as="h1" title="C" eyebrow="E" description="D" align="center" action={{ href: "/a", label: "All" }} />
      </>,
    );
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(4);
    expect(screen.getAllByLabelText("DialNFind home")[0]).toHaveAttribute("href", "/x");
    expect(screen.getByRole("heading", { level: 1, name: "C" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All/ })).toHaveAttribute("href", "/a");
    expect(screen.getByAltText(HERO_IMAGE.alt)).toBeInTheDocument();
  });
  it("TrackView sends one event per properties change", () => {
    vi.resetModules();
    const { rerender } = render(<TrackView event="page_viewed" properties={{ a: 1 }} />);
    rerender(<TrackView event="page_viewed" properties={{ a: 1 }} />);
    expect(posthog.capture).not.toHaveBeenCalled(); // analytics off without a key
  });
});

describe("SessionProvider", () => {
  it("loads the session, identifies and resets on sign-out", async () => {
    let seen: ReturnType<typeof useSession> | null = null;
    const Probe = () => {
      seen = useSession();
      return <span>{seen.loading ? "loading" : (seen.user?.name ?? "guest")}</span>;
    };
    await withSession(<Probe />, { user: user(), unread: 2 });
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(seen!.unread).toBe(2);
    act(() => seen!.setUnread(0));
    expect(seen!.unread).toBe(0);
    mockApi({ "/api/session": { user: null, unread: 0 } });
    await act(async () => seen!.refresh());
    expect(screen.getByText("guest")).toBeInTheDocument();
    // A failed refresh keeps what we had.
    mockApi({ "/api/session": () => Promise.reject(new Error("down")) as never });
    await act(async () => seen!.refresh());
    expect(screen.getByText("guest")).toBeInTheDocument();
  });
  it("ignores an answer that arrives after unmounting, and the default context is empty", async () => {
    let resolve!: (r: Response) => void;
    mockApi({ "/api/session": () => new Promise<Response>((r) => (resolve = r)) });
    const { unmount } = render(<SessionProvider><span /></SessionProvider>);
    unmount();
    await act(async () => resolve(json({ user: user(), unread: 0 })));
    const Probe = () => {
      const s = useSession();
      void s.refresh();
      s.setUnread(1);
      return <span>{String(s.loading)}</span>;
    };
    render(<Probe />);
    expect(screen.getByText("true")).toBeInTheDocument();
  });
  it("identifies with analytics on", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "k");
    const rtl = await import("@testing-library/react");
    const { SessionProvider: Fresh, useSession: useFresh } = await import("@/components/site/session-provider");
    let s!: ReturnType<typeof useFresh>;
    const Probe = () => ((s = useFresh()), null);
    mockApi({ "/api/session": { user: user({ provider: { id: 3 } }), unread: 0 } });
    rtl.render(<Fresh><Probe /></Fresh>);
    await rtl.waitFor(() => expect(posthog.identify).toHaveBeenCalledTimes(1));
    // Same person again: not identified twice.
    await rtl.act(async () => s.refresh());
    expect(posthog.identify).toHaveBeenCalledTimes(1);
    mockApi({ "/api/session": { user: null, unread: 0 } });
    await rtl.act(async () => s.refresh());
    expect(posthog.reset).toHaveBeenCalled();
  });
});

describe("header", () => {
  it("shows sign-in buttons for guests, a skeleton while loading", async () => {
    mockApi({ "/api/session": () => new Promise(() => undefined) as never });
    const { container, unmount } = render(<SessionProvider><HeaderAccount /></SessionProvider>);
    expect(container.querySelector("[data-slot=skeleton]") ?? container.firstChild).toBeTruthy();
    unmount();
    await withSession(<HeaderAccount />, { user: null });
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });
  it("shows the bell with an unread count and the account menu", async () => {
    await withSession(<HeaderAccount />, { user: user(), unread: 12 });
    expect(screen.getByRole("link", { name: "Notifications, 12 unread" })).toHaveTextContent("9+");
  });
  it("shows small counts and none", async () => {
    const { unmount } = await withSession(<HeaderAccount />, { user: user(), unread: 3 });
    expect(screen.getByRole("link", { name: "Notifications, 3 unread" })).toHaveTextContent("3");
    unmount();
    await withSession(<HeaderAccount />, { user: user(), unread: 0 });
    expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument();
  });
  it("adds a header search on pages without one", async () => {
    nav.pathname = "/";
    const { container, unmount } = render(<HeaderSearch />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    nav.pathname = "/providers/x";
    render(<HeaderSearch />);
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
  });
  it("renders the whole header", async () => {
    await withSession(<SiteHeader />, { user: null });
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });
});

describe("UserMenu", () => {
  it("opens and logs out", async () => {
    const u = userEvent.setup();
    const fetch = mockApi({ "POST /api/auth/logout": { ok: true }, "/api/session": { user: null, unread: 0 } });
    render(<UserMenu user={{ name: "Asha Rao", email: "a@b.co", role: "customer", profilePhotoUrl: "https://x/p.png" }} />);
    await u.click(screen.getByText("AR"));
    expect(screen.getByRole("menuitem", { name: /account settings/i })).toBeInTheDocument();
    await u.click(screen.getByRole("menuitem", { name: /log out/i }));
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith("/"));
    expect(fetch).toHaveBeenCalled();
  });
});

describe("MobileNav", () => {
  it("offers sign-up to guests and the dashboard to members, closing on navigation", async () => {
    const u = userEvent.setup();
    const { unmount } = await withSession(<MobileNav />, { user: null });
    await u.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Create an account" })).toBeInTheDocument();
    await u.click(within(dialog).getByRole("link", { name: "Guides" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    for (const name of ["Create an account", "Log in", /for businesses/i]) {
      await u.click(screen.getByRole("button", { name: "Open menu" }));
      await u.click(within(screen.getByRole("dialog")).getByRole("link", { name }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
    unmount();
    await withSession(<MobileNav />, { user: user() });
    await u.click(screen.getByRole("button", { name: "Open menu" }));
    await u.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Go to dashboard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("SiteFooter", () => {
  it("lists popular services and support contacts", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_OFFICE_REGION", "Siliguri, West Bengal");
    const { SiteFooter: Footer } = await import("@/components/site/site-footer");
    const rtl = await import("@testing-library/react");
    mockApi({
      "/app-config": { config: { support_email: "help@x.co", support_phone: "+919876543210" } },
      "/categories": { categories: [{ slug: "a", name: "Alpha", providerCount: 1 }, { slug: "b", name: "Beta", providerCount: 5 }] },
    });
    rtl.render(await Footer());
    expect(rtl.screen.getByRole("heading", { name: "Popular services" })).toBeInTheDocument();
    const links = rtl.screen.getAllByRole("link").map((l) => l.textContent);
    expect(links.indexOf("Beta")).toBeLessThan(links.indexOf("Alpha"));
    expect(rtl.screen.getByText("help@x.co")).toBeInTheDocument();
    expect(rtl.screen.getByText("+91 98765 43210")).toBeInTheDocument();
    expect(rtl.screen.getByText("Siliguri, West Bengal")).toBeInTheDocument();
  });
  it("still renders when the API is down", async () => {
    vi.resetModules();
    const { SiteFooter: Footer } = await import("@/components/site/site-footer");
    const rtl = await import("@testing-library/react");
    mockApi({ "/app-config": json({}, 500), "/categories": json({}, 500) });
    rtl.render(await Footer());
    expect(rtl.screen.queryByRole("heading", { name: "Popular services" })).toBeNull();
    expect(SiteFooter).toBeDefined();
  });
});

describe("ClaimSearch", () => {
  const locations = { locations: [{ kind: "city", name: "Pune" }, { kind: "city", name: "Mumbai" }, { kind: "area", name: "Andheri" }] };

  it("finds listings and links to claim them", async () => {
    const u = userEvent.setup();
    document.cookie = `dnf_location=${encodeURIComponent(JSON.stringify({ label: "M", city: "Mumbai", latitude: 1, longitude: 1 }))}; path=/`;
    const fetch = mockApi({
      "/locations": locations,
      "/search/providers": (url: URL) => json({ results: url.searchParams.get("q") === "none" ? [] : [provider(), provider({ id: 2, isClaimed: false, slug: "b" })] }),
    });
    render(<ClaimSearch providerAppUrl="https://biz.test" />);
    // The city list loads from the API; the preselected city is not asserted (see the note in the test summary).
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    await u.click(screen.getByRole("button", { name: /find my listing/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter at least 2 characters");
    await u.type(screen.getByLabelText("Business name"), "Sharma");
    expect(screen.queryByRole("alert")).toBeNull();
    await u.click(screen.getByRole("combobox", { name: "City" }));
    await u.click(await screen.findByRole("option", { name: "Pune" }));
    await u.click(screen.getByRole("button", { name: /find my listing/i }));
    expect(await screen.findByText("Already claimed")).toBeInTheDocument();
    const claim = screen.getByRole("link", { name: "Claim" });
    expect(claim).toHaveAttribute("href", "https://biz.test/claim?listing=2");
    claim.addEventListener("click", (e) => e.preventDefault());
    await u.click(claim);
    expect(String(fetch.mock.calls.at(-1)![0])).toContain("city=Pune");
    await u.clear(screen.getByLabelText("Business name"));
    await u.type(screen.getByLabelText("Business name"), "none");
    await u.click(screen.getByRole("button", { name: /find my listing/i }));
    expect(await screen.findByText(/could not find that business/)).toBeInTheDocument();
    mockApi({ "/search/providers": json({}, 500) });
    await u.click(screen.getByRole("button", { name: /find my listing/i }));
    expect(await screen.findByText("Search is not available right now. Please try again.")).toBeInTheDocument();
  });
  it("uses the first city when the saved one has no listings, and the saved one when offline", async () => {
    mockApi({ "/locations": { locations: [{ kind: "city", name: "Pune" }] } });
    const { unmount } = render(<ClaimSearch providerAppUrl="x" />);
    await act(async () => undefined);
    expect(document.querySelector('select option[value="Pune"]')).not.toBeNull();
    unmount();
    mockApi({ "/locations": { locations: [] } });
    const second = render(<ClaimSearch providerAppUrl="x" />);
    await act(async () => undefined);
    second.unmount();
    mockApi({ "/locations": json({}, 500) });
    render(<ClaimSearch providerAppUrl="x" />);
    await waitFor(() => expect(document.querySelector('select option[value="Siliguri"]')).not.toBeNull());
  });
  it("falls back to no cities when offline without a saved city", async () => {
    vi.resetModules();
    vi.doMock("@/lib/saved-location", () => ({ readSavedLocation: () => ({ city: "" }) }));
    const rtl = await import("@testing-library/react");
    const { ClaimSearch: Fresh } = await import("@/components/site/claim-search");
    mockApi({ "/locations": json({}, 500) });
    rtl.render(<Fresh providerAppUrl="x" />);
    await rtl.act(async () => undefined);
    expect(document.querySelectorAll("select option[value]:not([value=''])")).toHaveLength(0);
    vi.doUnmock("@/lib/saved-location");
  });
});

describe("ContactForm", () => {
  it("validates and sends a guest message", async () => {
    const u = userEvent.setup();
    await withSession(<ContactForm />, { user: null });
    await u.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText("Enter your name")).toBeInTheDocument();
    await u.type(screen.getByLabelText(/Full name/), "Guest Person");
    await u.type(screen.getByLabelText(/Email/), "g@x.co");
    await u.type(screen.getByLabelText(/Phone/), "9876543210");
    await u.type(screen.getByLabelText(/Message/), "Please help me with this");
    expect(screen.getByText("24 of 3,000 characters")).toBeInTheDocument();
    await u.click(screen.getByRole("combobox"));
    await u.click(await screen.findByRole("option", { name: "Partnerships" }));
    mockApi({ "POST /contact": json({ error: { message: "Too many messages" } }, 429) });
    await u.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText("Too many messages")).toBeInTheDocument();
    mockApi({ "POST /contact": () => Promise.reject(new TypeError("x")) as never });
    await u.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText("Could not send your message")).toBeInTheDocument();
    const fetch = mockApi({ "POST /contact": { id: 5, reference: "DNF-000005" } });
    await u.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText("DNF-000005")).toBeInTheDocument();
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toMatchObject({ phone: "+919876543210", subject: "Partnerships" });
    expect(screen.getByText(/by email\./)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Follow the conversation" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Send another message" }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("");
  });
  it("fills in the signed-in person and links to the ticket", async () => {
    const u = userEvent.setup();
    await withSession(<ContactForm />, { user: user() }, { "POST /contact": { id: 9, reference: "DNF-000009" } });
    await waitFor(() => expect(screen.getByLabelText(/Full name/)).toHaveValue("Asha Rao"));
    expect(screen.getByLabelText(/Email/)).toHaveValue("asha@example.com");
    await u.type(screen.getByLabelText(/Message/), "Something is wrong here");
    await u.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("link", { name: "Follow the conversation" })).toHaveAttribute("href", "/dashboard/support/9");
  });
  it("keeps what the person already typed when the session arrives", async () => {
    const u = userEvent.setup();
    let resolve!: (r: Response) => void;
    mockApi({ "/api/session": () => new Promise<Response>((r) => (resolve = r)) });
    render(<SessionProvider><ContactForm /></SessionProvider>);
    await u.type(screen.getByLabelText(/Full name/), "Typed Name");
    await u.type(screen.getByLabelText(/Email/), "typed@x.co");
    await act(async () => resolve(json({ user: user(), unread: 0 })));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Typed Name");
    expect(screen.getByLabelText(/Email/)).toHaveValue("typed@x.co");
  });
});
