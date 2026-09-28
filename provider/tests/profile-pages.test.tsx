import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { categories, inApp, json, lastBody, mockApi, pdfFile, pickOption, planState, pngFile, profile, renderApp, stubUploads } from "./helpers";

/** App routes with a profile that tests can change (it is re-read on every request). */
function withProfile(initial: Record<string, unknown> = {}, extra: Record<string, unknown> = {}, me: Record<string, unknown> = {}) {
  const state = { profile: profile(initial) };
  const fetch = mockApi({
    ...inApp({}, me),
    "/provider/profile": (_u: URL, init?: RequestInit) => (init?.method === "PATCH" ? undefined : json({ provider: state.profile })),
    "/categories": { categories },
    "/locations": { locations: [] },
    ...extra,
  });
  return { fetch, state };
}

const saveButton = () => screen.getByRole("button", { name: /Save changes/ });

describe("business details", () => {
  it("validates, saves the cleaned values and can discard changes", async () => {
    stubUploads();
    let fail = true;
    const { fetch } = withProfile({}, { "PATCH /provider/profile": () => (fail ? json({ error: { message: "Could not save" } }, 500) : json({ ok: true })) });
    await renderApp("/profile");
    const name = await screen.findByLabelText(/Business name/);
    expect(name).toHaveValue("Sharma TV Repair");
    expect(screen.getByLabelText(/WhatsApp number/)).toHaveValue("");
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: /View public profile/ })) expect(link).toHaveAttribute("href", "http://web.test/providers/sharma-tv");
    expect(screen.getByText("Upload a logo").tagName).toBe("SPAN");
    expect(screen.getByText("Set your working hours")).toHaveClass("text-muted-foreground");

    await userEvent.clear(name);
    await userEvent.tab();
    expect(await screen.findByText("Enter your business name")).toBeInTheDocument();
    await userEvent.click(saveButton());
    expect(await screen.findByText("Please fix the highlighted fields")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(name).toHaveValue("Sharma TV Repair");

    await userEvent.type(name, " & Sons");
    await pickOption(screen.getByRole("combobox", { name: "Business type" }), "Company or shop");
    await userEvent.clear(screen.getByLabelText("Years in business"));
    await userEvent.clear(screen.getByLabelText("Jobs completed"));
    await userEvent.clear(screen.getByLabelText(/Description/));
    expect(screen.getByText(/^0 \/ 2000 characters/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/WhatsApp number/), "9123456789");
    const [calls] = screen.getAllByRole("switch").filter((s) => s.closest("label")?.textContent?.includes("Call button"));
    await userEvent.click(calls!);
    await userEvent.click(screen.getAllByRole("switch").find((s) => s.closest("label")?.textContent?.includes("WhatsApp button"))!);
    await userEvent.click(saveButton());
    expect(await screen.findByText("Keep at least one way for customers to reach you")).toBeInTheDocument();
    expect(calls).toHaveAttribute("aria-describedby", "channels-error");
    await userEvent.click(calls!);

    await userEvent.upload(document.querySelector<HTMLInputElement>("#logo")!, pngFile());
    await waitFor(() => expect(saveButton()).toBeDisabled());
    await waitFor(() => expect(saveButton()).toBeEnabled());

    await userEvent.click(saveButton());
    expect(await screen.findByText("Could not save")).toBeInTheDocument();
    fail = false;
    await userEvent.click(saveButton());
    expect(await screen.findByText("Profile updated")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/profile")).toMatchObject({
      businessName: "Sharma TV Repair & Sons",
      businessType: "company",
      description: null,
      yearsExperience: null,
      selfReportedCompletedJobs: null,
      whatsappNumber: "+919123456789",
      logoUrl: "http://cdn.test/logo.png",
      acceptsCalls: true,
      acceptsWhatsapp: false,
      city: "Mumbai",
    });
  });

  it("loads a sparse profile and sends empty optional fields as null", async () => {
    const { fetch } = withProfile(
      { description: null, yearsExperience: null, selfReportedCompletedJobs: null, email: null, website: "https://x.co", logoUrl: "http://cdn.test/l.png", coverUrl: "http://cdn.test/c.png", addressLine: null, locality: null, pincode: null, checklist: [{ key: "services", label: "Add services", done: false }] },
      { "PATCH /provider/profile": { ok: true } },
    );
    await renderApp("/profile");
    expect(await screen.findByLabelText(/Description/)).toHaveValue("");
    expect(screen.getByRole("link", { name: "Add services" })).toHaveAttribute("href", "/services");
    await userEvent.type(screen.getByLabelText("Years in business"), "7");
    await userEvent.type(screen.getByLabelText("Jobs completed"), "40");
    await userEvent.click(saveButton());
    expect(await screen.findByText("Profile updated")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/profile")).toMatchObject({ yearsExperience: 7, selfReportedCompletedJobs: 40, whatsappNumber: null, addressLine: null, locality: null, pincode: null, email: "", website: "https://x.co" });
  });

  it("shows location errors from the form", async () => {
    withProfile();
    await renderApp("/profile");
    const city = await screen.findByLabelText(/^City/);
    await userEvent.clear(city);
    await userEvent.click(saveButton());
    expect(await screen.findByText("Enter your city")).toBeInTheDocument();
    expect(city).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a skeleton until the profile loads", async () => {
    let release!: () => void;
    mockApi({ ...inApp(), "/provider/profile": () => new Promise<Response>((r) => (release = () => r(json({ provider: profile() })))) });
    await renderApp("/profile");
    await screen.findByText("Sharma TV Repair");
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    release();
    expect(await screen.findByLabelText(/Business name/)).toBeInTheDocument();
  });
});

const attrGroups = [
  {
    providerServiceId: 1,
    title: "TV Repair",
    attributes: [
      { id: 1, label: "Home visits", fieldType: "boolean", options: [], isRequired: true, value: null },
      { id: 2, label: "Main brand", fieldType: "select", options: ["Sony", "LG"], isRequired: true, value: null },
      { id: 3, label: "Brands", fieldType: "multiselect", options: ["Sony", "LG"], isRequired: true, value: ["Sony"] },
      { id: 4, label: "Warranty days", fieldType: "number", options: [], isRequired: false, value: "30" },
      { id: 5, label: "Notes", fieldType: "text", options: [], isRequired: true, value: "Old" },
    ],
  },
  {
    providerServiceId: 2,
    title: "AC Repair",
    attributes: [
      { id: 6, label: "Gas refill", fieldType: "boolean", options: [], isRequired: false, value: false },
      { id: 7, label: "Tonnage", fieldType: "select", options: ["1", "2"], isRequired: false, value: null },
      { id: 8, label: "Extras", fieldType: "text", options: [], isRequired: false, value: "Stand" },
    ],
  },
];

describe("services page", () => {
  it("edits services, validates and saves them", async () => {
    let fail = true;
    const { fetch } = withProfile({}, { "/provider/attributes": { groups: [] }, "PUT /provider/services": () => (fail ? json({ error: { message: "Save failed" } }, 500) : json({ ok: true })) });
    await renderApp("/services");
    expect(await screen.findByText("Main service")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove TV Repair" }));
    await userEvent.click(saveButton());
    expect(await screen.findByText("Pick at least one service")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Starting price for TV Repair"), { target: { value: "450" } });
    await userEvent.click(saveButton());
    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    fail = false;
    await userEvent.click(saveButton());
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/services")).toEqual({ services: [{ categoryId: 1, subcategoryId: 11, startingPrice: 450, priceUnit: "per_visit", isPrimary: true }] });
  });

  it("answers service questions with validation", async () => {
    let fail = true;
    const { fetch } = withProfile({}, { "/provider/attributes": { groups: attrGroups }, "PUT /provider/attributes": () => (fail ? json({ error: { message: "Attributes failed" } }, 500) : json({ ok: true })) });
    await renderApp("/services");
    expect(await screen.findByText("Service details")).toBeInTheDocument();
    expect(screen.getByText("TV Repair", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("Not answered")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save details/ })).toBeDisabled();

    // Break some answers, then save to see every message.
    await userEvent.click(screen.getByRole("button", { name: /Sony/ , pressed: true }));
    fireEvent.change(screen.getByLabelText("Warranty days"), { target: { value: "-1" } });
    fireEvent.change(screen.getByLabelText(/^Notes/), { target: { value: "x".repeat(301) } });
    await userEvent.click(screen.getByRole("button", { name: /Save details/ }));
    expect(await screen.findByText("Answer the highlighted questions")).toBeInTheDocument();
    expect(screen.getByText("This answer is required")).toBeInTheDocument();
    expect(screen.getAllByText("Choose an option")).toHaveLength(2);
    expect(screen.getByText("Enter a number of 0 or more")).toBeInTheDocument();
    expect(screen.getByText("Keep it under 300 characters")).toBeInTheDocument();
    expect(screen.getByLabelText("Warranty days")).toHaveAttribute("aria-describedby", "attr-1-4-error");

    // Fix them.
    await userEvent.click(screen.getByLabelText(/Home visits/));
    expect(screen.getByText("Yes")).toBeInTheDocument();
    await pickOption(screen.getByRole("combobox", { name: /Main brand/ }), "LG");
    await userEvent.click(screen.getAllByRole("button", { name: /LG/, pressed: false })[0]!);
    fireEvent.change(screen.getByLabelText("Warranty days"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Warranty days"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText(/^Notes/), { target: { value: "Fine" } });
    fireEvent.change(screen.getByLabelText("Extras"), { target: { value: "" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Save details/ }));
    expect(await screen.findByText("Attributes failed")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Save details/ }));
    expect(await screen.findByText("Service details saved")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/attributes").values).toEqual(
      expect.arrayContaining([
        { providerServiceId: 1, attributeId: 1, value: true },
        { providerServiceId: 1, attributeId: 2, value: "LG" },
        { providerServiceId: 1, attributeId: 3, value: ["LG"] },
        { providerServiceId: 1, attributeId: 4, value: 15 },
        { providerServiceId: 2, attributeId: 8, value: null },
      ]),
    );
  });

  it("shows a single group without its title, and a number that is not a number", async () => {
    const { fetch } = withProfile({}, {
      "/provider/attributes": { groups: [{ providerServiceId: 1, title: "Only", attributes: [{ id: 4, label: "Count", fieldType: "number", options: [], isRequired: false, value: "abc" }] }] },
      "PUT /provider/attributes": { ok: true },
    });
    await renderApp("/services");
    await screen.findByText("Service details");
    expect(screen.queryByText("Only")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "2" } });
    await userEvent.click(screen.getByRole("button", { name: /Save details/ }));
    expect(await screen.findByText("Service details saved")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/attributes")).toEqual({ values: [{ providerServiceId: 1, attributeId: 4, value: 2 }] });
  });
});

describe("hours and areas pages", () => {
  it("defaults empty hours, validates and saves", async () => {
    const { fetch } = withProfile({ businessHours: [] }, { "PUT /provider/hours": { ok: true } });
    await renderApp("/hours");
    expect(await screen.findByLabelText("Tuesday opening time")).toHaveValue("09:00");
    fireEvent.change(screen.getByLabelText("Monday closing time"), { target: { value: "08:00" } });
    await userEvent.click(saveButton());
    expect(await screen.findByText("Fix the highlighted days before saving")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Monday closing time"), { target: { value: "21:00" } });
    await userEvent.click(saveButton());
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/hours").hours[1]).toMatchObject({ dayOfWeek: 1, closeTime: "21:00" });
  });

  it("loads saved hours", async () => {
    withProfile();
    await renderApp("/hours");
    expect(await screen.findByLabelText("Monday closing time")).toHaveValue("18:00");
    expect(screen.getAllByText("Closed")).toHaveLength(6);
    await userEvent.click(screen.getAllByRole("switch").find((s) => s.closest("div")?.textContent?.includes("Tuesday"))!);
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getAllByText("Closed")).toHaveLength(6);
  });

  it("edits and saves service areas", async () => {
    const { fetch } = withProfile({}, { "PUT /provider/service-areas": { ok: true } });
    await renderApp("/areas");
    expect(await screen.findByText(/within 10 km of your location/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Area name"), "Juhu{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Remove Andheri" }));
    await userEvent.click(saveButton());
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/service-areas")).toEqual({ serviceAreas: [{ areaName: "Juhu" }] });
    // The mocked server still has Andheri, so discarding goes back to it.
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByText("Andheri")).toBeInTheDocument();
  });
});

const photo = (id: number, over: Record<string, unknown> = {}) => ({ id, title: `Photo ${id}`, description: null, imageUrl: `http://cdn.test/${id}.jpg`, categoryId: null, sortOrder: id, isCover: false, ...over });

describe("portfolio", () => {
  it("shows the empty state and adds a first photo", async () => {
    stubUploads();
    const { fetch } = withProfile({ portfolio: [] }, { "POST /provider/portfolio": { ok: true } }, { plan: planState("pro") });
    await renderApp("/portfolio");
    expect(await screen.findByText("No photos yet")).toBeInTheDocument();
    expect(screen.queryByText(/plan shows/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Add your first photo/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Add a photo")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /Save photo/ }));
    expect(await within(dialog).findByText("Upload a photo")).toBeInTheDocument();
    expect(within(dialog).getByText("Give the photo a short title")).toBeInTheDocument();
    expect(document.querySelector("#imageUrl")).toHaveAttribute("aria-describedby", "imageUrl-error");
    await userEvent.upload(document.querySelector<HTMLInputElement>("#imageUrl")!, pngFile());
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /Save photo/ })).toBeDisabled());
    await within(dialog).findByAltText("Uploaded preview");
    await userEvent.type(within(dialog).getByLabelText(/Title/), "New shop");
    fireEvent.change(within(dialog).getByLabelText(/Description/), { target: { value: "x".repeat(501) } });
    await userEvent.click(within(dialog).getByRole("button", { name: /Save photo/ }));
    expect(await within(dialog).findByText("Keep the description under 500 characters")).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText(/Description/));
    await userEvent.click(within(dialog).getByRole("button", { name: /Save photo/ }));
    expect(await screen.findByText("Photo added")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/portfolio")).toEqual({ title: "New shop", description: null, imageUrl: "http://cdn.test/portfolio.png" });
  });

  it("edits, reorders, sets the cover and removes photos", async () => {
    let fail = false;
    const items = [photo(1, { isCover: true, description: "Front" }), photo(2), photo(3)];
    const { fetch } = withProfile({ portfolio: items }, {
      "PATCH /provider/portfolio/2": (_u: URL, init?: RequestInit) => (fail ? json({ error: { message: "Patch failed" } }, 500) : json({ ok: true, body: init?.body })),
      "PUT /provider/portfolio/order": () => (fail ? json({ error: { message: "Order failed" } }, 500) : json({ ok: true })),
      "DELETE /provider/portfolio/3": () => (fail ? json({ error: { message: "Delete failed" } }, 500) : json({ ok: true })),
    });
    await renderApp("/portfolio");
    expect(await screen.findByText("Front")).toBeInTheDocument();
    expect(screen.getByText("Cover")).toBeInTheDocument();
    expect(screen.getByText(/Your Free plan shows 3 photos \(3 of 3 used\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Upgrade for more photos/ })).toBeInTheDocument();
    expect(screen.getByText("Show more of your work")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Move "Photo 1" earlier' })).toBeDisabled();
    expect(screen.getByRole("button", { name: 'Move "Photo 2" earlier' })).toBeDisabled();
    expect(screen.getByRole("button", { name: 'Move "Photo 3" later' })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: 'Move "Photo 2" later' }));
    await waitFor(() => expect(lastBody(fetch, "/portfolio/order")).toEqual({ ids: [1, 3, 2] }));
    await waitFor(() => expect(screen.getByRole("button", { name: 'Move "Photo 3" earlier' })).toBeEnabled());
    fail = true;
    await userEvent.click(screen.getByRole("button", { name: 'Move "Photo 3" earlier' }));
    expect(await screen.findByText("Order failed")).toBeInTheDocument();
    fail = false;

    await userEvent.click(screen.getAllByRole("button", { name: /Set as cover/ })[0]!);
    expect(await screen.findByText(/Cover photo set/)).toBeInTheDocument();
    expect(lastBody(fetch, "/portfolio/2")).toEqual({ isCover: true });
    fail = true;
    await userEvent.click(screen.getAllByRole("button", { name: /Set as cover/ })[0]!);
    expect(await screen.findByText("Patch failed")).toBeInTheDocument();

    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    await userEvent.click(screen.getAllByRole("button", { name: "Delete photo" })[2]!);
    expect(confirm).toHaveBeenCalledWith('Remove "Photo 3"?');
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getAllByRole("button", { name: "Delete photo" })[2]!);
    expect(await screen.findByText("Delete failed")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getAllByRole("button", { name: "Delete photo" })[2]!);
    expect(await screen.findByText("Photo removed")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Edit photo" })[1]!);
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit photo")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Title/)).toHaveValue("Photo 2");
    await userEvent.type(within(dialog).getByLabelText(/Description/), "Back room");
    fail = true;
    await userEvent.click(within(dialog).getByRole("button", { name: /Save photo/ }));
    await waitFor(() => expect(lastBody(fetch, "/portfolio/2")).toMatchObject({ description: "Back room" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fail = false;
    await userEvent.click(within(dialog).getByRole("button", { name: /Save photo/ }));
    expect(await screen.findByText("Photo updated")).toBeInTheDocument();
    expect(lastBody(fetch, "/portfolio/2")).toEqual({ title: "Photo 2", description: "Back room", imageUrl: "http://cdn.test/2.jpg" });

    await userEvent.click(screen.getAllByRole("button", { name: "Edit photo" })[0]!);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Description/)).toHaveValue("Front");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await userEvent.click(screen.getAllByRole("button", { name: "Edit photo" })[0]!);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("lets photos move when none is the cover, below the limit", async () => {
    const { fetch } = withProfile({ portfolio: [photo(1), photo(2)] }, { "PUT /provider/portfolio/order": { ok: true } });
    await renderApp("/portfolio");
    expect(await screen.findByText(/\(2 of 3 used\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add photo/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: 'Move "Photo 2" earlier' }));
    await waitFor(() => expect(lastBody(fetch, "/portfolio/order")).toEqual({ ids: [2, 1] }));
    await userEvent.click(screen.getByRole("button", { name: /Add photo/ }));
    expect(await screen.findByText("Add a photo")).toBeInTheDocument();
  });

  it("shows a skeleton until the profile loads", async () => {
    mockApi({ ...inApp(), "/provider/profile": () => new Promise<Response>(() => undefined) });
    await renderApp("/portfolio");
    await screen.findByText("Sharma TV Repair");
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("verification", () => {
  it("shows each state and submits documents", async () => {
    stubUploads();
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "/provider/verifications": {
        verificationStatus: "partial",
        verifications: [
          { id: 1, type: "business", status: "approved", documentUrl: null, notes: null, createdAt: "2026-09-01T00:00:00.000Z", verifiedAt: "2026-09-03T00:00:00.000Z" },
          { id: 2, type: "location", status: "rejected", documentUrl: null, notes: "Blurry photo", createdAt: "2026-09-01T00:00:00.000Z", verifiedAt: null },
        ],
      },
      "POST /provider/verifications": () => (fail ? json({ error: { message: "Upload rejected" } }, 400) : json({ ok: true })),
    });
    await renderApp("/verification");
    expect(await screen.findByText("Partially verified")).toBeInTheDocument();
    expect(screen.getByText(/Approved 3 Sept? 2026/)).toBeInTheDocument();
    expect(screen.getByText("Not accepted")).toBeInTheDocument();
    expect(screen.getByText("Blurry photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit again/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Submit for review/ }));
    expect(screen.getByText("Upload a document before submitting")).toBeInTheDocument();
    expect(document.querySelector("#doc-id_proof")).toHaveAttribute("aria-describedby", "doc-id_proof-error");
    await userEvent.upload(document.querySelector<HTMLInputElement>("#doc-id_proof")!, pdfFile());
    await waitFor(() => expect(screen.getByRole("button", { name: /Submit for review/ })).toBeDisabled());
    await waitFor(() => expect(screen.queryByText("Upload a document before submitting")).not.toBeInTheDocument());
    await userEvent.click(screen.getAllByRole("button", { name: /Remove/ })[0]!);
    await userEvent.upload(document.querySelector<HTMLInputElement>("#doc-id_proof")!, pdfFile());
    await waitFor(() => expect(screen.getByRole("button", { name: /Submit for review/ })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: /Submit for review/ }));
    expect(await screen.findByText("Upload rejected")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Submit for review/ }));
    expect(await screen.findByText("Document submitted for review")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/verifications")).toEqual({ type: "id_proof", documentUrl: "http://cdn.test/document.png" });
  });

  it("shows pending reviews, approvals without a date, and the other badges", async () => {
    mockApi({
      ...inApp(),
      "/provider/verifications": {
        verificationStatus: "verified",
        verifications: [
          { id: 1, type: "business", status: "approved", documentUrl: null, notes: null, createdAt: "2026-09-01T00:00:00.000Z", verifiedAt: null },
          { id: 2, type: "location", status: "pending", documentUrl: null, notes: null, createdAt: "2026-09-02T00:00:00.000Z", verifiedAt: null },
          { id: 3, type: "id_proof", status: "rejected", documentUrl: null, notes: null, createdAt: "2026-09-02T00:00:00.000Z", verifiedAt: null },
        ],
      },
    });
    await renderApp("/verification");
    expect(await screen.findByText("Verified business")).toBeInTheDocument();
    expect(screen.getByText(/Under review since 2 Sept? 2026/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Submit/ })).toHaveLength(1);
  });

  it("labels unverified businesses", async () => {
    mockApi({ ...inApp(), "/provider/verifications": { verificationStatus: "none", verifications: [] } });
    await renderApp("/verification");
    expect(await screen.findByText("Not verified")).toBeInTheDocument();
  });
});
