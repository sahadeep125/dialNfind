// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { cloneElement, isValidElement } from "react";
import * as Sentry from "@sentry/nextjs";
import { request, NotFoundError, RedirectError } from "./next-state";
import { detail, json, mockApi, provider, review, user } from "./helpers";
import { GUIDES } from "@/lib/guides";
import { DEFAULT_LOCATION } from "@/lib/default-location";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Circle: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const sp = <T,>(o: T) => Promise.resolve(o);

/** Awaits every async server component in a tree, so client React can render the result. */
async function resolveTree(node: unknown): Promise<unknown> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveTree));
  if (!isValidElement(node)) return node;
  const { type, props } = node as React.ReactElement<Record<string, unknown>>;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    return resolveTree(await (type as (p: unknown) => Promise<unknown>)(props));
  }
  if (props && "children" in props) return cloneElement(node, undefined, (await resolveTree(props.children)) as React.ReactNode);
  return node;
}

/** Renders a tree that contains async server components. */
async function renderAsync(ui: React.ReactElement) {
  const resolved = (await resolveTree(ui)) as React.ReactElement;
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(resolved);
  });
  return view;
}
const categories = [
  { id: 1, name: "Electronics Repair", slug: "electronics-repair", description: "Fix things", iconUrl: null, uiTemplate: "default", providerCount: 3, subcategories: [{ id: 11, categoryId: 1, name: "TV Repair", slug: "tv-repair" }] },
  { id: 2, name: "Plumbing", slug: "plumbing", description: null, iconUrl: null, uiTemplate: "default", providerCount: 0, subcategories: [] },
];
const searchResponse = (over: Record<string, unknown> = {}) => ({ results: [provider()], total: 1, page: 1, pageSize: 12, totalPages: 1, radiusKm: 15, resolved: { category: null, subcategory: null }, ...over });
const signIn = (u = user()) => {
  request.cookies.set("dnf_token", "t");
  return { "/auth/me": { user: u } };
};

describe("root layout and error pages", () => {
  it("renders the shell with structured data", async () => {
    vi.resetModules();
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "g-code");
    const layout = await import("@/app/layout");
    expect(layout.metadata.verification).toEqual({ google: "g-code" });
    mockApi({ "/app-config": { config: {} } });
    mockApi({ "/app-config": { config: {} }, "/categories": { categories: [] }, "/api/session": { user: null, unread: 0 } });
    await renderAsync(await layout.default({ children: <p>page</p> }));
    expect(screen.getByText("Skip to content")).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).not.toBeNull();
    vi.resetModules();
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "");
    expect((await import("@/app/layout")).metadata.verification).toBeUndefined();
  });
  it("error boundaries report to Sentry and retry", async () => {
    const reset = vi.fn();
    const { default: ErrorPage } = await import("@/app/error");
    render(<ErrorPage error={new Error("x")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalled();
    const { default: GlobalError } = await import("@/app/global-error");
    const html = renderToStaticMarkup(<GlobalError error={new Error("y")} reset={reset} />);
    expect(html).toContain("We could not load DialNFind");
    const { default: NotFound } = await import("@/app/not-found");
    render(<NotFound />);
    expect(screen.getByText("We could not find that page")).toBeInTheDocument();
  });
  it("global error reports on mount", async () => {
    const { default: GlobalError } = await import("@/app/global-error");
    const container = document.createElement("div");
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(container);
    // Rendered into a detached node: React only needs somewhere to mount the effects.
    await act(async () => root.render(<GlobalError error={new Error("z")} reset={vi.fn()} />));
    expect(Sentry.captureException).toHaveBeenCalledWith(new Error("z"));
    root.unmount();
  });
  it("loading screens", async () => {
    for (const path of ["dashboard/loading", "providers/[slug]/loading", "search/loading", "services/[category]/loading"]) {
      const { default: Loading } = await import(`@/app/${path}`);
      const { unmount } = render(<Loading />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      unmount();
    }
  });
});

describe("home and content pages", () => {
  it("home page with popular searches, or the defaults", async () => {
    const { default: Home, metadata } = await import("@/app/page");
    expect(metadata.title).toEqual({ absolute: expect.stringContaining("Near Me") });
    mockApi({ "/categories": { categories }, "/stats": { providers: 10, categories: 2, cities: 1, reviews: 3 }, "/search/popular": { terms: [{ term: "Fan repair" }] }, "/reviews/highlights": { reviews: [] }, "/providers/featured": { results: [] } });
    const { unmount } = await renderAsync(await Home());
    expect(screen.getByRole("link", { name: "Fan repair" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TV Repair near me" })).toBeInTheDocument();
    unmount();
    mockApi({ "/categories": { categories: [] }, "/stats": { providers: 0, categories: 0, cities: 0, reviews: 0 }, "/search/popular": { terms: [] }, "/reviews/highlights": { reviews: [] }, "/providers/featured": { results: [] } });
    await renderAsync(await Home());
    expect(screen.getByRole("link", { name: "RO service" })).toBeInTheDocument();
  });
  it("promo banners show store badges when configured", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_URL", "https://apps.apple.com/x");
    vi.stubEnv("NEXT_PUBLIC_PLAY_STORE_URL", "");
    const rtl = await import("@testing-library/react");
    const { PromoBanners } = await import("@/components/home/promo-banners");
    const a = rtl.render(<PromoBanners />);
    expect(rtl.screen.getByLabelText("Download on the App Store")).toBeInTheDocument();
    a.unmount();
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PLAY_STORE_URL", "https://play.google.com/x");
    const rtl2 = await import("@testing-library/react");
    const { PromoBanners: P2 } = await import("@/components/home/promo-banners");
    rtl2.render(<P2 />);
    expect(rtl2.screen.getByLabelText("GET IT ON Google Play")).toBeInTheDocument();
    expect(rtl2.screen.queryByLabelText("Download on the App Store")).toBeNull();
  });
  it("about, claim, services, help, contact, terms and privacy", async () => {
    mockApi({
      "/stats": { providers: 10, categories: 2, cities: 1, reviews: 3 },
      "/plans": { plans: [{ id: 1, name: "Free", price: 0, leadAccessLimit: 10, featuresJson: ["Listing"] }, { id: 2, name: "Pro", price: 599, leadAccessLimit: null, featuresJson: null }] },
      "/categories": { categories },
      "/app-config": { config: { support_email: "help@x.co", support_phone: "+919876543210", support_hours: "9 to 5" } },
      "/locations": { locations: [] },
      "/api/session": { user: null, unread: 0 },
    });
    for (const [path, text] of [
      ["about/page", /Ready to find help nearby/],
      ["claim/page", /Choose Pro/],
      ["services/page", /Find electronics repair near you/],
      ["help/page", /Our team is available 9 to 5/],
      ["contact/page", /help@x.co/],
      ["terms/page", /privacy/i],
      ["privacy/page", /terms/i],
    ] as const) {
      const { default: Page } = await import(`@/app/${path}`);
      const { unmount } = await renderAsync(await Page());
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
      unmount();
    }
    expect(screen.queryByText("Start free")).toBeNull();
  });
  it("contact and help pages without support details", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_OFFICE_ADDRESS", "1 Office Road");
    mockApi({ "/app-config": { config: {} }, "/api/session": { user: null, unread: 0 } });
    const rtl = await import("@testing-library/react");
    const contact = (await import("@/app/contact/page")).default;
    const c = rtl.render(await contact());
    expect(rtl.screen.getByText("1 Office Road")).toBeInTheDocument();
    c.unmount();
    const help = (await import("@/app/help/page")).default;
    rtl.render(await help());
    expect(rtl.screen.getByText(/We usually reply within one working day/)).toBeInTheDocument();
    const claim = (await import("@/app/claim/page")).default;
    mockApi({ "/plans": { plans: [{ id: 1, name: "Free", price: 0, leadAccessLimit: 10, featuresJson: null }] } });
    rtl.render(await claim());
    expect(rtl.screen.getByText("Start free")).toBeInTheDocument();
  });
  it("guides index and pages", async () => {
    const guides = await import("@/app/guides/page");
    mockApi({ "/categories": { categories } });
    const a = await renderAsync(await guides.default());
    expect(screen.getAllByRole("link").length).toBeGreaterThan(GUIDES.length);
    a.unmount();
    mockApi({ "/categories": json({}, 404) });
    const b = await renderAsync(await guides.default());
    b.unmount();
    // A failing categories request still renders the guides, grouped by category slug.
    mockApi({ "/categories": json({ error: { message: "down" } }, 500) });
    const b2 = await renderAsync(await guides.default());
    expect(screen.getAllByRole("link").length).toBeGreaterThan(GUIDES.length);
    b2.unmount();

    const page = await import("@/app/guides/[slug]/page");
    expect(page.generateStaticParams()).toHaveLength(GUIDES.length);
    expect(await page.generateMetadata({ params: sp({ slug: "nope" }) })).toEqual({});
    const g = GUIDES.find((x) => x.sections.some((s) => s.list)) ?? GUIDES[0]!;
    expect((await page.generateMetadata({ params: sp({ slug: g.slug }) })).keywords).toEqual(g.keywords);
    const cat = { ...categories[0], slug: g.category, subcategories: g.subcategories.map((s, i) => ({ id: i, categoryId: 1, name: s, slug: s })) };
    mockApi({ "/categories": { categories: [cat] } });
    const c = await renderAsync(await page.default({ params: sp({ slug: g.slug }) }));
    expect(screen.getByRole("heading", { level: 1, name: g.title })).toBeInTheDocument();
    c.unmount();
    mockApi({ "/categories": json({}, 404) });
    const d = await renderAsync(await page.default({ params: sp({ slug: g.slug }) }));
    d.unmount();
    mockApi({ "/categories": json({ error: { message: "down" } }, 500) });
    await renderAsync(await page.default({ params: sp({ slug: g.slug }) }));
    expect(screen.getByRole("heading", { level: 1, name: g.title })).toBeInTheDocument();
    await expect(page.default({ params: sp({ slug: "nope" }) })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("auth pages", () => {
  it("login and register send signed-in people to the dashboard", async () => {
    mockApi({ "/api/session": { user: null, unread: 0 } });
    for (const path of ["login", "register"]) {
      const { default: Page } = await import(`@/app/${path}/page`);
      const { unmount } = await renderAsync(await Page());
      expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
      unmount();
    }
    mockApi(signIn());
    await expect((await import("@/app/login/page")).default()).rejects.toEqual(new RedirectError("/dashboard"));
    await expect((await import("@/app/register/page")).default()).rejects.toEqual(new RedirectError("/dashboard"));
  });
  it("forgot and reset password", async () => {
    const forgot = (await import("@/app/forgot-password/page")).default;
    const a = render(forgot());
    expect(screen.getByRole("heading", { name: "Forgot your password?" })).toBeInTheDocument();
    a.unmount();
    const reset = (await import("@/app/reset-password/page")).default;
    const b = await renderAsync(await reset({ searchParams: sp({}) }));
    expect(screen.getByRole("link", { name: "Ask for a new link" })).toBeInTheDocument();
    b.unmount();
    await renderAsync(await reset({ searchParams: sp({ token: "t" }) }));
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });
  it("verify email: by link, by code, or on to the right place", async () => {
    const page = (await import("@/app/verify-email/page")).default;
    mockApi({ "POST /auth/verify-email": { ok: true } });
    const a = await renderAsync(await page({ searchParams: sp({ token: "t" }) }));
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    a.unmount();
    await expect(page({ searchParams: sp({ next: "/d" }) })).rejects.toEqual(new RedirectError(`/login?next=${encodeURIComponent("/verify-email?next=/d")}`));
    mockApi(signIn());
    await expect(page({ searchParams: sp({ next: "/d" }) })).rejects.toEqual(new RedirectError("/d"));
    mockApi(signIn(user({ emailVerifiedAt: null })));
    await renderAsync(await page({ searchParams: sp({ sent: "1" }) }));
    expect(screen.getByRole("button", { name: /Send a new code in 60s/ })).toBeInTheDocument();
  });
});

describe("search and service pages", () => {
  it("search page headings", async () => {
    const { default: Search } = await import("@/app/search/page");
    mockApi({ "/search/providers": searchResponse({ resolved: { category: null, subcategory: { id: 1, name: "TV Repair", slug: "tv-repair" } } }), "/categories": { categories } });
    const a = await renderAsync(await Search({ searchParams: sp({ q: "tv", radius: "5" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`TV Repair near ${DEFAULT_LOCATION.label}`);
    a.unmount();
    mockApi({ "/search/providers": searchResponse({ total: 2, resolved: { category: { id: 1, name: "Plumbing", slug: "plumbing" }, subcategory: null } }), "/categories": { categories } });
    const b = await renderAsync(await Search({ searchParams: sp({}) }));
    expect(screen.getByText(/2 pros/)).toBeInTheDocument();
    b.unmount();
    mockApi({ "/search/providers": searchResponse(), "/categories": { categories } });
    const c = await renderAsync(await Search({ searchParams: sp({ q: "Leak" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Leak near");
    c.unmount();
    await renderAsync(await Search({ searchParams: sp({}) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find trusted local professionals");
  });
  it("category and subcategory pages", async () => {
    const cat = await import("@/app/services/[category]/page");
    const sub = await import("@/app/services/[category]/[sub]/page");
    mockApi({ "/categories/electronics-repair": { category: categories[0] }, "/categories/nope": json({}, 404), "/search/providers": searchResponse() });
    expect(await cat.generateMetadata({ params: sp({ category: "nope" }) })).toEqual({ title: "Services" });
    expect((await cat.generateMetadata({ params: sp({ category: "electronics-repair" }) })).alternates).toEqual({ canonical: "/services/electronics-repair" });
    await expect(cat.default({ params: sp({ category: "nope" }), searchParams: sp({}) })).rejects.toBeInstanceOf(NotFoundError);
    const a = await renderAsync(await cat.default({ params: sp({ category: "electronics-repair" }), searchParams: sp({}) }));
    a.unmount();
    expect((await sub.generateMetadata({ params: sp({ category: "electronics-repair", sub: "nope" }) })).robots).toEqual({ index: false, follow: true });
    expect((await sub.generateMetadata({ params: sp({ category: "nope", sub: "tv-repair" }) })).title).toBe("Services");
    expect((await sub.generateMetadata({ params: sp({ category: "electronics-repair", sub: "tv-repair" }) })).alternates).toEqual({ canonical: "/services/electronics-repair/tv-repair" });
    await expect(sub.default({ params: sp({ category: "electronics-repair", sub: "nope" }), searchParams: sp({}) })).rejects.toBeInstanceOf(NotFoundError);
    await renderAsync(await sub.default({ params: sp({ category: "electronics-repair", sub: "tv%2Drepair" }), searchParams: sp({}) }));
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("TV Repair");
  });
});

describe("provider profile page", () => {
  const routes = (p: Record<string, unknown> | null, extra: Record<string, unknown> = {}) => ({
    "/providers/shop": p ? { provider: detail({ slug: "shop", ...p }) } : json({}, 404),
    "/providers/shop/reviews": { reviews: [review()], page: 1, pageSize: 3, total: 1, totalPages: 1 },
    "/providers/shop/similar": { results: [provider({ id: 9, slug: "other" })] },
    "/app-config": { config: { min_review_length: 10 } },
    "/api/session": { user: null, unread: 0 },
    "POST /providers/shop/visit": { isFavorite: false, myReview: null },
    ...extra,
  });

  it("builds metadata", async () => {
    const page = await import("@/app/providers/[slug]/page");
    expect(await page.generateStaticParams()).toEqual([]);
    mockApi(routes(null));
    expect(await page.generateMetadata({ params: sp({ slug: "shop" }) })).toMatchObject({ title: "Provider not found" });
    mockApi(routes({}));
    expect(String((await page.generateMetadata({ params: sp({ slug: "shop" }) })).description)).toMatch(/^Rated 4.5\/5 from 12 reviews\. We fix TVs/);
    mockApi(routes({ totalReviews: 0, description: null, shortDescription: "", locality: null, primaryCategory: null }));
    const bare = await page.generateMetadata({ params: sp({ slug: "shop" }) });
    expect(String(bare.title)).toBe("Sharma TV Repair: Local services in Mumbai");
    expect(String(bare.description)).toMatch(/^Local services in Mumbai\. Call/);
    mockApi(routes({ description: null, shortDescription: "Short text" }));
    expect(String((await page.generateMetadata({ params: sp({ slug: "shop" }) })).description)).toContain("Short text");
  });
  it("renders a full profile", async () => {
    const { default: Page } = await import("@/app/providers/[slug]/page");
    const portfolio = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: i ? `Job ${i}` : "", description: null, imageUrl: `https://img.test/${i}.webp`, category: null }));
    mockApi(
      routes({
        coverUrl: "https://img.test/cover.webp",
        portfolio,
        is24x7: true,
        subcategories: ["TV Repair", "AC", "Fridge", "Washer", "Oven", "Fan", "Radio"],
        services: [{ id: 1, category: { id: 1, name: "Electronics Repair", slug: "electronics-repair" }, subcategory: { id: 11, name: "TV Repair", slug: "tv-repair" }, startingPrice: 300, priceUnit: "per_visit", isPrimary: true }],
        serviceDetails: ["Warranty", "Payment modes", "Areas", "Response time", "Brands", "AMC available", "Other"].map((label) => ({ label, value: "x" })),
        isClaimed: false,
      }),
    );
    await renderAsync(await Page({ params: sp({ slug: "shop" }) }));
    await act(async () => undefined);
    expect(screen.getAllByText("+2 more").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Claim this listing" })).toHaveAttribute("href", expect.stringContaining("/claim?listing=1"));
    expect(screen.getByText("Business verified")).toBeInTheDocument();
    expect(screen.getByText("Phone not verified")).toBeInTheDocument();
    expect(screen.getByText("Emergency calls")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Similar pros nearby" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("TV Repair");
  });
  it("renders a bare profile and 404s for unknown ones", async () => {
    const { default: Page } = await import("@/app/providers/[slug]/page");
    mockApi(
      routes(
        { primaryCategory: null, yearsExperience: null, selfReportedCompletedJobs: null, portfolio: [], serviceDetails: [], totalReviews: 0, addressLine: null, description: null, verifications: [], subcategories: [], services: [{ id: 2, category: { id: 1, name: "X", slug: "x" }, subcategory: null, startingPrice: null, priceUnit: "fixed", isPrimary: true }] },
        { "/providers/shop/similar": { results: [] } },
      ),
    );
    await renderAsync(await Page({ params: sp({ slug: "shop" }) }));
    await act(async () => undefined);
    expect(screen.getByText("This provider has not added a description yet.")).toBeInTheDocument();
    expect(screen.getByText("No reviews yet", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Similar pros nearby" })).toBeNull();
    mockApi(routes(null));
    await expect(Page({ params: sp({ slug: "shop" }) })).rejects.toBeInstanceOf(NotFoundError);
  });
  it("profile with a category but no main subcategory, and similar pros without a category link", async () => {
    const { default: Page } = await import("@/app/providers/[slug]/page");
    mockApi(routes({ primaryCategory: null, services: [{ id: 2, category: { id: 1, name: "X", slug: "x" }, subcategory: null, startingPrice: 1, priceUnit: "fixed", isPrimary: true }], portfolio: [{ id: 1, title: "One", description: null, imageUrl: "https://img.test/1.webp", category: null }] }));
    await renderAsync(await Page({ params: sp({ slug: "shop" }) }));
    await act(async () => undefined);
    expect(screen.getByRole("heading", { name: "Similar pros nearby" })).toBeInTheDocument();
  });
  it("previews a listing that is not live, with the signed token and without caching", async () => {
    const { default: Preview, dynamic, metadata } = await import("@/app/providers/[slug]/preview/page");
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    await expect(Preview({ params: sp({ slug: "shop" }), searchParams: sp({}) })).rejects.toBeInstanceOf(NotFoundError);
    const fetch = mockApi(routes({ status: "pending" }));
    const a = await renderAsync(await Preview({ params: sp({ slug: "shop" }), searchParams: sp({ token: "tok" }) }));
    expect(screen.getByRole("status")).toHaveTextContent("not live yet (status: pending)");
    const [input, init] = fetch.mock.calls.find(([u]) => new URL(String(u)).pathname.endsWith("/providers/shop"))!;
    expect(new URL(String(input)).searchParams.get("previewToken")).toBe("tok");
    expect(init).toMatchObject({ cache: "no-store" });
    expect(fetch.mock.calls.some(([u]) => String(u).includes("/reviews"))).toBe(false);
    a.unmount();
    mockApi(routes({ status: "active" }));
    const live = await renderAsync(await Preview({ params: sp({ slug: "shop" }), searchParams: sp({ token: "tok" }) }));
    expect(screen.getByRole("status")).toHaveTextContent("This listing is live");
    live.unmount();
    // A live listing whose reviews cannot be found, and a listing without a status, show no reviews.
    mockApi({ ...routes({ status: "active" }), "/providers/shop/reviews": json({}, 404) });
    const b = await renderAsync(await Preview({ params: sp({ slug: "shop" }), searchParams: sp({ token: "tok" }) }));
    expect(screen.getByRole("status")).toHaveTextContent("This listing is live");
    b.unmount();
    mockApi(routes({ status: undefined }));
    await renderAsync(await Preview({ params: sp({ slug: "shop" }), searchParams: sp({ token: "tok" }) }));
    expect(screen.getByRole("status")).toHaveTextContent("This listing is live");
    mockApi(routes(null));
    await expect(Preview({ params: sp({ slug: "shop" }), searchParams: sp({ token: "bad" }) })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("dashboard pages", () => {
  const contact = { id: 1, channel: "call", createdAt: new Date().toISOString(), customerReportedResponse: null, hasReview: false, provider: provider() };

  it("layout requires a session", async () => {
    const { default: Layout } = await import("@/app/dashboard/layout");
    await expect(Layout({ children: null })).rejects.toBeInstanceOf(RedirectError);
    mockApi({ ...signIn(), "/api/session": { user: user(), unread: 0 } });
    await renderAsync(await Layout({ children: <p>inner</p> }));
    expect(screen.getByText("inner")).toBeInTheDocument();
    expect(screen.getByText("AR")).toBeInTheDocument();
  });
  it("overview", async () => {
    const { default: Overview } = await import("@/app/dashboard/page");
    mockApi({ ...signIn(), "/me/overview": { stats: { favorites: 1, reviews: 2, contacts: 3, unreadNotifications: 4 }, recentContacts: [contact] }, "/providers/featured": { results: [provider()] } });
    const a = await renderAsync(await Overview());
    expect(screen.getByRole("heading", { name: "Hello, Asha" })).toBeInTheDocument();
    expect(screen.getByText(/Top rated near/)).toBeInTheDocument();
    a.unmount();
    let calls = 0;
    request.cookies.set("dnf_token", "t");
    mockApi({ "/auth/me": () => (calls++ ? json({}, 401) : json({ user: user() })), "/me/overview": { stats: { favorites: 0, reviews: 0, contacts: 0, unreadNotifications: 0 }, recentContacts: [] }, "/providers/featured": { results: [] } });
    await renderAsync(await Overview());
    expect(screen.getByRole("heading", { name: "Hello, there" })).toBeInTheDocument();
    expect(screen.getByText(/Providers you call or message will appear here/)).toBeInTheDocument();
  });
  it("account settings describe how the person signs in", async () => {
    const { default: Account } = await import("@/app/dashboard/account/page");
    for (const [u, text] of [
      [user(), "Use at least 8 characters."],
      [user({ linkedAccounts: ["google"] }), "You can also sign in with Google."],
      [user({ hasPassword: false, linkedAccounts: ["google", "apple"] }), "You sign in with Google and Apple."],
    ] as const) {
      mockApi({ ...signIn(u as never), "/me/addresses": { addresses: [] } });
      const { unmount } = await renderAsync(await Account());
      expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
      unmount();
    }
  });
  it("contacts and favorites with and without results", async () => {
    const contacts = (await import("@/app/dashboard/contacts/page")).default;
    mockApi({ ...signIn(), "/me/contacts": { contacts: [contact], page: 1, pageSize: 20, total: 1, totalPages: 1 } });
    const a = await renderAsync(await contacts({ searchParams: sp({ page: "x" }) }));
    expect(screen.getByText("Sharma TV Repair")).toBeInTheDocument();
    a.unmount();
    mockApi({ ...signIn(), "/me/contacts": { contacts: [], page: 1, pageSize: 20, total: 0, totalPages: 1 } });
    const b = await renderAsync(await contacts({ searchParams: sp({ page: "2" }) }));
    expect(screen.getByText("No contacts yet.")).toBeInTheDocument();
    b.unmount();

    const favorites = (await import("@/app/dashboard/favorites/page")).default;
    mockApi({ ...signIn(), "/me/favorites": { results: [provider()], page: 1, pageSize: 12, total: 1, totalPages: 1 } });
    const c = await renderAsync(await favorites({ searchParams: sp({}) }));
    expect(screen.getByText("Sharma TV Repair")).toBeInTheDocument();
    c.unmount();
    mockApi({ ...signIn(), "/me/favorites": { results: [], page: 1, pageSize: 12, total: 0, totalPages: 1 } });
    const d = await renderAsync(await favorites({ searchParams: sp({}) }));
    expect(screen.getByText("No favorites yet")).toBeInTheDocument();
    d.unmount();
    await renderAsync(await favorites({ searchParams: sp({ page: "3" }) }));
    expect(screen.getByRole("link", { name: "Back to the first page" })).toBeInTheDocument();
  });
  it("notifications and reviews", async () => {
    const notifications = (await import("@/app/dashboard/notifications/page")).default;
    mockApi({ ...signIn(), "/me/notifications": { notifications: [], unread: 0 } });
    const a = await renderAsync(await notifications());
    expect(screen.getByText("Nothing new")).toBeInTheDocument();
    a.unmount();
    mockApi({ ...signIn(), "/me/notifications": { notifications: [{ id: 1, type: "system", title: "Hi", body: null, isRead: false, dataJson: null, createdAt: new Date().toISOString() }], unread: 1 } });
    const b = await renderAsync(await notifications());
    expect(screen.getByText("1 unread")).toBeInTheDocument();
    b.unmount();

    const reviews = (await import("@/app/dashboard/reviews/page")).default;
    const r = (over: Record<string, unknown>) => ({ id: 1, rating: 4, reviewText: "Nice", providerReply: "Thanks", status: "published", createdAt: "2026-01-01T00:00:00Z", provider: { id: 1, slug: "s", businessName: "Shop", city: "Pune", locality: "Kothrud" }, ...over });
    mockApi({ ...signIn(), "/me/reviews": { reviews: [r({}), r({ id: 2, status: "flagged", reviewText: null, providerReply: null, provider: { id: 2, slug: "t", businessName: "Other", city: "Pune", locality: null } }), r({ id: 3, status: "removed" })] } });
    const c = await renderAsync(await reviews());
    expect(screen.getByText("Under review")).toBeInTheDocument();
    expect(screen.getByText("Removed")).toBeInTheDocument();
    c.unmount();
    mockApi({ ...signIn(), "/me/reviews": { reviews: [] } });
    await renderAsync(await reviews());
    expect(screen.getByText("You have not written any reviews yet.")).toBeInTheDocument();
  });
  it("support list and ticket", async () => {
    const list = (await import("@/app/dashboard/support/page")).default;
    mockApi({ ...signIn(), "/support/tickets": { tickets: [{ id: 1, reference: "DNF-000001", subject: "Help", status: "pending", lastActivityAt: new Date().toISOString() }] } });
    const a = await renderAsync(await list());
    expect(screen.getByText("Awaiting your reply")).toBeInTheDocument();
    a.unmount();
    mockApi({ ...signIn(), "/support/tickets": { tickets: [] } });
    const b = await renderAsync(await list());
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
    b.unmount();

    const ticket = (await import("@/app/dashboard/support/[id]/page")).default;
    const detailBody = (status: string) => ({
      ticket: { id: 1, reference: "DNF-000001", subject: "Help", status, createdAt: "2026-01-01T00:00:00Z" },
      messages: [
        { id: 1, body: "Hi", attachments: ["https://u/a.pdf"], fromStaff: false, createdAt: new Date().toISOString(), authorName: "Asha" },
        { id: 2, body: "Hello", attachments: [], fromStaff: true, createdAt: new Date().toISOString(), authorName: "Support" },
      ],
    });
    mockApi({ ...signIn(), "/support/tickets/1": detailBody("open") });
    const c = await renderAsync(await ticket({ params: sp({ id: "1" }) }));
    expect(screen.getByRole("button", { name: "Mark as solved" })).toBeInTheDocument();
    expect(screen.getByLabelText("Reply")).toBeInTheDocument();
    c.unmount();
    mockApi({ ...signIn(), "/support/tickets/1": detailBody("closed") });
    await renderAsync(await ticket({ params: sp({ id: "1" }) }));
    expect(screen.getByText(/This request is closed/)).toBeInTheDocument();
    await expect(ticket({ params: sp({ id: "abc" }) })).rejects.toBeInstanceOf(NotFoundError);
    mockApi({ ...signIn(), "/support/tickets/2": json({}, 404) });
    await expect(ticket({ params: sp({ id: "2" }) })).rejects.toBeInstanceOf(NotFoundError);
  });
});
