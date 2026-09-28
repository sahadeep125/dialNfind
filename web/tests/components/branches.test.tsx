// @vitest-environment jsdom
/**
 * Branches the feature tests do not reach on their way: an upload finishing after its form closed,
 * hydration (when saved-location hooks still return null), dialogs closed with Escape, loading states.
 */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { FileUpload, PhotoListUpload } from "@/components/file-upload";
import { NewTicketButton, TicketReply } from "@/components/dashboard/support";
import { Pagination, hrefFor } from "@/components/pagination";
import { VerifyEmailCode } from "@/components/auth/verify-email-code";
import { AddressManager } from "@/components/dashboard/account-forms";
import { NearbyProviders } from "@/components/home/nearby-providers";
import { SearchBar } from "@/components/search/search-bar";
import { ReportListing } from "@/components/provider/share-report";
import { ProfileReviewForm, ProviderViewerState } from "@/components/provider/viewer-state";
import { SessionProvider } from "@/components/site/session-provider";
import { FiltersSheet } from "@/components/search/filters";
import { LocationPicker } from "@/components/search/location-picker";
import { ResultHover } from "@/components/search/results-hover";
import { ResultsSection } from "@/components/search/results-section";
import { ContactForm } from "@/components/site/contact-form";
import { clientIp } from "@/lib/client-ip";
import { initials } from "@/lib/format";
import { DEFAULT_LOCATION } from "@/lib/default-location";
import { nav } from "../next-state";
import { json, mockApi, provider, user } from "../helpers";

const upload = vi.hoisted(() => ({ checkFile: vi.fn(), uploadFile: vi.fn() }));
vi.mock("@/lib/upload", async (orig) => ({ ...(await orig<typeof import("@/lib/upload")>()), checkFile: upload.checkFile, uploadFile: upload.uploadFile }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Circle: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const file = () => new File(["x"], "a.png", { type: "image/png" });
/** An upload that finishes only when the test says so. */
function pendingUpload() {
  let finish!: (url: string) => void;
  upload.checkFile.mockResolvedValue(null);
  upload.uploadFile.mockImplementation(() => new Promise((r) => (finish = r)));
  return (url: string) => act(async () => finish(url));
}

describe("uploads that finish after the form is gone", () => {
  it("FileUpload, PhotoListUpload and ticket attachments", async () => {
    const u = userEvent.setup();
    let finish = pendingUpload();
    const a = render(<FileUpload value="" onChange={vi.fn()} purpose="avatar" id="f" />);
    await u.upload(document.getElementById("f") as HTMLInputElement, file());
    a.unmount();
    await finish("u1");

    finish = pendingUpload();
    const b = render(<PhotoListUpload value={[]} onChange={vi.fn()} purpose="review" max={2} id="p" />);
    await u.upload(document.getElementById("p") as HTMLInputElement, file());
    b.unmount();
    await finish("u2");

    finish = pendingUpload();
    const c = render(<TicketReply id={1} />);
    await u.upload(screen.getByLabelText("Attach a file"), file());
    expect(screen.getByRole("button", { name: /Attach a file/ })).toBeDisabled();
    c.unmount();
    await finish("u3");
  });
  it("a new ticket closes without sending", async () => {
    const u = userEvent.setup();
    render(<NewTicketButton />);
    await u.click(screen.getByRole("button", { name: /New request/ }));
    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("pagination", () => {
  it("keeps array and non-empty query values and marks gaps", () => {
    expect(hrefFor("/s", { q: ["tv", "x"], empty: "", none: undefined }, {})).toBe("/s?q=tv");
    render(<Pagination page={5} totalPages={10} searchParams={{}} basePath="/s" />);
    expect(screen.getAllByText("...")).toHaveLength(2);
  });
});

describe("dialogs and forms", () => {
  it("a partly typed code is not submitted", async () => {
    const u = userEvent.setup();
    const fetch = mockApi({});
    render(<VerifyEmailCode email="a@b.co" next="/d" justSent={false} />);
    await u.type(screen.getByPlaceholderText("000000"), "12{Enter}");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("the address dialog and report dialog close with Escape", async () => {
    const u = userEvent.setup();
    render(<AddressManager addresses={[]} />);
    await u.click(screen.getByRole("button", { name: /Add address/ }));
    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    render(<ReportListing slug="s" />);
    await u.click(screen.getByRole("button", { name: /Report this listing/ }));
    await u.click(screen.getByRole("button", { name: /Send report/ }));
    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("the contact form asks for a topic when it is cleared", async () => {
    const u = userEvent.setup();
    mockApi({ "/api/session": { user: null, unread: 0 } });
    render(<SessionProvider><ContactForm /></SessionProvider>);
    fireEvent.change(document.querySelector("select")!, { target: { value: "" } });
    await u.click(screen.getByRole("button", { name: /Send message/ }));
    await waitFor(() => expect(document.getElementById("subject-error")).toHaveTextContent("Choose a topic"));
    expect(document.getElementById("subject")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("hydration: the saved location is not known on the first render", () => {
  it("NearbyProviders and SearchBar hydrate from server markup", async () => {
    document.cookie = `dnf_location=${encodeURIComponent(JSON.stringify({ ...DEFAULT_LOCATION, label: "Kothrud, Pune", city: "Pune" }))}; path=/`;
    mockApi({ "/providers/featured": { results: [provider()] } });
    const container = document.createElement("div");
    const ui = (
      <>
        <NearbyProviders />
        <SearchBar />
      </>
    );
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, ui, { onRecoverableError: () => undefined });
    });
    await waitFor(() => expect(container.textContent).toContain("Popular pros in Pune"));
    expect(container.textContent).toContain("Kothrud, Pune");
    act(() => root.unmount());
    container.remove();
  });
});

describe("search pieces", () => {
  it("submits typed text without a highlighted suggestion and changes the location", async () => {
    const u = userEvent.setup();
    mockApi({ "/locations": { locations: [{ ...DEFAULT_LOCATION, label: "Andheri, Mumbai", name: "Andheri", kind: "area" }] } });
    render(<SearchBar initialLocation={DEFAULT_LOCATION} />);
    await u.click(screen.getByRole("button", { name: /Sevoke Road/ }));
    await u.click(await screen.findByRole("button", { name: /Andheri/ }));
    expect(document.cookie).toContain("Andheri");
    fireEvent.submit(screen.getByRole("search"));
    expect(nav.router.push.mock.calls.at(-1)![0]).toContain("loc=Andheri");
  });
  it("shows a spinner while areas load", async () => {
    const u = userEvent.setup();
    mockApi({ "/locations": () => new Promise(() => undefined) as never });
    render(<LocationPicker value={DEFAULT_LOCATION} onChange={vi.fn()} />);
    await u.click(screen.getByRole("button", { name: /Sevoke Road/ }));
    await waitFor(() => expect(document.querySelector("[aria-busy=true]")).not.toBeNull());
  });
  it("hover outside a provider does nothing, and one result is never the top match", () => {
    render(
      <ResultHover id={1}>
        <span>alone</span>
      </ResultHover>,
    );
    fireEvent.mouseEnter(screen.getByText("alone").parentElement!);
    render(<ResultsSection data={{ results: [provider()], total: 1, page: 1, pageSize: 12, totalPages: 1, radiusKm: 15, resolved: { category: null, subcategory: null } } as never} searchParams={{}} basePath="/s" heading="h" origin={null} radiusKm={15} source="search" />);
    expect(screen.queryByText("Top match")).toBeNull();
  });
  it("the filters sheet can go back to all categories", async () => {
    const u = userEvent.setup();
    nav.pathname = "/search";
    nav.search = "category=plumbing";
    render(<FiltersSheet categories={[{ id: 2, name: "Plumbing", slug: "plumbing", subcategories: [] }] as never} defaultRadius={15} activeCount={1} />);
    await u.click(screen.getByRole("button", { name: /All filters/ }));
    await u.click(within(screen.getByRole("dialog")).getByRole("combobox"));
    await u.click(await screen.findByRole("option", { name: "All categories" }));
    expect(nav.router.push.mock.calls.at(-1)![0]).toBe("/search");
  });
});

describe("viewer state edge cases", () => {
  it("a new review form once the visit loads, and failures after leaving the page", async () => {
    mockApi({ "/api/session": { user: user(), unread: 0 }, "POST /providers/s/visit": { isFavorite: false, myReview: null } });
    const a = render(
      <SessionProvider>
        <ProviderViewerState slug="s">
          <ProfileReviewForm providerId={1} providerName="S" slug="s" minLength={1} />
        </ProviderViewerState>
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /Write a Review/ })).toBeInTheDocument());
    await act(async () => undefined);
    a.unmount();
    let fail!: (e: unknown) => void;
    mockApi({ "/api/session": { user: null, unread: 0 }, "POST /providers/s/visit": () => new Promise((_r, j) => (fail = j)) as never });
    const b = render(
      <SessionProvider>
        <ProviderViewerState slug="s">
          <span />
        </ProviderViewerState>
      </SessionProvider>,
    );
    await waitFor(() => expect(fail).toBeDefined());
    b.unmount();
    await act(async () => fail(new TypeError("offline")));
  });
});

describe("small library branches", () => {
  it("client IP and initials", () => {
    vi.stubEnv("CLIENT_IP_HEADER", "x-real-ip");
    expect(clientIp(new Headers())).toBeNull();
    expect(initials(" Asha")).toBe("A");
    expect(json({}).status).toBe(200);
  });
});

describe("last branches", () => {
  it("a failed visit still loads the guest view while the page is open", async () => {
    const fetch = mockApi({ "/api/session": { user: null, unread: 0 }, "POST /providers/s/visit": json({}, 500) });
    render(
      <SessionProvider>
        <ProviderViewerState slug="s">
          <ProfileReviewForm providerId={1} providerName="S" slug="s" minLength={1} />
        </ProviderViewerState>
      </SessionProvider>,
    );
    await waitFor(() => expect(fetch.mock.calls.some(([u]) => String(u).includes("/visit"))).toBe(true));
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(screen.getByRole("button", { name: /Write a Review/ })).toBeInTheDocument();
  });
  it("explicit relevance sort still marks the top match", async () => {
    render(<ResultsSection data={{ results: [provider(), provider({ id: 2, slug: "b" })], total: 2, page: 1, pageSize: 12, totalPages: 1, radiusKm: 15, resolved: { category: null, subcategory: null } } as never} searchParams={{ sort: "relevance" }} basePath="/s" heading="h" origin={null} radiusKm={15} source="search" />);
    expect(screen.getByText("Top match")).toBeInTheDocument();
  });
  it("the review dialog closes with Escape and a short code is not sent", async () => {
    const u = userEvent.setup();
    const { ReviewForm } = await import("@/components/provider/review-form");
    render(<ReviewForm providerId={1} providerName="S" signedIn existing={null} minLength={1} />);
    await u.click(screen.getByRole("button", { name: /Write a Review/ }));
    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const fetch = mockApi({});
    render(<VerifyEmailCode email="a@b.co" next="/d" justSent={false} />);
    await u.type(screen.getByPlaceholderText("000000"), "12");
    fireEvent.submit(screen.getByPlaceholderText("000000").closest("form")!);
    expect(fetch).not.toHaveBeenCalled();
  });
});
