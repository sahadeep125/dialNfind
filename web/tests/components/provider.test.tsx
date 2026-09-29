// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { BackButton } from "@/components/provider/back-button";
import { ContactButtons } from "@/components/provider/contact-buttons";
import { ContactCard } from "@/components/provider/contact-card";
import { ExpandableChips, ExpandableGrid } from "@/components/provider/expandable";
import { FavoriteButton } from "@/components/provider/favorite-button";
import { LocationMap } from "@/components/provider/location-map";
import { OpeningHours } from "@/components/provider/opening-hours";
import { PhotoGallery } from "@/components/provider/photo-gallery";
import { PhotoLightbox, PhotoTrigger } from "@/components/provider/photo-lightbox";
import { PlanTierBadge } from "@/components/provider/plan-tier-badge";
import { ProfileHeader } from "@/components/provider/profile-header";
import { ProviderAvatar } from "@/components/provider/provider-avatar";
import { OpenStatus, ProviderCard } from "@/components/provider/provider-card";
import { ProviderTile } from "@/components/provider/provider-tile";
import { RatingInline, RatingPill, RatingStars } from "@/components/provider/rating";
import { ReviewForm } from "@/components/provider/review-form";
import { ReviewsList } from "@/components/provider/reviews-list";
import { ReviewsSummary } from "@/components/provider/reviews-summary";
import { SectionNav } from "@/components/provider/section-nav";
import { ProfileSection, SideCard } from "@/components/provider/section-card";
import { ServicesList } from "@/components/provider/services-list";
import { ReportListing, ReportReview, ShareButton } from "@/components/provider/share-report";
import { SimilarProviders } from "@/components/provider/similar-providers";
import { StickyColumn } from "@/components/provider/sticky-column";
import { ProfileFavoriteButton, ProfileReviewForm, ProviderViewerState } from "@/components/provider/viewer-state";
import { SessionProvider } from "@/components/site/session-provider";
import { Star } from "lucide-react";
import { nav } from "../next-state";
import { detail, json, mockApi, provider, review, user } from "../helpers";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ title }: { title?: string }) => <div data-testid="marker">{title}</div>,
  Circle: () => null,
}));

const setTouch = (touch: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: touch && q.includes("coarse"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

describe("rating and badges", () => {
  it("renders every rating style", () => {
    render(
      <>
        <RatingStars value={3.5} />
        <RatingStars value={4} size="md" />
        <RatingStars value={5} size="lg" />
        <RatingPill value={4.2} count={1} />
        <RatingPill value={4.2} count={1200} />
        <RatingPill value={0} count={0} />
        <RatingInline value={4.8} count={1} />
        <RatingInline value={4.8} count={20} short />
        <RatingInline value={0} count={0} />
        <PlanTierBadge tier="pro" />
        <PlanTierBadge tier="business" size="md" />
      </>,
    );
    expect(screen.getByLabelText("3.5 out of 5")).toBeInTheDocument();
    expect(screen.getByText("1 review")).toBeInTheDocument();
    expect(screen.getByText("1,200 reviews")).toBeInTheDocument();
    expect(screen.getAllByText("New listing")).toHaveLength(2);
    expect(screen.getByText("(20)")).toBeInTheDocument();
    expect(screen.getByText("Business Partner")).toBeInTheDocument();
  });
  it("avatars and open status", () => {
    render(
      <>
        <ProviderAvatar name="Asha Rao" logoUrl="https://x/l.png" />
        <ProviderAvatar name="Asha Rao" size="xl" categorySlug="plumbing" />
        <ProviderAvatar name="Asha Rao" size="lg" />
        <OpenStatus provider={{ isAvailable: false, isOpenNow: false, todayHours: "" }} />
        <OpenStatus provider={{ isAvailable: true, isOpenNow: false, todayHours: "Closed today" }} />
      </>,
    );
    expect(screen.getByAltText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Currently unavailable")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });
});

describe("ContactButtons", () => {
  it("shows the number on desktop and records the lead", async () => {
    const u = userEvent.setup();
    setTouch(false);
    const fetch = mockApi({ "POST /leads": { ok: true } });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const success = vi.spyOn(toast, "success");
    render(<ContactButtons provider={provider()} source="profile" categorySlug="tv" variant="profile" size="lg" layout="stack" />);
    await u.click(screen.getByRole("button", { name: /Call Now/ }));
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ providerId: 1, channel: "call", source: "profile", categorySlug: "tv" });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("link")[0]).toHaveAttribute("href", "tel:+919876543210");
    await u.click(within(dialog).getByRole("button", { name: /Copy number/ }));
    expect(writeText).toHaveBeenCalledWith("+919876543210");
    expect(success).toHaveBeenCalledWith("Number copied");
  });
  it("dials on phones and opens WhatsApp, surviving a failed lead request", async () => {
    const u = userEvent.setup();
    setTouch(true);
    mockApi({ "POST /leads": () => Promise.reject(new Error("offline")) as never });
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const location = { href: "" };
    vi.stubGlobal("location", location);
    render(<ContactButtons provider={provider()} variant="outline" />);
    await u.click(screen.getByRole("button", { name: /^Call$/ }));
    expect(location.href).toBe("tel:+919876543210");
    await u.click(screen.getByRole("button", { name: /WhatsApp/ }));
    expect(open.mock.calls[0]![0]).toContain("https://wa.me/919876543210?text=Hi%20Sharma%20TV%20Repair");
  });
  it("hides buttons the provider does not accept", () => {
    render(<ContactButtons provider={provider({ acceptsCalls: false, whatsappNumber: null })} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("hides WhatsApp when the listing does not accept it", () => {
    render(<ContactButtons provider={provider({ acceptsWhatsapp: false })} />);
    expect(screen.queryByRole("button", { name: /WhatsApp/ })).toBeNull();
  });
});

describe("FavoriteButton", () => {
  it("saves and removes, rolling back on failure", async () => {
    const u = userEvent.setup();
    nav.pathname = "/providers/x";
    render(
      <>
        <Toaster />
        <FavoriteButton providerId={1} initial={false} withLabel />
      </>,
    );
    mockApi({ "PUT /me/favorites/1": { isFavorite: true } });
    await u.click(screen.getByRole("button", { name: "Save to favorites" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove from favorites" })).toHaveTextContent("Saved"));
    expect(nav.router.refresh).toHaveBeenCalled();
    mockApi({ "DELETE /me/favorites/1": json({}, 500) });
    const error = vi.spyOn(toast, "error");
    await u.click(screen.getByRole("button", { name: "Remove from favorites" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Could not update favorites"));
    expect(screen.getByRole("button", { name: "Remove from favorites" })).toBeInTheDocument();
    mockApi({ "DELETE /me/favorites/1": { isFavorite: false } });
    await u.click(screen.getByRole("button", { name: "Remove from favorites" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save to favorites" })).toHaveTextContent("Save"));
  });
  it("asks guests to log in", async () => {
    const u = userEvent.setup();
    nav.pathname = "/providers/x";
    render(
      <>
        <Toaster />
        <FavoriteButton providerId={1} initial={false} />
      </>,
    );
    mockApi({ "PUT /me/favorites/1": json({ error: { message: "Sign in" } }, 401) });
    await u.click(screen.getByRole("button", { name: "Save to favorites" }));
    await u.click(await screen.findByRole("button", { name: "Log in" }));
    expect(nav.router.push).toHaveBeenCalledWith("/login?next=%2Fproviders%2Fx");
  });
});

describe("cards and tiles", () => {
  it("ProviderCard shows a full result", () => {
    render(<ProviderCard provider={provider({ planTier: "pro", subcategories: ["TV Repair", "AC Repair", "Fridge", "Washer"] }) as never} highlight="Fridge" topMatch />);
    expect(screen.getByText("Top match")).toBeInTheDocument();
    expect(screen.getByLabelText("Verified")).toBeInTheDocument();
    expect(screen.getByText("5+ yrs")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Services" }).firstChild).toHaveTextContent("Fridge");
    expect(screen.getByText("per visit")).toBeInTheDocument();
    expect(screen.getByText("Pro Partner")).toBeInTheDocument();
  });
  it("ProviderCard shows a bare result", () => {
    render(<ProviderCard provider={provider({ isSponsored: true, yearsExperience: null, shortDescription: "", subcategories: [], locality: null, distanceKm: null, startingPrice: null, priceUnit: null, verificationStatus: "none", primaryCategory: null, coverUrl: "https://x/c.png" }) as never} />);
    expect(screen.getByText("Sponsored")).toBeInTheDocument();
    expect(screen.getByText("Price on request")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Services" })).toBeNull();
  });
  it("ProviderCard with a price but no unit", () => {
    render(<ProviderCard provider={provider({ priceUnit: null }) as never} />);
    expect(screen.queryByText("per visit")).toBeNull();
  });
  it("ProviderTile variants", () => {
    const { unmount } = render(<ProviderTile provider={provider({ planTier: "business" }) as never} />);
    expect(screen.getByText("Top partner")).toBeInTheDocument();
    unmount();
    const second = render(<ProviderTile provider={provider() as never} source="category_browse" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    second.unmount();
    render(<ProviderTile provider={provider({ verificationStatus: "none", primaryCategory: null, startingPrice: null, locality: null }) as never} />);
    expect(screen.getByText("Price on request")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).toBeNull();
  });
  it("SimilarProviders", () => {
    render(<SimilarProviders providers={[provider(), provider({ id: 2, slug: "b", distanceKm: null }), provider({ id: 3, slug: "c", distanceKm: null, locality: null, primaryCategory: null })] as never} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByText("1.2 km away")).toBeInTheDocument();
  });
});

describe("profile sections", () => {
  it("ProfileHeader with every badge, and a bare one", () => {
    const { unmount } = render(
      <ProfileHeader
        p={detail({ planTier: "pro", isSponsored: true, businessType: "company", badges: [{ id: 1, name: "Top Rated" }, { id: 2, name: "Pro Partner" }], totalReviews: 1 }) as never}
        chips={["TV Repair", "AC"]}
        extraChips={2}
        facts={[{ icon: Star, value: "5 yrs", label: "Experience" }]}
      />,
    );
    expect(screen.getByText(/Company/)).toBeInTheDocument();
    expect(screen.getByText("(1 review)")).toBeInTheDocument();
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    unmount();
    render(<ProfileHeader p={detail({ primaryCategory: null, totalReviews: 0, locality: null, verificationStatus: "none", badges: [] }) as never} chips={[]} extraChips={0} facts={[]} />);
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    render(<ProfileHeader p={detail({ totalReviews: 12 }) as never} chips={["x"]} extraChips={0} facts={[]} />);
    expect(screen.getByText(/Individual pro/)).toBeInTheDocument();
    expect(screen.getByText("(12 reviews)")).toBeInTheDocument();
  });
  it("ContactCard, OpeningHours, ServicesList, ReviewsSummary, sections", async () => {
    mockApi({ "/api/session": { user: null, unread: 0 } });
    render(
      <SessionProvider>
        <ContactCard p={detail() as never} />
        <ContactCard p={detail({ startingPrice: null, email: null, website: null, isAvailable: false }) as never} />
        <ContactCard p={detail({ priceUnit: null }) as never} />
        <OpeningHours p={detail({ is24x7: true }) as never} />
        <OpeningHours p={detail({ isAvailable: false }) as never} />
        <ServicesList services={detail().services as never} />
        <ReviewsSummary p={detail({ totalReviews: 1 }) as never} />
        <ReviewsSummary p={{ avgRating: 0, totalReviews: 0, ratingBreakdown: [{ rating: 5, count: 0 }] }} />
        <ProfileSection title="Title" action={<span>act</span>}>body</ProfileSection>
        <ProfileSection>no title</ProfileSection>
        <SideCard title="Side">side</SideCard>
      </SessionProvider>,
    );
    await act(async () => undefined);
    expect(screen.getAllByText("Price on request")).toHaveLength(1);
    expect(screen.getByText("Available 24x7 for emergencies")).toBeInTheDocument();
    expect(screen.getAllByText("(today)")).toHaveLength(2);
    expect(screen.getByText("Main service")).toBeInTheDocument();
    expect(screen.getByText("On request")).toBeInTheDocument();
    expect(screen.getByLabelText("5 stars: 75%")).toBeInTheDocument();
    expect(screen.getByLabelText("5 stars: 0%")).toBeInTheDocument();
    expect(screen.getByText("1 review")).toBeInTheDocument();
  });
  it("expandable grids and chips", async () => {
    const u = userEvent.setup();
    render(
      <>
        <ExpandableGrid title="Grid" items={[1, 2, 3].map((n) => <span key={n}>item {n}</span>)} initial={2} moreLabel="View all" />
        <ExpandableGrid title="Small" items={[<span key="a">only</span>]} initial={2} moreLabel="nope" />
        <ExpandableChips header={<h3>Areas</h3>} chips={["A", "B", "C"]} initial={1} noun="areas" linkLabel="See all areas" />
        <ExpandableChips header={<h3>None</h3>} chips={[]} initial={1} noun="x" linkLabel="x" />
      </>,
    );
    expect(screen.queryByText("item 3")).toBeNull();
    await u.click(screen.getByRole("button", { name: "View all" }));
    expect(screen.getByText("item 3")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Show less" }));
    await u.click(screen.getByRole("button", { name: "+2 areas" }));
    expect(screen.getByText("C")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Show less" }));
    await u.click(screen.getByRole("button", { name: "See all areas" }));
    expect(screen.getByText("B")).toBeInTheDocument();
  });
  it("section nav follows the visible section", () => {
    let callback!: (entries: unknown[]) => void;
    const observe = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: typeof callback) {
        callback = cb;
      }
      observe = observe;
      disconnect() {}
    });
    render(
      <>
        <SectionNav reviewCount={3} photoCount={2} hidden={["similar"]} />
        <div id="overview" />
        <div id="reviews" />
      </>,
    );
    // Sections render after the nav in this test, so re-render to let the effect find them.
    const { unmount } = render(
      <>
        <div id="photos" />
        <SectionNav reviewCount={0} photoCount={0} />
      </>,
    );
    expect(observe).toHaveBeenCalled();
    act(() => callback([{ isIntersecting: false }, { isIntersecting: true, boundingClientRect: { top: 50 }, target: { id: "reviews" } }, { isIntersecting: true, boundingClientRect: { top: 10 }, target: { id: "photos" } }]));
    act(() => callback([]));
    expect(screen.getAllByRole("link", { name: /Photos/ })[1]).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("(3)")).toBeInTheDocument();
    unmount();
  });
  it("section nav with no sections on the page", () => {
    render(<SectionNav reviewCount={0} photoCount={0} />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "true");
  });
  it("sticky column measures itself", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 300 });
    const { container } = render(<StickyColumn as="aside">tall</StickyColumn>);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect((container.firstChild as HTMLElement).style.top).toBe("80px");
  });
  it("back button", async () => {
    const u = userEvent.setup();
    render(<BackButton />);
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    await u.click(screen.getByRole("button", { name: /Back/ }));
    expect(nav.router.push).toHaveBeenCalledWith("/");
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    await u.click(screen.getByRole("button", { name: /Back/ }));
    expect(nav.router.back).toHaveBeenCalled();
  });
  it("location map", async () => {
    render(<LocationMap lat={1} lng={2} radiusKm={3} label="Shop" />);
    expect(await screen.findByTestId("marker")).toHaveTextContent("Shop");
  });
});

describe("photos", () => {
  const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, title: i ? `P${i}` : "", imageUrl: `https://img.test/${i}.webp` }));

  it("shows a stock photo when there are none", () => {
    render(<PhotoGallery photos={[]} businessName="Shop" categorySlug="plumbing" />);
    expect(screen.getByText("Representative photo")).toBeInTheDocument();
  });
  it.each([1, 2, 3, 4, 5, 7])("lays out %i photos", (n) => {
    render(
      <PhotoLightbox photos={photos(n)} businessName="Shop">
        <PhotoGallery photos={photos(n)} businessName="Shop" />
      </PhotoLightbox>,
    );
    expect(screen.getByRole("button", { name: new RegExp(`Show all ${n} photos?`) })).toBeInTheDocument();
    if (n > 5) expect(screen.getByText(`, ${n - 5} more than shown here`)).toBeInTheDocument();
  });
  it("opens the viewer and steps through with buttons and keys", async () => {
    const u = userEvent.setup();
    render(
      <PhotoLightbox photos={photos(3)} businessName="Shop">
        <PhotoTrigger index={1}>open</PhotoTrigger>
      </PhotoLightbox>,
    );
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await u.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getAllByText("Shop").length).toBeGreaterThan(0);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await u.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "x" });
    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("2 / 3")).toBeNull());
  });
  it("a single photo has no arrows", async () => {
    const u = userEvent.setup();
    render(
      <PhotoLightbox photos={photos(1)} businessName="Shop">
        <PhotoTrigger index={0}>open</PhotoTrigger>
      </PhotoLightbox>,
    );
    await u.click(screen.getByRole("button", { name: "open" }));
    expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
    render(<PhotoTrigger index={0}>outside</PhotoTrigger>);
    // Outside a PhotoLightbox the trigger does nothing.
    fireEvent.click(screen.getByText("outside"));
  });
});

describe("share and report", () => {
  it("shares natively or copies the link", async () => {
    const u = userEvent.setup();
    const share = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("dismissed"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<ShareButton title="Shop" withLabel />);
    await u.click(screen.getByRole("button", { name: /Share/ }));
    await u.click(screen.getByRole("button", { name: /Share/ }));
    expect(share).toHaveBeenCalledTimes(2);
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const success = vi.spyOn(toast, "success");
    const { unmount } = render(<ShareButton title="Shop" />);
    await u.click(screen.getAllByRole("button", { name: "Share" }).at(-1)!);
    unmount();
    expect(success).toHaveBeenCalledWith("Link copied");
  });
  it("reports a listing with validation", async () => {
    const u = userEvent.setup();
    render(<ReportListing slug="shop" />);
    await u.click(screen.getByRole("button", { name: /Report this listing/ }));
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("at least 5 characters");
    const box = screen.getByPlaceholderText("What is wrong with this listing?");
    await u.type(box, "a");
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.change(box, { target: { value: "x".repeat(501) } });
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("under 500");
    fireEvent.change(box, { target: { value: "Wrong phone number" } });
    mockApi({ "POST /providers/shop/report": json({ error: { message: "Slow down" } }, 429) });
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    expect(await screen.findByText("Slow down")).toBeInTheDocument();
    mockApi({ "POST /providers/shop/report": () => Promise.reject(new TypeError("x")) as never });
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    expect(await screen.findByText("Could not send the report. Please try again.")).toBeInTheDocument();
    mockApi({ "POST /providers/shop/report": { ok: true } });
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("reports a review and cancels", async () => {
    const u = userEvent.setup();
    render(<ReportReview reviewId={4} />);
    await u.click(screen.getByRole("button", { name: /Report/ }));
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    await u.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    mockApi({ "POST /reviews/4/report": { ok: true } });
    await u.click(screen.getByRole("button", { name: /Report/ }));
    await u.type(screen.getByPlaceholderText("What is wrong with this review?"), "Fake review here");
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("ReviewsList", () => {
  const page = (reviews: unknown[], p = 1, totalPages = 2, total = 3) => ({ reviews, page: p, pageSize: 6, total, totalPages });

  it("shows the empty state", () => {
    render(<ReviewsList slug="s" initial={page([], 1, 1, 0) as never} providerName="Shop" />);
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
  });
  it("loads more, re-sorts and retries", async () => {
    const u = userEvent.setup();
    render(
      <ReviewsList
        slug="s"
        providerName="Shop"
        initial={page([review({ providerReply: "Thanks!", photos: ["https://img.test/p.webp"], author: { name: "Ravi Kumar", photoUrl: "https://img.test/a.webp" } }), review({ id: 2, reviewText: null, isVerifiedContact: false })]) as never}
      />,
    );
    expect(screen.getByText("Reply from Shop")).toBeInTheDocument();
    expect(screen.getByAltText("Photo 1 from Ravi Kumar")).toBeInTheDocument();
    mockApi({ "/providers/s/reviews": json({}, 500) });
    await u.click(screen.getByRole("button", { name: /Show more reviews/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load reviews.");
    mockApi({ "/providers/s/reviews": page([review({ id: 3, reviewText: "Third one" })], 2, 2) });
    await u.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Third one")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show more reviews/ })).toBeNull();
    const fetch = mockApi({ "/providers/s/reviews": page([review({ id: 9, reviewText: "Lowest first" })], 1, 1) });
    await u.click(screen.getByRole("combobox"));
    await u.click(await screen.findByRole("option", { name: "Lowest rated" }));
    expect(await screen.findByText("Lowest first")).toBeInTheDocument();
    expect(screen.queryByText("Third one")).toBeNull();
    expect(String(fetch.mock.calls[0]![0])).toContain("sort=lowest");
  });
});

describe("ReviewForm", () => {
  it("sends guests to log in", async () => {
    const u = userEvent.setup();
    nav.pathname = "/providers/shop";
    render(<ReviewForm providerId={1} providerName="Shop" signedIn={false} existing={null} minLength={10} />);
    await u.click(screen.getByRole("button", { name: /Write a Review/ }));
    expect(nav.router.push).toHaveBeenCalledWith("/login?next=%2Fproviders%2Fshop");
  });
  it("posts a new review", async () => {
    const u = userEvent.setup();
    render(<ReviewForm providerId={1} providerName="Shop" slug="shop" signedIn existing={null} minLength={10} />);
    await u.click(screen.getByRole("button", { name: /Write a Review/ }));
    expect(screen.getByRole("dialog", { name: "Review Shop" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /Post review/ }));
    expect(await screen.findByText("Pick a star rating")).toBeInTheDocument();
    expect(screen.getByText("Tell others a little more, at least 10 characters")).toBeInTheDocument();
    const stars = screen.getByRole("radiogroup");
    fireEvent.mouseEnter(screen.getByRole("radio", { name: /3 stars/ }));
    expect(stars).toHaveTextContent("Good");
    fireEvent.mouseLeave(stars);
    await u.click(screen.getByRole("radio", { name: /1 star, Poor/ }));
    await u.click(screen.getByRole("radio", { name: /4 stars/ }));
    await u.type(screen.getByLabelText(/Your experience/), "Great fast service indeed");
    mockApi({ "POST /reviews": json({ error: { message: "You already reviewed" } }, 409) });
    await u.click(screen.getByRole("button", { name: /Post review/ }));
    expect(await screen.findByText("You already reviewed")).toBeInTheDocument();
    mockApi({ "POST /reviews": () => Promise.reject(new TypeError("x")) as never });
    await u.click(screen.getByRole("button", { name: /Post review/ }));
    expect(await screen.findByText("Could not save your review")).toBeInTheDocument();
    const fetch = mockApi({ "POST /reviews": { review: {} } });
    await u.click(screen.getByRole("button", { name: /Post review/ }));
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ providerId: 1, rating: 4, reviewText: "Great fast service indeed", photos: [] });
  });
  it("explains why a signed-in visitor cannot review yet, instead of a button", () => {
    nav.pathname = "/providers/shop";
    const props = { providerId: 1, providerName: "Shop", signedIn: true, existing: null, minLength: 1 } as const;
    const { rerender } = render(<ReviewForm {...props} eligibility={{ canReview: false, reason: "no_contact", availableAt: null }} />);
    expect(screen.queryByRole("button", { name: /Write a Review/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Call or WhatsApp them from this page/)).toBeInTheDocument();
    rerender(<ReviewForm {...props} eligibility={{ canReview: false, reason: "too_soon", availableAt: "2026-09-29T10:00:00Z" }} />);
    expect(screen.getByText(/You can review them from/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tell us they responded" })).toHaveAttribute("href", "/dashboard/contacts");
    rerender(<ReviewForm {...props} eligibility={{ canReview: false, reason: "verify_email", availableAt: null }} />);
    expect(screen.getByRole("link", { name: "Confirm your email" })).toHaveAttribute("href", "/verify-email?next=%2Fproviders%2Fshop");
    const { container } = render(<ReviewForm {...props} eligibility={{ canReview: false, reason: "own_business", availableAt: null }} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ReviewForm {...props} eligibility={{ canReview: true, reason: null, availableAt: null }} />);
    expect(screen.getByRole("button", { name: /Write a Review/ })).toBeInTheDocument();
  });
  it("says when a review waits for the team, and locks old ratings", async () => {
    const u = userEvent.setup();
    const { unmount } = render(<ReviewForm providerId={1} providerName="Shop" signedIn existing={{ id: 5, rating: 3, reviewText: "Okay work", status: "pending" }} minLength={1} />);
    await u.click(screen.getByRole("button", { name: /Edit your review/ }));
    expect(screen.getByText(/Our team is checking this review/)).toBeInTheDocument();
    unmount();
    render(<ReviewForm providerId={1} providerName="Shop" signedIn existing={{ id: 6, rating: 3, reviewText: "Okay work", status: "published", ratingLocked: true }} minLength={1} />);
    await u.click(screen.getByRole("button", { name: /Edit your review/ }));
    expect(screen.getByText(/Stars can only be changed in the first week/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /5 stars/ })).toBeDisabled();
  });
  it("opens straight away from a review reminder", () => {
    window.history.replaceState(null, "", "/providers/shop?review=1");
    render(<ReviewForm providerId={1} providerName="Shop" signedIn existing={null} eligibility={{ canReview: true, reason: null, availableAt: null }} minLength={1} />);
    expect(screen.getByRole("dialog", { name: "Review Shop" })).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });
  it("edits an existing review, and cancels", async () => {
    const u = userEvent.setup();
    render(<ReviewForm providerId={1} providerName="Shop" signedIn existing={{ id: 5, rating: 3, reviewText: "Okay work" }} minLength={1} />);
    await u.click(screen.getByRole("button", { name: /Edit your review/ }));
    await u.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await u.click(screen.getByRole("button", { name: /Edit your review/ }));
    await u.clear(screen.getByLabelText(/Your experience/));
    await u.click(screen.getByRole("button", { name: /Save changes/ }));
    expect(await screen.findByText("Write a few words about your experience")).toBeInTheDocument();
    await u.type(screen.getByLabelText(/Your experience/), "Better now");
    const fetch = mockApi({ "PATCH /reviews/5": { review: {} } });
    await u.click(screen.getByRole("button", { name: /Save changes/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
  });
  it("starts from empty text for a review without words", async () => {
    const u = userEvent.setup();
    render(<ReviewForm providerId={1} providerName="Shop" signedIn existing={{ id: 5, rating: 3, reviewText: null, photos: ["https://x/p.webp"] }} minLength={1} />);
    await u.click(screen.getByRole("button", { name: /Edit your review/ }));
    expect(screen.getByLabelText(/Your experience/)).toHaveValue("");
    expect(screen.getByAltText("Photo 1")).toBeInTheDocument();
  });
});

describe("viewer state on a cached profile", () => {
  it("loads the visitor's favorite and review once the session is known", async () => {
    const u = userEvent.setup();
    const fetch = mockApi({
      "/api/session": { user: user(), unread: 0 },
      "POST /providers/shop/visit": { isFavorite: true, myReview: { id: 5, rating: 4, reviewText: "Good", photos: [] } },
    });
    render(
      <SessionProvider>
        <ProviderViewerState slug="shop">
          <ProfileFavoriteButton providerId={1} />
          <ProfileReviewForm providerId={1} providerName="Shop" slug="shop" minLength={1} />
        </ProviderViewerState>
      </SessionProvider>,
    );
    expect(await screen.findByRole("button", { name: "Remove from favorites" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit your review/ })).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url]) => String(url).includes("/visit"))).toBe(true);
    await u.click(document.body);
  });
  it("falls back to a guest view when the visit fails, and ignores late answers", async () => {
    mockApi({ "/api/session": { user: null, unread: 0 }, "POST /providers/shop/visit": json({}, 500) });
    const { unmount } = render(
      <SessionProvider>
        <ProviderViewerState slug="shop">
          <ProfileFavoriteButton providerId={1} />
          <ProfileReviewForm providerId={1} providerName="Shop" slug="shop" minLength={1} />
        </ProviderViewerState>
      </SessionProvider>,
    );
    expect(await screen.findByRole("button", { name: "Save to favorites" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Write a Review/ })).toBeInTheDocument();
    unmount();
    let resolveOk!: (r: Response) => void;
    let resolveFail!: (r: Response) => void;
    let n = 0;
    mockApi({ "/api/session": { user: null, unread: 0 }, "POST /providers/shop/visit": () => new Promise<Response>((r) => (n++ ? (resolveFail = r) : (resolveOk = r))) });
    const second = render(
      <SessionProvider>
        <ProviderViewerState slug="shop">
          <span />
        </ProviderViewerState>
      </SessionProvider>,
    );
    await waitFor(() => expect(resolveOk).toBeDefined());
    second.rerender(
      <SessionProvider>
        <ProviderViewerState slug="other">
          <span />
        </ProviderViewerState>
      </SessionProvider>,
    );
    second.unmount();
    await act(async () => resolveOk(json({ isFavorite: true, myReview: null })));
    if (resolveFail) await act(async () => resolveFail(json({}, 500)));
  });
});
