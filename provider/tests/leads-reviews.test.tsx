import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { inApp, json, lastBody, mockApi, pickOption, renderApp } from "./helpers";

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

const lead = (over: Record<string, unknown> = {}) => ({
  id: 1,
  channel: "call",
  source: "search",
  description: null,
  createdAt: ago(1),
  customerName: "Asha",
  customerPhone: null,
  isGuest: false,
  service: "TV Repair",
  customerReportedResponse: null,
  reviewRating: null,
  details: [],
  disputeStatus: "none",
  disputeReason: null,
  providerStatus: "new",
  providerNote: null,
  locked: false,
  ...over,
});

const leadsPage = (leads: unknown[], over: Record<string, unknown> = {}) => ({ leads, leadLimit: null, page: 1, totalPages: 1, total: leads.length, ...over });
const leadsCalls = (fetch: ReturnType<typeof mockApi>) => fetch.mock.calls.map(([u]) => String(u)).filter((u) => u.includes("/provider/leads?"));

describe("leads", () => {
  it("shows an empty state with export disabled", async () => {
    mockApi({ ...inApp(), "/provider/leads": leadsPage([]) });
    await renderApp("/leads");
    expect(await screen.findByText("No leads yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeDisabled();
    expect(screen.queryByText("You are on the Free plan")).not.toBeInTheDocument();
  });

  it("shows every kind of lead", async () => {
    const leads = [
      lead({ id: 1, customerPhone: "+919812345678", isGuest: true, description: "Screen flickers", details: [{ label: "Brand", value: "Sony" }], reviewRating: 4 }),
      lead({ id: 2, channel: "whatsapp", service: null, source: "mystery", customerReportedResponse: true, disputeStatus: "open", providerNote: "Call back Monday", providerStatus: "won" }),
      lead({ id: 3, customerReportedResponse: false, disputeStatus: "accepted" }),
      lead({ id: 4, disputeStatus: "rejected", source: "ai_match" }),
      lead({ id: 5, locked: true, customerName: "Hidden customer", createdAt: ago(40) }),
    ];
    mockApi({ ...inApp(), "/provider/leads": leadsPage(leads, { leadLimit: 10, totalPages: 2, total: 20 }) });
    await renderApp("/leads");
    expect(await screen.findByText("not signed in")).toBeInTheDocument();
    expect(screen.getByText("You are on the Free plan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call +91 98123 45678" })).toHaveAttribute("href", "tel:+919812345678");
    const wa = screen.getByRole("link", { name: "WhatsApp +91 98123 45678" });
    expect(wa).toHaveAttribute("href", "https://wa.me/919812345678");
    fireEvent.click(screen.getByRole("link", { name: "Call +91 98123 45678" }));
    fireEvent.click(wa);
    expect(screen.getByText("Screen flickers")).toBeInTheDocument();
    expect(screen.getByText("Brand: Sony")).toBeInTheDocument();
    expect(screen.getByLabelText("4 out of 5")).toBeInTheDocument();
    expect(screen.getByText("General enquiry")).toBeInTheDocument();
    expect(screen.getByText("mystery")).toBeInTheDocument();
    expect(screen.getByText("Smart match")).toBeInTheDocument();
    expect(screen.getByText("Responded")).toBeInTheDocument();
    expect(screen.getByText("Missed")).toBeInTheDocument();
    expect(screen.getAllByText("Awaiting feedback")).toHaveLength(2);
    expect(screen.getByText("Reported, under review")).toBeInTheDocument();
    expect(screen.getByText("Report accepted, not counted")).toBeInTheDocument();
    expect(screen.getByText("Report not accepted")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Report$/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Hidden customer/ })).toHaveAttribute("href", "/subscription");
    expect(screen.getByText("Upgrade to track")).toBeInTheDocument();
    expect(screen.getByTitle("Call back Monday")).toHaveTextContent("Note");
    expect(screen.getAllByRole("button", { name: /Add note/ })).toHaveLength(3);
  });

  it("filters, pages and clears filters", async () => {
    const fetch = mockApi({
      ...inApp(),
      "/provider/leads": (url: URL) => json(url.searchParams.has("q") ? leadsPage([]) : leadsPage([lead()], { totalPages: 3, page: Number(url.searchParams.get("page")) })),
    });
    await renderApp("/leads");
    await screen.findByText("Asha");
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    await waitFor(() => expect(leadsCalls(fetch).at(-1)).toContain("page=2"));

    await userEvent.click(screen.getByRole("tab", { name: "Calls" }));
    await waitFor(() => expect(leadsCalls(fetch).at(-1)).toContain("page=1&pageSize=15&channel=call"));
    await pickOption(screen.getByRole("combobox", { name: "Filter by status" }), "Won");
    await waitFor(() => expect(leadsCalls(fetch).at(-1)).toContain("status=won"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-20" } });
    await waitFor(() => expect(leadsCalls(fetch).at(-1)).toContain("from=2026-09-01&to=2026-09-20"));
    expect(screen.getByLabelText("From")).toHaveAttribute("max", "2026-09-20");
    expect(screen.getByLabelText("To")).toHaveAttribute("min", "2026-09-01");
    await userEvent.type(screen.getByLabelText("Search leads"), "tv");
    expect(await screen.findByText("No leads match")).toBeInTheDocument();
    expect(leadsCalls(fetch).at(-1)).toContain("q=tv");

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await screen.findByText("Asha");
    expect(leadsCalls(fetch).at(-1)).toMatch(/pageSize=15$/);
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("exports the leads as CSV, with and without filters, and reports failures", async () => {
    URL.createObjectURL = vi.fn(() => "blob:csv");
    URL.revokeObjectURL = vi.fn();
    let fail = false;
    const fetch = mockApi({
      ...inApp(),
      "/provider/leads": leadsPage([lead()]),
      "/provider/leads/export.csv": () => (fail ? json({ error: { message: "Export failed" } }, 500) : new Response("a,b", { headers: { "content-disposition": 'attachment; filename="leads.csv"' } })),
    });
    await renderApp("/leads");
    await screen.findByText("Asha");
    await userEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith("/provider/leads/export.csv"))).toBe(true);

    await userEvent.click(screen.getByRole("tab", { name: "WhatsApp" }));
    fail = true;
    await waitFor(() => expect(screen.getByRole("button", { name: /Export CSV/ })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    expect(await screen.findByText("Export failed")).toBeInTheDocument();
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith("export.csv?channel=whatsapp"))).toBe(true);
  });

  it("changes a lead's status, and reports a failed update", async () => {
    let fail = false;
    const fetch = mockApi({
      ...inApp(),
      "/provider/leads": leadsPage([lead()]),
      "PATCH /provider/leads/1": () => (fail ? json({ error: { message: "Could not update" } }, 500) : json({ ok: true })),
    });
    await renderApp("/leads");
    await screen.findByText("Asha");
    await pickOption(screen.getByRole("combobox", { name: "Status for Asha" }), "Contacted");
    await waitFor(() => expect(lastBody(fetch, "/provider/leads/1")).toEqual({ status: "contacted" }));
    fail = true;
    await pickOption(screen.getByRole("combobox", { name: "Status for Asha" }), "Lost");
    expect(await screen.findByText("Could not update")).toBeInTheDocument();
  });

  it("adds, edits and removes a private note", async () => {
    const fetch = mockApi({
      ...inApp(),
      "/provider/leads": leadsPage([lead(), lead({ id: 2, customerName: "Bina", providerNote: "Quoted 500" })]),
      "PATCH /provider/leads/1": { ok: true },
      "PATCH /provider/leads/2": { ok: true },
    });
    await renderApp("/leads");
    await screen.findByText("Asha");
    await userEvent.click(screen.getByRole("button", { name: /Add note/ }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Note for Asha")).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("Note"), "  Visit Monday ");
    expect(within(dialog).getByText("15 / 1,000")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /Save note/ }));
    expect(await screen.findByText("Note saved")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/leads/1")).toEqual({ note: "Visit Monday" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByTitle("Quoted 500"));
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Note")).toHaveValue("Quoted 500");
    await userEvent.clear(within(dialog).getByLabelText("Note"));
    await userEvent.click(within(dialog).getByRole("button", { name: /Save note/ }));
    expect(await screen.findByText("Note removed")).toBeInTheDocument();
    expect(lastBody(fetch, "/provider/leads/2")).toEqual({ note: null });

    await userEvent.click(screen.getAllByRole("button", { name: /Add note/ })[0]!);
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await userEvent.click(screen.getAllByRole("button", { name: /Add note/ })[0]!);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("reports a lead, with validation and server errors", async () => {
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "/provider/leads": leadsPage([lead()]),
      "POST /provider/leads/1/dispute": () => (fail ? json({ error: { message: "Too late to report" } }, 400) : json({ ok: true })),
    });
    await renderApp("/leads");
    await screen.findByText("Asha");
    await userEvent.click(screen.getByRole("button", { name: /Report$/ }));
    let dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Send report/ }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("at least 10 characters");
    const reason = within(dialog).getByLabelText("What was wrong with it?");
    expect(reason).toHaveAttribute("aria-describedby", "report-reason-error");
    await userEvent.type(reason, "Wrong number, a robot call");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /Send report/ }));
    expect(await within(dialog).findByText("Too late to report")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Report$/ }));
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("What was wrong with it?"), "Spam call from a bot");
    await userEvent.click(within(dialog).getByRole("button", { name: /Send report/ }));
    expect(await screen.findByText("Thanks. Our team will look at this contact.")).toBeInTheDocument();
    expect(lastBody(fetch, "/dispute")).toEqual({ reason: "Spam call from a bot" });

    await userEvent.click(screen.getByRole("button", { name: /Report$/ }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

const review = (over: Record<string, unknown> = {}) => ({
  id: 1,
  rating: 5,
  reviewText: "Fixed it fast",
  providerReply: null,
  providerReplyAt: null,
  status: "published",
  isVerifiedContact: false,
  createdAt: ago(2),
  author: "Meena Das",
  photos: [],
  reported: false,
  ...over,
});
const reviewsPage = (reviews: unknown[], over: Record<string, unknown> = {}) => ({
  summary: { avgRating: 4.5, totalReviews: reviews.length, breakdown: [{ rating: 5, count: 3 }, { rating: 4, count: 1 }] },
  reviews,
  page: 1,
  totalPages: 1,
  ...over,
});

describe("reviews", () => {
  it("shows the summary and empty states for each tab", async () => {
    mockApi({ ...inApp(), "/provider/reviews": reviewsPage([], { summary: { avgRating: 0, totalReviews: 0, breakdown: [{ rating: 5, count: 0 }] } }) });
    await renderApp("/reviews");
    expect(await screen.findByText("No reviews yet")).toBeInTheDocument();
    expect(screen.getByText("0.0")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Needs a reply" }));
    expect(await screen.findByText("You are all caught up")).toBeInTheDocument();
  });

  it("replies, edits and removes replies, with validation", async () => {
    let fail = false;
    const fetch = mockApi({
      ...inApp(),
      "/provider/reviews": (url: URL) =>
        json(
          reviewsPage(
            [
              review({ isVerifiedContact: true }),
              review({ id: 2, author: "Raj", reviewText: null, providerReply: "Thank you!", reported: true }),
            ],
            { totalPages: 2, page: Number(url.searchParams.get("page")) },
          ),
        ),
      "PUT /provider/reviews/1/reply": () => (fail ? json({ error: { message: "Reply rejected" } }, 400) : json({ ok: true })),
      "PUT /provider/reviews/2/reply": { ok: true },
    });
    await renderApp("/reviews");
    expect(await screen.findByText("Contacted via DialNFind")).toBeInTheDocument();
    expect(screen.getByText("Reported to our team")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Reply$/ }));
    const box = screen.getByLabelText("Your reply");
    expect(box).toHaveAttribute("aria-describedby", "reply-1-count");
    await userEvent.click(screen.getByRole("button", { name: /Publish reply/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Write a reply of at least 2 characters");
    expect(box).toHaveAttribute("aria-describedby", "reply-1-error");
    fireEvent.change(box, { target: { value: "x".repeat(1001) } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Publish reply/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Keep the reply under 1,000 characters");
    fireEvent.change(box, { target: { value: " Thanks Meena " } });
    fail = true;
    await userEvent.click(screen.getByRole("button", { name: /Publish reply/ }));
    expect(await screen.findByText("Reply rejected")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Publish reply/ }));
    expect(await screen.findByText("Reply published")).toBeInTheDocument();
    expect(lastBody(fetch, "/reviews/1/reply")).toEqual({ reply: "Thanks Meena" });

    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByLabelText("Your reply")).toHaveValue("Thank you!");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    await userEvent.click(screen.getByRole("button", { name: "Remove reply" }));
    await waitFor(() => expect(lastBody(fetch, "/reviews/2/reply")).toEqual({ reply: null }));

    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    await waitFor(() => expect(fetch.mock.calls.some(([u]) => String(u).includes("filter=all&page=2"))).toBe(true));
  });

  it("reports a review", async () => {
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "/provider/reviews": reviewsPage([review()]),
      "POST /provider/reviews/1/report": () => (fail ? json({ error: { message: "Already reported" } }, 409) : json({ ok: true })),
    });
    await renderApp("/reviews");
    await userEvent.click(await screen.findByRole("button", { name: /Report/ }));
    let dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("What is wrong with this review?"), "This is not my customer");
    await userEvent.click(within(dialog).getByRole("button", { name: /Send report/ }));
    expect(await within(dialog).findByText("Already reported")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Report/ }));
    dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("What is wrong with this review?"), "This is not my customer");
    await userEvent.click(within(dialog).getByRole("button", { name: /Send report/ }));
    expect(await screen.findByText(/Our team will check this review/)).toBeInTheDocument();
    expect(lastBody(fetch, "/report")).toEqual({ reason: "This is not my customer" });
  });
});
