import { describe, expect, it } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingPage } from "@/pages/onboarding";
import { DEFAULT_HOURS } from "@/components/editors";
import { categories, json, lastBody, mockApi, pdfFile, pickOption, providerMe, renderApp, renderWith, signedIn, stubUploads } from "./helpers";

const where = () => screen.getByTestId("where").textContent;
const noBusiness = { provider: null, plan: null };

const listing = (over: Record<string, unknown> = {}) => ({
  id: 5,
  businessName: "Old Shop",
  locality: "Hill Cart Road",
  city: "Siliguri",
  phone: "+919800000000",
  category: "Electronics Repair",
  avgRating: 4.44,
  totalReviews: 9,
  isClaimed: false,
  ...over,
});

describe("claim page", () => {
  it("searches, validates the query, and shows results", async () => {
    let answer: unknown = { results: [listing(), listing({ id: 6, businessName: "Taken Shop", locality: null, category: null, totalReviews: 0, isClaimed: true })] };
    const fetch = mockApi({ ...signedIn({}, noBusiness), "/provider/claims/search": () => (answer === "fail" ? json({ error: { message: "Search is down" } }, 500) : json(answer)) });
    await renderApp("/claim");
    const q = await screen.findByLabelText("Business name or phone number");
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter at least 2 characters");
    expect(q).toHaveAttribute("aria-describedby", "q-error");
    await userEvent.type(q, "O");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.type(q, "ld");
    await pickOption(screen.getByRole("combobox"), "Mumbai");
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(await screen.findByText("Old Shop")).toBeInTheDocument();
    expect(String(fetch.mock.calls.at(-1)![0])).toContain("q=Old&city=Mumbai");
    expect(screen.getByText(/Hill Cart Road,/)).toBeInTheDocument();
    expect(screen.getByText("4.4 (9)")).toBeInTheDocument();
    expect(screen.getByText("Already claimed")).toBeInTheDocument();

    answer = { results: [] };
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(await screen.findByRole("link", { name: "Create a new listing instead" })).toHaveAttribute("href", "/onboarding");

    answer = "fail";
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(await screen.findByText("Search is down")).toBeInTheDocument();
  });

  it("submits a document claim for a picked listing", async () => {
    stubUploads();
    let fail = true;
    const fetch = mockApi({
      ...signedIn({}, noBusiness),
      "/provider/claims/search": { results: [listing()] },
      "POST /provider/claims": () => (fail ? json({ error: { message: "Claim already open" } }, 409) : json({ claim: { id: 1 }, token: null })),
    });
    await renderApp("/claim");
    await userEvent.type(await screen.findByLabelText("Business name or phone number"), "Old");
    await userEvent.click(screen.getByRole("button", { name: /Search/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Select" }));

    await userEvent.click(screen.getByRole("button", { name: /Submit document/ }));
    expect(screen.getByText("Upload a document before submitting")).toBeInTheDocument();
    const input = document.querySelector<HTMLInputElement>("#claim-doc")!;
    expect(input).toHaveAttribute("aria-describedby", "claim-doc-error");
    await userEvent.upload(input, pdfFile());
    await waitFor(() => expect(screen.getByRole("button", { name: /Submit document/ })).toBeDisabled());
    await waitFor(() => expect(screen.queryByText("Upload a document before submitting")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: /Submit document/ })).toBeEnabled());

    await userEvent.click(screen.getByRole("button", { name: /Submit document/ }));
    expect(await screen.findByText("Claim already open")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Submit document/ }));
    expect(await screen.findByText("Claim submitted")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/claims")).toEqual({ providerId: 5, documentUrl: "http://cdn.test/document.png" });
    expect(screen.getByText(/for Old Shop and email you/)).toBeInTheDocument();
  });

  it("opens a listing from the link, signs in with a new token, and can go back to search", async () => {
    stubUploads();
    const fetch = mockApi({
      ...signedIn({}, noBusiness),
      "/provider/claims/listing/5": { listing: listing() },
      "POST /provider/claims": { claim: { id: 2 }, token: "customer-upgraded" },
    });
    await renderApp("/claim?listing=5");
    expect(await screen.findByText("Prove that you own this business")).toBeInTheDocument();
    const input = document.querySelector<HTMLInputElement>("#claim-doc")!;
    await userEvent.upload(input, pdfFile());
    await screen.findByRole("button", { name: /Remove/ });
    // Removing the document does not clear an error, and re-adding it does.
    await userEvent.click(screen.getByRole("button", { name: /Remove/ }));
    await userEvent.upload(document.querySelector<HTMLInputElement>("#claim-doc")!, pdfFile());
    await screen.findByRole("button", { name: /Remove/ });
    await userEvent.click(screen.getByRole("button", { name: /Submit document/ }));
    await waitFor(() => expect(localStorage.getItem("dnf_provider_token")).toBe("customer-upgraded"));
    // Swapping the session reloads the account, which remounts the page on the listing again
    // instead of showing "Claim submitted" (reported as a finding).
    expect(await screen.findByText("Prove that you own this business")).toBeInTheDocument();
    const post = fetch.mock.calls.find(([, init]) => init?.method === "POST" && String(init.body).includes("providerId"));
    expect(JSON.parse(String(post![1]!.body))).toMatchObject({ providerId: 5 });
  });

  it("explains claimed listings and lets the owner pick another", async () => {
    mockApi({ ...signedIn({}, noBusiness), "/provider/claims/listing/5": { listing: listing({ isClaimed: true }) } });
    await renderApp("/claim?listing=5");
    expect(await screen.findByText(/already has an owner/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Choose a different listing" }));
    expect(screen.getByLabelText("Business name or phone number")).toBeInTheDocument();
  });

  it("reports a listing link that does not work", async () => {
    mockApi({ ...signedIn({}, noBusiness), "/provider/claims/listing/5": json({ error: { message: "nope" } }, 404) });
    await renderApp("/claim?listing=5");
    expect(await screen.findByText("We could not find that listing")).toBeInTheDocument();
  });
});

type DraftStep = { step: number } & Record<string, unknown>;
const fullDraft = (over: Partial<DraftStep> = {}) => ({
  step: 4,
  business: { businessName: "  Ravi Repairs ", businessType: "company", yearsExperience: "", description: "" },
  services: [{ categoryId: 1, subcategoryId: 11, startingPrice: 300, priceUnit: "per_visit", isPrimary: true, id: 99 }],
  location: { addressLine: "", locality: "", city: "Siliguri", state: "West Bengal", pincode: "", latitude: 26.7, longitude: 88.4, serviceRadiusKm: 10 },
  areas: [],
  hours: DEFAULT_HOURS,
  contact: { phone: "98765 43210", whatsappNumber: "", email: " a@b.co ", website: "", acceptsCalls: true, acceptsWhatsapp: true },
  ...over,
});

/** A signed-in account with no business yet; once onboarding succeeds, /provider/me returns one. */
function onboardingApi(extra: Record<string, unknown> = {}) {
  let live = false;
  const routes = signedIn({}, noBusiness);
  return mockApi({
    ...routes,
    "/provider/me": () => json(live ? providerMe() : { ...providerMe(), ...noBusiness }),
    "/categories": { categories },
    "/locations": { locations: [] },
    "/provider/dashboard": json({ error: { message: "x" } }, 500),
    "/provider/profile": json({ error: { message: "x" } }, 500),
    "/me/notifications": { notifications: [], unread: 0 },
    "POST /provider/onboarding": () => {
      live = true;
      return json({ token: null });
    },
    ...extra,
  });
}

describe("onboarding", () => {
  it("walks through every step with validation", async () => {
    const fetch = onboardingApi();
    await renderApp("/onboarding");

    // Step 1: business.
    const name = await screen.findByLabelText(/Business name/);
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Enter your business name")).toBeInTheDocument();
    await userEvent.type(name, "Ravi Repairs");
    expect(screen.queryByText("Enter your business name")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Years of experience/), "9a0");
    expect(screen.getByLabelText(/Years of experience/)).toHaveValue("90");
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "x".repeat(2001) } });
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText(/Years of experience must be a whole number from 0 to 80/)).toBeInTheDocument();
    expect(screen.getByText("Keep the description under 2,000 characters")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/Years of experience/));
    await userEvent.type(screen.getByLabelText(/Years of experience/), "5");
    await userEvent.clear(screen.getByLabelText(/Description/));
    await userEvent.type(screen.getByLabelText(/Description/), "We fix TVs");
    expect(screen.getByText(/^10 of 2,000 characters/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /A company or shop/ }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // Step 2: services.
    expect(await screen.findByText("What services do you offer?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Pick at least one service")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Electronics Repair" }));
    await userEvent.click(screen.getAllByRole("checkbox")[0]!);
    expect(screen.queryByText("Pick at least one service")).not.toBeInTheDocument();
    // The step markers let the provider go back to a finished step, but not forward.
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByText("What services do you offer?")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button").find((b) => b.className.includes("bg-success"))!);
    expect(screen.getByText("Tell us about your business")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // Step 3: location.
    expect(await screen.findByText("Where are you based?")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/^City/));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Enter your city")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^City/), "Siliguri");
    expect(screen.queryByText("Enter your city")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Locality/), "Pradhan Nagar");
    await userEvent.type(screen.getByLabelText("Area name"), "Sevoke Road{Enter}");
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // Step 4: hours.
    expect(await screen.findByText("When can customers call you?")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Monday closing time"), { target: { value: "08:00" } });
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Fix the highlighted days")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Monday closing time"), { target: { value: "18:00" } });
    expect(screen.queryByText("Fix the highlighted days")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // Step 5: contact.
    expect(await screen.findByText("How should customers reach you?")).toBeInTheDocument();
    expect(screen.getByLabelText(/Business phone/)).toHaveValue("+919876543210");
    expect(screen.getByText(/Ravi Repairs · 1 services · Pradhan Nagar, Siliguri · 10 km radius/)).toBeInTheDocument();
    const [calls, whatsapp] = screen.getAllByRole("switch");
    await userEvent.click(calls!);
    await userEvent.click(whatsapp!);
    await userEvent.clear(screen.getByLabelText(/Business phone/));
    await userEvent.type(screen.getByLabelText(/WhatsApp number/), "12");
    await userEvent.clear(screen.getByLabelText(/Business email/));
    await userEvent.type(screen.getByLabelText(/Business email/), "bad");
    await userEvent.type(screen.getByLabelText(/Website/), "ftp://x");
    await userEvent.click(screen.getByRole("button", { name: /Publish my listing/ }));
    expect(screen.getByText("Enter a phone number")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid 10-digit Indian phone number")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter a full link starting with https://")).toBeInTheDocument();
    expect(screen.getByText("Turn on at least one way for customers to reach you")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Business phone/), "9876543210");
    await userEvent.clear(screen.getByLabelText(/WhatsApp number/));
    await userEvent.clear(screen.getByLabelText(/Business email/));
    await userEvent.clear(screen.getByLabelText(/Website/));
    await userEvent.click(whatsapp!);
    expect(screen.queryByText(/Turn on at least one way/)).not.toBeInTheDocument();
    await userEvent.click(calls!);
    // Let the 400 ms draft save run first; a save still pending at publish time would write the
    // draft back after it is cleared (reported as a finding).
    await act(async () => new Promise((r) => setTimeout(r, 450)));
    await userEvent.click(screen.getByRole("button", { name: /Publish my listing/ }));

    await waitFor(() => expect(where()).toBe("/"));
    expect(await screen.findByText("Your business is live on DialNFind")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/onboarding")).toMatchObject({
      businessName: "Ravi Repairs",
      businessType: "company",
      yearsExperience: 5,
      description: "We fix TVs",
      locality: "Pradhan Nagar",
      phone: "+919876543210",
      whatsappNumber: "+919876543210",
      serviceAreas: [{ areaName: "Sevoke Road" }],
    });
    expect(localStorage.getItem("dnf_onboarding_7")).toBeNull();
  });

  it("resumes a saved draft, reports a failed publish, and signs in with a returned token", async () => {
    localStorage.setItem("dnf_onboarding_7", JSON.stringify(fullDraft()));
    let fail = true;
    const fetch = onboardingApi({
      "POST /provider/onboarding": () => (fail ? json({ error: { message: "Name is taken" } }, 409) : json({ token: "new-token" })),
    });
    await renderApp("/onboarding");
    expect(await screen.findByText(/Ravi Repairs · 1 services · Siliguri · 10 km radius/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Publish my listing/ }));
    expect(await screen.findByText("Name is taken")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Publish my listing/ }));
    await waitFor(() => expect(localStorage.getItem("dnf_provider_token")).toBe("new-token"));
    expect(lastBody(fetch, "/provider/onboarding")).toMatchObject({
      businessName: "Ravi Repairs",
      yearsExperience: null,
      email: "a@b.co",
      services: [{ categoryId: 1, subcategoryId: 11, startingPrice: 300, priceUnit: "per_visit", isPrimary: true }],
    });
    expect(lastBody(fetch, "/provider/onboarding")).not.toHaveProperty("description");
  });

  it("goes back a step, clears the form error, and leaves from the first step", async () => {
    localStorage.setItem("dnf_onboarding_7", JSON.stringify(fullDraft({ step: 1 })));
    onboardingApi();
    await renderApp("/onboarding");
    expect(await screen.findByText("What services do you offer?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("Tell us about your business")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Back/ }));
    await waitFor(() => expect(where()).toBe("/start"));
  });

  it("saves the draft as the provider types", async () => {
    onboardingApi();
    await renderApp("/onboarding");
    await userEvent.type(await screen.findByLabelText(/Business name/), "Draft Shop");
    await waitFor(() => expect(JSON.parse(localStorage.getItem("dnf_onboarding_7")!).business.businessName).toBe("Draft Shop"));
  });

  it("sends accounts that already have a business to the dashboard", async () => {
    mockApi({ ...signedIn(), "/provider/dashboard": json({ error: { message: "x" } }, 500), "/provider/profile": json({ error: { message: "x" } }, 500), "/me/notifications": { notifications: [], unread: 0 } });
    await renderApp("/onboarding");
    await waitFor(() => expect(where()).toBe("/"));
  });

  it("works without a signed-in account, keeping an anonymous draft", async () => {
    mockApi({});
    renderWith(<OnboardingPage />);
    await userEvent.type(screen.getByLabelText(/Business name/), "Anon");
    await act(async () => new Promise((r) => setTimeout(r, 450)));
    expect(JSON.parse(localStorage.getItem("dnf_onboarding_anon")!).contact).toMatchObject({ phone: "", email: "" });
  });
});
