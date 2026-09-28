// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { SearchBar } from "@/components/search/search-bar";
import { LocationPicker } from "@/components/search/location-picker";
import { LocationSwitcher } from "@/components/search/location-switcher";
import { FilterBar } from "@/components/search/filter-bar";
import { FiltersSheet } from "@/components/search/filters";
import { MapViewButton, SortSelect } from "@/components/search/results-toolbar";
import { ResultHover, ResultsHoverProvider, useHoveredResult } from "@/components/search/results-hover";
import { ResultsSection, one } from "@/components/search/results-section";
import { SearchHero } from "@/components/search/search-hero";
import { CategoryListing, getCategory, listingMetadata } from "@/components/search/category-listing";
import { useSubcategory } from "@/components/search/use-url-params";
import { DEFAULT_LOCATION } from "@/lib/default-location";
import { HERO_IMAGE } from "@/lib/stock-images";
import { nav } from "../next-state";
import { json, mockApi, provider } from "../helpers";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children, zIndexOffset }: { children?: React.ReactNode; zIndexOffset?: number }) => <div data-testid="marker" data-z={zIndexOffset}>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Circle: () => <div data-testid="circle" />,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const categories = [
  { id: 1, name: "Electronics Repair", slug: "electronics-repair", description: null, iconUrl: null, uiTemplate: "default", providerCount: 5, subcategories: [{ id: 11, categoryId: 1, name: "TV Repair", slug: "tv-repair" }] },
  { id: 2, name: "Plumbing", slug: "plumbing", description: null, iconUrl: null, uiTemplate: "default", providerCount: 0, subcategories: [] },
];
const loc = (label: string, extra: Record<string, unknown> = {}) => ({ ...DEFAULT_LOCATION, label, name: label, ...extra });
const lastPush = () => nav.router.push.mock.calls.at(-1)![0] as string;

describe("SearchBar", () => {
  it("suggests as you type and goes where a suggestion points", async () => {
    const u = userEvent.setup();
    mockApi({
      "/search/suggest": (url: URL) =>
        url.searchParams.get("q") === "fail"
          ? json({}, 500)
          : json({
              suggestions: [
                { type: "service", label: "TV Repair", slug: "tv-repair", categorySlug: "electronics-repair", context: "Electronics Repair" },
                { type: "category", label: "Electronics Repair", slug: "electronics-repair" },
                { type: "provider", label: "Sharma TV", slug: "sharma-tv", context: "Mumbai" },
              ],
            }),
    });
    render(<SearchBar variant="joined" initialLocation={loc("Andheri")} />);
    const input = screen.getByRole("combobox", { name: "What do you need?" });
    await u.type(input, "t");
    expect(screen.queryByRole("listbox")).toBeNull();
    await u.type(input, "v");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Service in Electronics Repair")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Business in Mumbai")).toBeInTheDocument();

    await u.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "service-suggestions-joined-lg-0");
    await u.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", "service-suggestions-joined-lg-2");
    await u.keyboard("{ArrowDown}{ArrowUp}{ArrowUp}");
    await u.keyboard("{Enter}");
    expect(lastPush()).toContain("category=electronics-repair");

    const reopen = async () => {
      act(() => input.blur());
      await u.click(input);
    };
    await reopen();
    fireEvent.mouseDown(screen.getByRole("option", { name: /Sharma TV/ }));
    await u.click(screen.getByRole("option", { name: /Sharma TV/ }));
    expect(lastPush()).toBe("/providers/sharma-tv");
    await reopen();
    await u.click(screen.getByRole("option", { name: /^TV Repair/ }));
    expect(lastPush()).toContain("sub=tv-repair");
    await reopen();
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    await u.keyboard("{ArrowDown}");

    // Clicking outside closes the list; clicking inside does not.
    await reopen();
    fireEvent.mouseDown(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();

    await u.clear(input);
    await u.type(input, "fail");
    await act(async () => void (await new Promise((r) => setTimeout(r, 250))));
    expect(screen.queryByRole("listbox")).toBeNull();
    await u.clear(input);
    await u.type(input, "plain words");
    await u.click(screen.getByRole("button", { name: "Search" }));
    expect(lastPush()).toContain("q=plain+words");
  });
  it("follows new props and the saved location, in split and compact looks", async () => {
    document.cookie = `dnf_location=${encodeURIComponent(JSON.stringify(loc("Saved Place")))}; path=/`;
    const { rerender } = render(<SearchBar initialQuery="a" size="md" />);
    expect(screen.getByText("Saved Place")).toBeInTheDocument();
    rerender(<SearchBar initialQuery="b" size="md" initialLocation={loc("Other")} />);
    expect(screen.getByRole("combobox", { name: "Service" })).toHaveValue("b");
    expect(screen.getByText("Other")).toBeInTheDocument();
    rerender(<SearchBar variant="compact" />);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
  it("uses the default location with no cookie", () => {
    render(<SearchBar />);
    expect(screen.getByText(DEFAULT_LOCATION.label)).toBeInTheDocument();
  });
});

describe("LocationPicker", () => {
  it("searches areas and picks one", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    mockApi({
      "/locations": (url: URL) =>
        url.searchParams.get("q") === "zz"
          ? json({}, 500)
          : json({
              locations: [
                loc("Mumbai, Maharashtra", { kind: "city", name: "Mumbai", state: "Maharashtra", providerCount: 4 }),
                loc("Andheri, Mumbai", { kind: "area", name: "Andheri", city: "Mumbai", providerCount: 0 }),
                loc("Kothrud, Pune", { kind: "place", name: "Kothrud", city: "Pune", state: "Maharashtra" }),
                loc("Pune", { kind: "place", name: "Pune", city: "Pune", state: "" }),
              ],
            }),
    });
    render(<LocationPicker value={loc("Here")} onChange={onChange} hideLabel />);
    await u.click(screen.getByRole("button", { name: /Here/ }));
    expect(await screen.findByText("Maharashtra · city · 4 providers")).toBeInTheDocument();
    expect(screen.getByText("Pune, Maharashtra · no providers listed yet")).toBeInTheDocument();
    expect(screen.getByText("· no providers listed yet")).toBeInTheDocument();
    await u.type(screen.getByLabelText("Search area, locality or city"), "zz");
    expect(await screen.findByText("No matching areas yet")).toBeInTheDocument();
    await u.clear(screen.getByLabelText("Search area, locality or city"));
    await u.click(await screen.findByRole("button", { name: /Andheri/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "Andheri" }));
  });
  it("uses the current location, with or without a name for it", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    mockApi({ "/locations": { locations: [] }, "/locations/reverse": { location: loc("Near me") } });
    let succeed = true;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: (p: unknown) => void, fail: () => void) => (succeed ? ok({ coords: { latitude: 19.1234567, longitude: 72.8 } }) : fail()),
      },
    });
    const error = vi.spyOn(toast, "error");
    render(<LocationPicker value={loc("Here")} onChange={onChange} />);
    expect(screen.getByText("Location")).toBeInTheDocument();
    const open = () => u.click(screen.getByRole("button", { name: /Here/ }));
    await open();
    await u.click(screen.getByRole("button", { name: "Use my current location" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ label: "Near me" })));
    mockApi({ "/locations": { locations: [] }, "/locations/reverse": json({}, 500) });
    await open();
    await u.click(screen.getByRole("button", { name: "Use my current location" }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ label: "Current location", latitude: 19.123457 })));
    succeed = false;
    await open();
    await u.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(error).toHaveBeenCalledWith("We could not read your location. Pick an area from the list instead.");
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    await u.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(error).toHaveBeenCalledWith("Your browser does not support location access");
  });
  it("location switcher writes the place into the URL", async () => {
    const u = userEvent.setup();
    nav.pathname = "/services/plumbing";
    nav.search = "page=3";
    mockApi({ "/locations": { locations: [loc("Andheri, Mumbai", { kind: "area", name: "Andheri", latitude: 1, longitude: 2 })] } });
    render(<LocationSwitcher location={loc("Here")} />);
    await u.click(screen.getByRole("button", { name: /Here/ }));
    await u.click(await screen.findByRole("button", { name: /Andheri/ }));
    expect(lastPush()).toBe("/services/plumbing?lat=1&lng=2&loc=Andheri%2C+Mumbai");
    expect(screen.getByText("Andheri, Mumbai")).toBeInTheDocument();
  });
});

describe("filters", () => {
  it("quick filter bar writes each choice to the URL", async () => {
    const u = userEvent.setup();
    nav.pathname = "/search";
    nav.search = "category=electronics-repair&sub=tv-repair&minRating=4&openNow=true&verified=true&radius=10&page=2";
    render(<FilterBar categories={categories} defaultRadius={15} />);
    expect(screen.getByRole("button", { name: /All filters/ })).toHaveTextContent("6");
    await u.click(screen.getByRole("button", { name: /Open now/ }));
    expect(lastPush()).not.toContain("openNow");
    expect(lastPush()).not.toContain("page=");
    await u.click(screen.getByRole("button", { name: /Verified only/ }));
    expect(lastPush()).not.toContain("verified");
    await u.click(screen.getByRole("button", { name: /Rating 4\+/ }));
    await u.click(screen.getByRole("button", { name: "Any rating" }));
    expect(lastPush()).not.toContain("minRating");
    await u.click(screen.getByRole("button", { name: "4.5+" }));
    await u.keyboard("{Escape}");
    expect(lastPush()).toContain("minRating=4.5");
    await u.click(screen.getByRole("button", { name: /Electronics Repair/ }));
    await u.click(screen.getByRole("button", { name: "Plumbing" }));
    expect(lastPush()).toContain("category=plumbing");
    await u.click(screen.getByRole("button", { name: "All categories" }));
    expect(lastPush()).not.toContain("category=");
    await u.keyboard("{Escape}");
    await u.click(screen.getByRole("button", { name: /^TV Repair/ }));
    await u.click(screen.getByRole("button", { name: "All services" }));
    expect(lastPush()).not.toContain("sub=");
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: /TV Repair/ }));
    expect(lastPush()).toContain("sub=tv-repair");
    await u.keyboard("{Escape}");
    await u.click(screen.getByRole("button", { name: /Within 10 km/ }));
    const thumb = screen.getByRole("slider");
    thumb.focus();
    await u.keyboard("{ArrowRight}");
    expect(await screen.findByText("Within 11 km")).toBeInTheDocument();
    await waitFor(() => expect(lastPush()).toContain("radius=11"));
  });
  it("quick filter bar with nothing chosen", async () => {
    const u = userEvent.setup();
    nav.pathname = "/search";
    render(<FilterBar categories={categories} defaultRadius={15} />);
    expect(screen.getByRole("button", { name: /Within 15 km/ })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /Open now/ }));
    expect(lastPush()).toBe("/search?openNow=true");
    await u.click(screen.getByRole("button", { name: /Verified only/ }));
    expect(lastPush()).toBe("/search?verified=true");
    expect(screen.queryByRole("button", { name: /^Service/ })).toBeNull();
    await u.click(screen.getByRole("button", { name: /^Category/ }));
    await u.click(screen.getByRole("button", { name: "Electronics Repair" }));
    expect(lastPush()).toBe("/search?category=electronics-repair");
  });
  it("category pages: the subcategory is the page, not a filter", async () => {
    const u = userEvent.setup();
    nav.pathname = "/services/electronics-repair";
    nav.search = "lat=1&sub=x";
    render(<FilterBar lockedCategory={categories[0]} lockedSub="tv-repair" defaultRadius={15} />);
    expect(screen.queryByRole("button", { name: /^Category/ })).toBeNull();
    await u.click(screen.getByRole("button", { name: /^TV Repair/ }));
    await u.click(screen.getByRole("button", { name: "All services" }));
    expect(lastPush()).toBe("/services/electronics-repair?lat=1");
  });
  it("the full filters sheet", async () => {
    const u = userEvent.setup();
    nav.pathname = "/search";
    nav.search = "category=electronics-repair&radius=20";
    render(<FiltersSheet categories={categories} defaultRadius={15} activeCount={0} />);
    await u.click(screen.getByRole("button", { name: /All filters/ }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("Within 20 km")).toBeInTheDocument();
    await u.click(within(sheet).getByRole("button", { name: "TV Repair" }));
    expect(lastPush()).toContain("sub=tv-repair");
    expect(lastPush()).not.toContain("q=");
    await u.click(within(sheet).getByRole("button", { name: "All" }));
    await u.click(within(sheet).getByRole("button", { name: "4.0+" }));
    expect(lastPush()).toContain("minRating=4");
    await u.click(within(sheet).getByRole("button", { name: "Any" }));
    await u.click(within(sheet).getByRole("switch", { name: "Open now" }));
    expect(lastPush()).toContain("openNow=true");
    await u.click(within(sheet).getByRole("switch", { name: "Verified only" }));
    expect(lastPush()).toContain("verified=true");
    await u.click(within(sheet).getByRole("button", { name: "Reset filters" }));
    expect(lastPush()).toBe("/search");
    await u.click(within(sheet).getByRole("combobox"));
    await u.click(await screen.findByRole("option", { name: "Plumbing" }));
    expect(lastPush()).toContain("category=plumbing");
    const slider = within(screen.getByRole("dialog")).getByRole("slider");
    slider.focus();
    await u.keyboard("{ArrowLeft}");
    await waitFor(() => expect(lastPush()).toContain("radius=19"));
  });
  it("sheet: choosing all categories, switches on, locked category reset", async () => {
    const u = userEvent.setup();
    nav.pathname = "/search";
    nav.search = "openNow=true&verified=true";
    const { unmount } = render(<FiltersSheet categories={categories} defaultRadius={15} activeCount={2} />);
    expect(screen.getByRole("button", { name: /All filters/ })).toHaveTextContent("2");
    await u.click(screen.getByRole("button", { name: /All filters/ }));
    await u.click(within(screen.getByRole("dialog")).getByRole("switch", { name: "Open now" }));
    expect(lastPush()).not.toContain("openNow");
    await u.click(within(screen.getByRole("dialog")).getByRole("switch", { name: "Verified only" }));
    await u.click(within(screen.getByRole("dialog")).getByRole("combobox"));
    await u.click(await screen.findByRole("option", { name: "All categories" }));
    unmount();
    nav.pathname = "/services/electronics-repair";
    nav.search = "";
    render(<FiltersSheet lockedCategory={categories[0]} defaultRadius={15} activeCount={0} />);
    await u.click(screen.getByRole("button", { name: /All filters/ }));
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: "TV Repair" }));
    expect(lastPush()).toBe("/services/electronics-repair/tv-repair");
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reset filters" }));
    expect(lastPush()).toBe("/services/electronics-repair");
  });
  it("the slider follows URL changes", () => {
    nav.search = "radius=5";
    const { rerender } = render(<FilterBar defaultRadius={15} />);
    nav.search = "radius=7";
    rerender(<FilterBar defaultRadius={15} />);
    expect(screen.getByRole("button", { name: /Within 7 km/ })).toBeInTheDocument();
  });
  it("sheet slider follows URL changes", async () => {
    const u = userEvent.setup();
    nav.search = "radius=5";
    const { rerender } = render(<FiltersSheet defaultRadius={15} activeCount={0} />);
    await u.click(screen.getByRole("button", { name: /All filters/ }));
    nav.search = "radius=8";
    rerender(<FiltersSheet defaultRadius={15} activeCount={0} />);
    expect(within(screen.getByRole("dialog")).getByText("Within 8 km")).toBeInTheDocument();
  });
  it("useSubcategory reads the search page's sub", () => {
    nav.search = "sub=tv-repair";
    let value: ReturnType<typeof useSubcategory> | null = null;
    const Probe = () => ((value = useSubcategory()), null);
    render(<Probe />);
    expect(value!.selected).toBe("tv-repair");
  });
});

describe("results toolbar and hover", () => {
  it("sorts and switches views", async () => {
    const u = userEvent.setup();
    nav.pathname = "/search";
    nav.search = "sort=rating&page=2";
    render(
      <>
        <SortSelect />
        <MapViewButton view="list" variant="overlay" />
        <MapViewButton view="map" variant="overlay" />
        <MapViewButton view="list" variant="floating" />
        <MapViewButton view="map" variant="floating" />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Sort results" })).toHaveTextContent("Highest rated");
    await u.click(screen.getByRole("combobox", { name: "Sort results" }));
    await u.click(await screen.findByRole("option", { name: "Relevance" }));
    expect(lastPush()).toBe("/search");
    await u.click(screen.getByRole("combobox", { name: "Sort results" }));
    await u.click(await screen.findByRole("option", { name: "Nearest first" }));
    expect(lastPush()).toBe("/search?sort=distance");
    await u.click(screen.getByRole("button", { name: /View in full screen/ }));
    expect(lastPush()).toBe("/search?sort=rating&page=2&view=map");
    await u.click(screen.getByRole("button", { name: /Exit full screen/ }));
    expect(lastPush()).toBe("/search?sort=rating&page=2");
    expect(screen.getByRole("button", { name: /Map/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /List/ })).toBeInTheDocument();
  });
  it("sort defaults to relevance", () => {
    render(<SortSelect />);
    expect(screen.getByRole("combobox", { name: "Sort results" })).toHaveTextContent("Relevance");
  });
  it("shares the hovered result", () => {
    const Show = () => <span data-testid="h">{String(useHoveredResult())}</span>;
    render(
      <ResultsHoverProvider>
        <ResultHover id={3}>
          <button>card</button>
        </ResultHover>
        <Show />
      </ResultsHoverProvider>,
    );
    fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
    expect(screen.getByTestId("h")).toHaveTextContent("3");
    fireEvent.mouseLeave(screen.getByRole("button").parentElement!);
    expect(screen.getByTestId("h")).toHaveTextContent("null");
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByTestId("h")).toHaveTextContent("3");
    fireEvent.blur(screen.getByRole("button"));
    expect(screen.getByTestId("h")).toHaveTextContent("null");
  });
});

const response = (over: Record<string, unknown> = {}) => ({
  results: [provider(), provider({ id: 2, slug: "b", businessName: "Second", avgRating: 0, totalReviews: 0, distanceKm: null, isOpenNow: false, coverUrl: null, logoUrl: "https://x/l.png" })],
  total: 2,
  page: 1,
  pageSize: 12,
  totalPages: 2,
  radiusKm: 15,
  resolved: { category: null, subcategory: { id: 11, name: "TV Repair", slug: "tv-repair" } },
  ...over,
});

describe("ResultsSection and the map", () => {
  it("lists results beside the map", async () => {
    const view = render(<ResultsSection data={response() as never} searchParams={{}} basePath="/search" heading={<h2>Results</h2>} origin={{ lat: 1, lng: 2 }} radiusKm={10} categories={categories} source="search" />);
    expect(await screen.findAllByTestId("map")).toHaveLength(1);
    expect(screen.getByTestId("circle")).toBeInTheDocument();
    expect(screen.getAllByText("New listing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Closed").length).toBeGreaterThan(0);
    fireEvent.mouseEnter(screen.getAllByRole("article")[0]?.parentElement ?? view.container.querySelector("[class]")!);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(one(["a", "b"])).toBe("a");
    expect(one(undefined)).toBeUndefined();
  });
  it("shows the map full width, and the empty state", async () => {
    const { unmount } = render(<ResultsSection data={response({ page: 2 }) as never} searchParams={{ view: "map", sort: "rating" }} basePath="/search" heading="Map" origin={null} radiusKm={10} source="category_browse" />);
    expect(await screen.findByRole("region", { name: /listed below it/ })).toBeInTheDocument();
    expect(screen.queryByTestId("circle")).toBeNull();
    unmount();
    render(<ResultsSection data={response({ results: [], total: 0, totalPages: 1 }) as never} searchParams={{ view: "map" }} basePath="/services/x" heading="None" origin={{ lat: 1, lng: 1 }} radiusKm={10} source="search" />);
    expect(screen.getByText("No providers match yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear all filters" })).toHaveAttribute("href", "/services/x");
  });
  it("draws pins for hovered results and without an origin", async () => {
    const { default: ResultsMap } = await import("@/components/search/results-map");
    const Hover = ({ children }: { children: React.ReactNode }) => (
      <ResultsHoverProvider>
        <ResultHover id={1}>
          <span>hover me</span>
        </ResultHover>
        {children}
      </ResultsHoverProvider>
    );
    render(<Hover><ResultsMap providers={response().results as never} origin={null} /></Hover>);
    fireEvent.mouseEnter(screen.getByText("hover me").parentElement!);
    expect(screen.getAllByTestId("marker")[0]).toHaveAttribute("data-z", "1000");
    render(<ResultsMap providers={[]} origin={{ lat: 1, lng: 1 }} />);
    render(<ResultsMap providers={[]} origin={null} />);
  });
});

describe("SearchHero", () => {
  it("renders the search box with popular links, or the page's own controls with an image", () => {
    const { unmount } = render(<SearchHero title="Find" subtitle="Sub" size="lg" popular={[{ label: "TV", href: "/tv" }]} />);
    expect(screen.getByText("Popular:")).toBeInTheDocument();
    unmount();
    render(<SearchHero title="Cat" image={HERO_IMAGE} above={<p>crumbs</p>}><p>controls</p></SearchHero>);
    expect(screen.getByText("controls")).toBeInTheDocument();
    expect(screen.queryByText("Popular:")).toBeNull();
    expect(screen.getByAltText(HERO_IMAGE.alt)).toBeInTheDocument();
  });
});

describe("CategoryListing", () => {
  const cat = (over: Record<string, unknown> = {}) => ({ ...categories[0], ...over }) as never;

  it("uses written copy for known pages", async () => {
    const fetch = mockApi({ "/search/providers": response({ total: 1, results: [provider()] }) });
    render(await CategoryListing({ category: cat(), searchParams: { radius: "10", lat: "1", lng: "2", loc: "Andheri", view: "list", page: "1" } }));
    expect(screen.getByText(/1 pro/)).toBeInTheDocument();
    expect(new URL(String(fetch.mock.calls[0]![0])).searchParams.get("radiusKm")).toBe("10");
    expect(screen.getByRole("link", { name: "TV Repair" })).toHaveAttribute("href", "/services/electronics-repair/tv-repair?lat=1&lng=2&loc=Andheri&view=list");
    expect(screen.getByText(/5 electronics repair professionals listed/)).toBeInTheDocument();
  });
  it("renders a subcategory page", async () => {
    const fetch = mockApi({ "/search/providers": response() });
    const sub = categories[0]!.subcategories[0]!;
    render(await CategoryListing({ category: cat({ subcategories: [sub, { id: 12, categoryId: 1, name: "AC Repair", slug: "ac-repair" }] }), sub, searchParams: {} }));
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("TV Repair");
    expect(new URL(String(fetch.mock.calls[0]![0])).searchParams.get("subcategory")).toBe("tv-repair");
    expect(screen.getByText(/2 pros/)).toBeInTheDocument();
  });
  it("generates copy for new categories, and skips the guide section when there is nothing to say", async () => {
    mockApi({ "/search/providers": response() });
    const fresh = cat({ slug: "new-cat", name: "New Cat", providerCount: 1, description: "Fresh category", subcategories: [{ id: 3, categoryId: 1, name: "New Sub", slug: "new-sub" }] });
    const { unmount } = render(await CategoryListing({ category: fresh, searchParams: {} }));
    expect(screen.getByRole("heading", { level: 1, name: "New Cat" })).toBeInTheDocument();
    expect(screen.getByText(/1 new cat professional listed/)).toBeInTheDocument();
    unmount();
    const empty = cat({ slug: "empty-cat", name: "Empty", providerCount: 0, description: null, subcategories: [] });
    render(await CategoryListing({ category: empty, searchParams: {} }));
    expect(screen.queryByText(/About empty/)).toBeNull();
    render(await CategoryListing({ category: fresh, sub: { id: 3, categoryId: 1, name: "New Sub", slug: "new-sub" }, searchParams: {} }));
    expect(screen.getByRole("heading", { level: 1, name: "New Sub near you" })).toBeInTheDocument();
  });
  it("builds metadata and fetches categories", async () => {
    expect(listingMetadata(cat(), undefined).alternates).toEqual({ canonical: "/services/electronics-repair" });
    expect(String(listingMetadata(cat({ slug: "zzz", name: "Zed", providerCount: 12, description: "d" }), undefined).title)).toBe("Zed near me in Siliguri");
    expect(String(listingMetadata(cat({ slug: "zzz", providerCount: 0 }), { id: 1, categoryId: 1, name: "Sub", slug: "zz-sub" }).description)).toContain("Compare sub providers");
    mockApi({ "/categories/x": { category: { slug: "x" } } });
    expect(await getCategory("x")).toEqual({ category: { slug: "x" } });
  });
});
