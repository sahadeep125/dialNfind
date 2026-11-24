// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { CategoryGrid } from "@/components/home/category-grid";
import { HeroCity } from "@/components/home/hero-city";
import { HomeHero } from "@/components/home/home-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { NearbyProviders } from "@/components/home/nearby-providers";
import { Testimonials } from "@/components/home/testimonials";
import { TrustPoints } from "@/components/home/trust-points";
import { ServiceContent } from "@/components/seo/service-content";
import { LegalPage } from "@/components/legal/legal-page";
import { DashboardSkeleton, ListingSkeleton, ProfileSkeleton } from "@/components/page-skeletons";
import { GUIDES } from "@/lib/guides";
import { json, mockApi, provider } from "../helpers";

const setLocation = (o: Record<string, unknown>) => {
  document.cookie = `kjv_location=${encodeURIComponent(JSON.stringify({ label: "L", name: "Kothrud", city: "Pune", state: "MH", kind: "area", latitude: 1, longitude: 2, ...o }))}; path=/`;
};

describe("home sections", () => {
  it("category grid, hero, steps and trust points", () => {
    render(
      <>
        <CategoryGrid categories={[{ id: 1, name: "Plumbing", slug: "plumbing", providerCount: 1 }, { id: 2, name: "New", slug: "new", providerCount: 1200 }] as never} />
        <HomeHero popular={[{ label: "AC repair", href: "/x" }]} stats={{ providers: 1500, reviews: 20 }} />
        <HomeHero popular={[]} stats={{ providers: 1, reviews: 1 }} />
        <HowItWorks />
        <TrustPoints />
      </>,
    );
    // The trades directory: every category by name, biggest first, with its count and no stock photo.
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plumbing" })).toHaveAttribute("href", "/services/plumbing");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/^1,500 repair shops, technicians and local pros/)).toBeInTheDocument();
    // Only the hero with shortcuts shows the "Popular searches" row.
    expect(screen.getAllByRole("heading", { name: "Popular searches" })).toHaveLength(1);
    expect(screen.getByText("Say what broke")).toBeInTheDocument();
    expect(screen.getByText("The rules every listing follows")).toBeInTheDocument();
  });
  it("hero city follows the saved location", () => {
    setLocation({ city: "" });
    const { container, unmount } = render(<HeroCity />);
    expect(container).toHaveTextContent("Kothrud");
    unmount();
    setLocation({ city: "", name: "" });
    const second = render(<HeroCity />);
    expect(second.container).toHaveTextContent("Siliguri");
  });
  it("hero city shows the default while rendering on the server", async () => {
    const { renderToString } = await import("react-dom/server");
    expect(renderToString(<HeroCity />)).toContain("Siliguri");
  });
});

describe("NearbyProviders", () => {
  it("loads tiles for the saved city", async () => {
    setLocation({});
    const fetch = mockApi({ "/providers/featured": { results: [provider()] } });
    render(<NearbyProviders />);
    expect(await screen.findByText("Sharma TV Repair")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Near Kothrud right now" })).toBeInTheDocument();
    expect(String(fetch.mock.calls[0]![0])).toContain("lat=1&lng=2&limit=4");
    expect(screen.getByRole("link", { name: /See all/ }).getAttribute("href")).toContain("/search?");
  });
  it("uses the place name without a city and hides when empty or failed", async () => {
    setLocation({ city: "" });
    mockApi({ "/providers/featured": { results: [] } });
    const { container, unmount } = render(<NearbyProviders />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    unmount();
    mockApi({ "/providers/featured": json({}, 500) });
    const second = render(<NearbyProviders />);
    await waitFor(() => expect(second.container).toBeEmptyDOMElement());
    second.unmount();
    let resolve!: (r: Response) => void;
    mockApi({ "/providers/featured": () => new Promise<Response>((r) => (resolve = r)) });
    const third = render(<NearbyProviders />);
    expect(screen.getByRole("heading", { name: "Near Kothrud right now" })).toBeInTheDocument();
    third.unmount();
    await act(async () => resolve(json({ results: [provider()] })));
    let reject!: (e: unknown) => void;
    mockApi({ "/providers/featured": () => new Promise<Response>((_r, j) => (reject = j)) });
    const fourth = render(<NearbyProviders />);
    fourth.unmount();
    await act(async () => reject(new Error("late")));
  });
  it("shows skeletons with a generic heading while rendering on the server", async () => {
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(<NearbyProviders />);
    expect(html).toContain("Near <!-- -->you<!-- --> right now");
    expect(html).toContain('href="/search"');
  });
});

describe("Testimonials", () => {
  it("shows recent reviews, or nothing", async () => {
    vi.resetModules();
    const { Testimonials: Fresh } = await import("@/components/home/testimonials");
    const rtl = await import("@testing-library/react");
    mockApi({
      "/reviews/highlights": {
        reviews: [
          { id: 1, rating: 5, reviewText: "Great", isVerifiedContact: true, createdAt: "", authorName: "Ravi K.", provider: { slug: "a", businessName: "A", city: "Pune", category: { name: "Plumbing", slug: "plumbing" } } },
          { id: 2, rating: 4, reviewText: "Good", isVerifiedContact: false, createdAt: "", authorName: "Asha", provider: { slug: "b", businessName: "B", city: "Goa", category: null } },
        ],
      },
    });
    rtl.render((await Fresh())!);
    expect(rtl.screen.getByText(/plumbing in Pune/)).toBeInTheDocument();
    expect(rtl.screen.getByText(/in Goa/)).toBeInTheDocument();
    expect(rtl.screen.getByLabelText("Verified contact")).toBeInTheDocument();
    mockApi({ "/reviews/highlights": json({}, 500) });
    expect(await Testimonials()).toBeNull();
  });
});

describe("ServiceContent, legal pages and skeletons", () => {
  it("renders every part of the written section, or just the heading", () => {
    const { unmount } = render(<ServiceContent heading="About" intro={["Intro text"]} faqs={[{ q: "Q?", a: "A." }]} guides={GUIDES.slice(0, 1)} related={[{ href: "/r", label: "Related" }]} relatedHeading="More" />);
    expect(screen.getByText("Frequently asked questions")).toBeInTheDocument();
    expect(screen.getByText("Helpful guides")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
    unmount();
    render(<ServiceContent heading="Bare" intro={[]} faqs={[]} guides={[]} related={[]} relatedHeading="x" />);
    expect(screen.queryByText("Frequently asked questions")).toBeNull();
    expect(screen.queryByText("Helpful guides")).toBeNull();
  });
  it("links to the published legal documents when set", async () => {
    vi.resetModules();
    const { LegalPage: Fresh } = await import("@/components/legal/legal-page");
    const rtl = await import("@testing-library/react");
    mockApi({ "/app-config": { config: { terms_url: "https://x/terms", privacy_url: null } } });
    const { unmount } = rtl.render(await Fresh({ doc: "terms" }));
    expect(rtl.screen.getByRole("link", { name: /latest version online/ })).toHaveAttribute("href", "https://x/terms");
    expect(rtl.screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
    unmount();
    rtl.render(await Fresh({ doc: "privacy" }));
    expect(rtl.screen.queryByRole("link", { name: /latest version online/ })).toBeNull();
    expect(LegalPage).toBeDefined();
  });
  it("skeletons", () => {
    render(
      <>
        <ListingSkeleton />
        <ProfileSkeleton />
        <DashboardSkeleton />
      </>,
    );
    expect(screen.getAllByRole("status", { name: "Loading" })).toHaveLength(3);
  });
});
