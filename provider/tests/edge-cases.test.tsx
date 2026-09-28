import { StrictMode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "@/lib/auth";
import { App } from "@/App";
import { AppLayout } from "@/layouts/app-layout";
import { StartPage } from "@/pages/start";
import { LocationFields, type LocationValue } from "@/components/location-fields";
import { AreasEditor } from "@/components/editors";
import type { ServiceArea } from "@/lib/types";
import { categories, inApp, json, mockApi, newQueryClient, pdfFile, planState, profile, renderApp, renderWith, signedIn, stubGeolocation, stubUploads } from "./helpers";

/** A request that never answers, so the page stays in its "sending" state. */
const hang = () => new Promise<Response>(() => undefined);
const spinnerIn = (button: HTMLElement) => button.querySelector(".animate-spin");

describe("sending states", () => {
  it("shows spinners on the lead note and the report dialog", async () => {
    const lead = { id: 1, channel: "call", source: "search", description: null, createdAt: new Date().toISOString(), customerName: "Asha", customerPhone: null, isGuest: false, service: null, customerReportedResponse: null, reviewRating: null, details: [], disputeStatus: "none", disputeReason: null, providerStatus: "new", providerNote: null, locked: false };
    mockApi({ ...inApp(), "/provider/leads": { leads: [lead], leadLimit: null, page: 1, totalPages: 1, total: 1 }, "PATCH /provider/leads/1": hang, "POST /provider/leads/1/dispute": hang });
    await renderApp("/leads");
    await userEvent.click(await screen.findByRole("button", { name: /Add note/ }));
    let dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Save note/ }));
    await waitFor(() => expect(spinnerIn(within(dialog).getByRole("button", { name: /Save note/ }))).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /Report$/ }));
    dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("What was wrong with it?"), "A wrong number call");
    await userEvent.click(within(dialog).getByRole("button", { name: /Send report/ }));
    await waitFor(() => expect(spinnerIn(within(dialog).getByRole("button", { name: /Send report/ }))).not.toBeNull());
  });

  it("shows spinners on photos, verification and support requests", async () => {
    stubUploads();
    mockApi({ ...inApp(), "/provider/profile": { provider: profile({ portfolio: [{ id: 1, title: "Shop", description: null, imageUrl: "http://cdn.test/1.jpg", categoryId: null, sortOrder: 1, isCover: false }] }) }, "PATCH /provider/portfolio/1": hang });
    let view = await renderApp("/portfolio");
    await userEvent.click(await screen.findByRole("button", { name: "Edit photo" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Save photo/ }));
    await waitFor(() => expect(spinnerIn(within(dialog).getByRole("button", { name: /Save photo/ }))).not.toBeNull());
    view.unmount();

    mockApi({ ...inApp(), "/provider/verifications": { verificationStatus: "none", verifications: [] }, "POST /provider/verifications": hang });
    view = await renderApp("/verification");
    await screen.findByText("Not verified");
    await userEvent.upload(document.querySelector<HTMLInputElement>("#doc-business")!, pdfFile());
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Submit for review/ })[0]).toBeEnabled(), { timeout: 2000 });
    await screen.findAllByRole("button", { name: /Remove/ });
    await userEvent.click(screen.getAllByRole("button", { name: /Submit for review/ })[0]!);
    await waitFor(() => expect(spinnerIn(screen.getAllByRole("button", { name: /Submit for review/ })[0]!)).not.toBeNull());
    view.unmount();

    mockApi({ ...inApp(), "/app-config": { config: {} }, "/support/tickets": { tickets: [], page: 1, totalPages: 1 }, "POST /support/tickets": hang });
    await renderApp("/support");
    await userEvent.click(await screen.findByRole("button", { name: /New request/ }));
    const ticket = await screen.findByRole("dialog");
    await userEvent.click(within(ticket).getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Something else" }));
    await userEvent.type(within(ticket).getByLabelText(/Subject/), "Question here");
    await userEvent.type(within(ticket).getByLabelText(/Details/), "A longer question here");
    await userEvent.click(within(ticket).getByRole("button", { name: /Send request/ }));
    await waitFor(() => expect(spinnerIn(within(ticket).getByRole("button", { name: /Send request/ }))).not.toBeNull());
  });

  it("shows spinners on campaign requests and account deletion", async () => {
    mockApi({
      ...inApp(),
      "/provider/sponsored": { locked: false, listings: [], categories: [{ id: 1, name: "Repair" }], pricing: { costPerClick: 10, minBudget: 500, city: "Mumbai", gstRate: 18 }, checkoutEnabled: false },
      "POST /provider/sponsored/request": hang,
    });
    const view = await renderApp("/promote");
    await userEvent.click(await screen.findByRole("button", { name: /Request campaign/ }));
    await waitFor(() => expect(spinnerIn(screen.getByRole("button", { name: /Request campaign/ }))).not.toBeNull());
    view.unmount();

    mockApi({ ...inApp(), "DELETE /auth/me": hang });
    await renderApp("/account");
    await userEvent.click(await screen.findByRole("button", { name: /Delete account/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Enter your password/), "secret");
    await userEvent.click(within(dialog).getByRole("button", { name: /Delete permanently/ }));
    await waitFor(() => expect(spinnerIn(within(dialog).getByRole("button", { name: /Delete permanently/ }))).not.toBeNull());
  });

  it("shows spinners on plan changes and billing details", async () => {
    const sub = { id: 1, status: "active", source: "razorpay", billingCycle: "yearly", startDate: "2026-01-01T00:00:00.000Z", endDate: "2027-01-01T00:00:00.000Z", cancelAtPeriodEnd: false, graceUntil: null };
    const plans = [
      { id: 2, code: "pro", name: "Pro", price: 0, leadAccessLimit: null, photoLimit: null, featuresJson: [], badge: null, prices: [{ billingCycle: "yearly", amount: 4990, availableOnWeb: true }] },
      { id: 3, code: "business", name: "Business", price: 0, leadAccessLimit: null, photoLimit: null, featuresJson: [], badge: null, prices: [{ billingCycle: "yearly", amount: 9990, availableOnWeb: true }] },
    ];
    let cancelled = false;
    mockApi({
      ...inApp(),
      "/provider/billing": () =>
        json({
          state: planState("business", { subscription: { ...sub, cancelAtPeriodEnd: cancelled } }),
          plans,
          transactions: [],
          invoices: [],
          billingProfile: { billingName: "Shop", billingAddress: "1 Road", billingStateCode: "27", gstin: null },
          web: { enabled: true, keyId: "k" },
          managedIn: "web",
          manageUrl: null,
        }),
      "POST /provider/billing/change-plan": hang,
      "POST /provider/billing/cancel": hang,
      "POST /provider/billing/resume": hang,
      "PUT /provider/billing/profile": hang,
    });
    const view = await renderApp("/subscription");
    await userEvent.click(await screen.findByRole("radio", { name: /Yearly/ }));
    await userEvent.click(screen.getByRole("button", { name: "Switch to Pro" }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/per year from your next renewal/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /Switch plan/ }));
    await waitFor(() => expect(spinnerIn(within(dialog).getByRole("button", { name: /Switch plan/ }))).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /^Cancel plan/ }));
    await waitFor(() => expect(spinnerIn(within(dialog).getByRole("button", { name: /^Cancel plan/ }))).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/Name on invoice/), " Co");
    await userEvent.click(screen.getByRole("button", { name: /Save billing details/ }));
    await waitFor(() => expect(spinnerIn(screen.getByRole("button", { name: /Save billing details/ }))).not.toBeNull());
    view.unmount();

    cancelled = true;
    await renderApp("/subscription");
    await userEvent.click(await screen.findByRole("button", { name: /Keep my plan/ }));
    await waitFor(() => expect(spinnerIn(screen.getByRole("button", { name: /Keep my plan/ }))).not.toBeNull());
  });

  it("offers non-featured plans by contact when online payment is off", async () => {
    mockApi({
      ...inApp(),
      "/provider/billing": {
        state: planState("free"),
        plans: [{ id: 2, code: "pro", name: "Pro", price: 0, leadAccessLimit: null, photoLimit: null, featuresJson: [], badge: null, prices: [{ billingCycle: "monthly", amount: 499, availableOnWeb: true }] }],
        transactions: [],
        invoices: [],
        billingProfile: { billingName: "Shop", billingAddress: null, billingStateCode: null, gstin: null },
        web: { enabled: false, keyId: null },
        managedIn: null,
        manageUrl: null,
      },
    });
    await renderApp("/subscription");
    expect(await screen.findByRole("link", { name: "Contact us to upgrade" })).toHaveClass("border");
  });
});

describe("remaining branches", () => {
  it("renders the app layout and start page with no session", () => {
    mockApi({ "/provider/profile": hang, "/me/notifications": hang });
    renderWith(<AppLayout />);
    expect(screen.queryByRole("link", { name: /View public profile/ })).not.toBeInTheDocument();
    renderWith(<StartPage />);
    expect(screen.getByText(/Let us get you listed/)).toBeInTheDocument();
  });

  it("identifies accounts without a business on the user", async () => {
    mockApi(signedIn({ provider: null, phone: null }, { provider: null, plan: null }));
    await renderApp("/start");
    expect(await screen.findByText(/Welcome, Ravi/)).toBeInTheDocument();
  });

  it("keeps an empty account phone empty", async () => {
    mockApi(inApp({ phone: null }));
    await renderApp("/account");
    expect(await screen.findByLabelText(/Mobile number/)).toHaveValue("");
  });

  it("leaves the locality empty when the reverse lookup only knows the city", async () => {
    mockApi({ "/locations/reverse": { location: { name: "Pune", city: "Pune", state: "MH" } } });
    stubGeolocation({ lat: 18.5, lng: 73.8 });
    const base: LocationValue = { addressLine: "", locality: "", city: "", state: "", pincode: "", latitude: 1, longitude: 2, serviceRadiusKm: 5 };
    let latest = base;
    function Harness() {
      const [v, setV] = useState(base);
      latest = v;
      return <LocationFields value={v} onChange={setV} />;
    }
    renderWith(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /Use my current location/ }));
    await waitFor(() => expect(latest).toMatchObject({ city: "Pune", state: "MH", locality: "" }));
  });

  it("searches locations as you type and closes suggestions after blur", async () => {
    mockApi({ "/locations": { locations: [{ label: "Pune", name: "Pune", city: "Pune", state: "MH", kind: "city", latitude: 1, longitude: 2 }] } });
    function Harness() {
      const [v, setV] = useState<ServiceArea[]>([]);
      return <AreasEditor value={v} onChange={setV} />;
    }
    renderWith(<Harness />);
    const search = screen.getByPlaceholderText("Add a locality you serve");
    await userEvent.type(search, "Pu");
    await screen.findByRole("button", { name: "Pune" });
    expect(search).toHaveValue("Pu");
    fireEvent.blur(search);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Pune" })).not.toBeInTheDocument());
  });

  it("formats the dashboard chart axis and tooltip", async () => {
    mockApi({
      ...inApp({}, { plan: planState("pro") }),
      "/provider/dashboard": {
        provider: { businessName: "Shop", avgRating: 4, totalReviews: 1, profileCompletenessPct: 50, verificationStatus: "none", responseSignal: null, favorites: 0, city: "Mumbai", status: "active" },
        analyticsLocked: false,
        totals: { leads: 1, calls: 1, whatsapp: 0, views: 1, impressions: 1, leadsChangePct: null, viewsChangePct: null, conversionPct: 1, unrepliedReviews: 0 },
        ranking: null,
        series: [
          { date: "2026-09-01", calls: 1, whatsapp: 0, views: 3, impressions: 5 },
          { date: "2026-09-02", calls: 2, whatsapp: 1, views: 4, impressions: 6 },
        ],
        checklist: [],
        recentLeads: [],
        recentReviews: [],
        subscription: null,
      },
    });
    const { container } = await renderApp("/");
    expect(await screen.findByText("01/09")).toBeInTheDocument();
    const surface = container.querySelector(".recharts-wrapper")!;
    fireEvent.mouseMove(surface, { clientX: 300, clientY: 150 });
    expect(await screen.findByText(/2026$/, { selector: ".recharts-tooltip-label" })).toBeInTheDocument();
  });

  it("answers unanswered multi-choice and text questions", async () => {
    mockApi({
      ...inApp(),
      "/categories": { categories },
      "/provider/attributes": {
        groups: [
          {
            providerServiceId: 1,
            title: "TV",
            attributes: [
              { id: 1, label: "Brands", fieldType: "multiselect", options: ["Sony"], isRequired: false, value: null },
              { id: 2, label: "Notes", fieldType: "text", options: [], isRequired: false, value: null },
            ],
          },
        ],
      },
    });
    await renderApp("/services");
    expect(await screen.findByLabelText("Notes")).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: /Sony/ }));
    expect(screen.getByRole("button", { name: /Sony/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("names an unnamed business in the onboarding summary", async () => {
    localStorage.setItem(
      "dnf_onboarding_7",
      JSON.stringify({
        step: 4,
        business: { businessName: "", businessType: "individual", yearsExperience: "", description: "" },
        services: [],
        location: { addressLine: "", locality: "", city: "Siliguri", state: "WB", pincode: "", latitude: 1, longitude: 2, serviceRadiusKm: 10 },
        areas: [],
        hours: [],
        contact: { phone: "", whatsappNumber: "", email: "", website: "", acceptsCalls: true, acceptsWhatsapp: true },
      }),
    );
    mockApi(signedIn({}, { provider: null, plan: null }));
    await renderApp("/onboarding");
    expect(await screen.findByText(/Your business · 0 services/)).toBeInTheDocument();
  });

  it("clears no error while typing a first reply", async () => {
    mockApi({
      ...inApp(),
      "/provider/reviews": { summary: { avgRating: 5, totalReviews: 1, breakdown: [] }, reviews: [{ id: 1, rating: 5, reviewText: "Good", providerReply: null, providerReplyAt: null, status: "published", isVerifiedContact: false, createdAt: new Date().toISOString(), author: "Meena", photos: [], reported: false }], page: 1, totalPages: 1 },
    });
    await renderApp("/reviews");
    await userEvent.click(await screen.findByRole("button", { name: /^Reply$/ }));
    await userEvent.type(screen.getByLabelText("Your reply"), "Hi");
    expect(screen.getByText("2 / 1,000")).toBeInTheDocument();
  });
});

describe("verify email edge cases", () => {
  it("verifies a link once under StrictMode", async () => {
    const fetch = mockApi({ "POST /auth/verify-email": { ok: true } });
    const qc = newQueryClient();
    render(
      <StrictMode>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/verify-email?token=abc"]}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(fetch.mock.calls.filter(([u]) => String(u).endsWith("/auth/verify-email"))).toHaveLength(1);
  });

  it("ignores a submit with fewer than six digits, and shows network errors on resend", async () => {
    const fetch = mockApi({ ...signedIn({ emailVerifiedAt: null }), "POST /auth/resend-verification": () => Promise.reject(new TypeError("Failed to fetch")) });
    await renderApp("/verify-email");
    const input = await screen.findByPlaceholderText("000000");
    await userEvent.type(input, "123");
    fireEvent.submit(input.closest("form")!);
    expect(fetch.mock.calls.some(([u]) => String(u).includes("/verify-email/code"))).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Email me a code" }));
    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
  });
});

describe("public profile preview links", () => {
  const click = () => {
    const event = { preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLAnchorElement>;
    return event;
  };

  it("leaves live listings to the link's own href", async () => {
    const { previewIfNotLive, publicProfileUrl } = await import("@/lib/public-profile");
    expect(publicProfileUrl("shop")).toBe("http://web.test/providers/shop");
    const event = click();
    previewIfNotLive("active")(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("opens a signed preview in a new tab for listings that are not live", async () => {
    const { previewIfNotLive } = await import("@/lib/public-profile");
    mockApi({ "/provider/preview-link": { url: "http://web.test/providers/shop/preview?token=t" } });
    const tab = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => tab));
    const event = click();
    previewIfNotLive("pending")(event);
    expect(event.preventDefault).toHaveBeenCalled();
    await waitFor(() => expect(tab.location.href).toBe("http://web.test/providers/shop/preview?token=t"));
    expect(tab.opener).toBeNull();
  });

  it("uses the current tab when the popup is blocked", async () => {
    const { previewIfNotLive } = await import("@/lib/public-profile");
    mockApi({ "/provider/preview-link": { url: "http://localhost/preview" } });
    vi.stubGlobal("open", vi.fn(() => null));
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, set href(v: string) { assign(v); } } });
    try {
      previewIfNotLive(undefined)(click());
      await waitFor(() => expect(assign).toHaveBeenCalledWith("http://localhost/preview"));
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });

  it("closes the tab and explains a failed preview link", async () => {
    const { previewIfNotLive } = await import("@/lib/public-profile");
    mockApi({ "/provider/preview-link": json({ error: { message: "Preview unavailable" } }, 500) });
    const tab = { opener: null, location: { href: "" }, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => tab));
    renderWith(<div />);
    previewIfNotLive("pending")(click());
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(await screen.findByText("Preview unavailable")).toBeInTheDocument();

    vi.stubGlobal("open", vi.fn(() => null));
    previewIfNotLive("pending")(click());
    expect(await screen.findAllByText("Preview unavailable")).not.toHaveLength(0);
  });
});
