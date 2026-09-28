import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountPage } from "@/pages/account";
import { inApp, json, lastBody, mockApi, pdfFile, pickOption, pngFile, renderApp, renderWith, stubUploads, user } from "./helpers";

const where = () => screen.getByTestId("where").textContent;

const ticket = (over: Record<string, unknown> = {}) => ({
  id: 5,
  reference: "SUP-5",
  subject: "Wrong phone number",
  category: "listing",
  status: "open",
  lastActivityAt: "2026-09-27T00:00:00.000Z",
  createdAt: "2026-09-20T00:00:00.000Z",
  ...over,
});

const config = (over: Record<string, unknown> = {}) => ({ config: { support_email: "help@dialnfind.com", support_phone: "+919800012345", support_hours: "Mon to Sat, 10 to 6", terms_url: null, privacy_url: null, ...over } });

describe("support list", () => {
  it("lists requests with statuses and pages, and shows the contacts", async () => {
    const fetch = mockApi({
      ...inApp(),
      "/app-config": config(),
      "/support/tickets": (url: URL) =>
        json({ tickets: [ticket(), ticket({ id: 6, status: "pending" }), ticket({ id: 7, status: "resolved" }), ticket({ id: 8, status: "closed" })], page: Number(url.searchParams.get("page")), totalPages: 2 }),
    });
    await renderApp("/support");
    expect(await screen.findByText("Awaiting your reply")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Wrong phone number/ })[0]).toHaveAttribute("href", "/support/5");
    expect(screen.getByRole("link", { name: /help@dialnfind.com/ })).toHaveAttribute("href", "mailto:help@dialnfind.com");
    expect(screen.getByRole("link", { name: /\+91 98000 12345/ })).toHaveAttribute("href", "tel:+919800012345");
    expect(screen.getByText("Mon to Sat, 10 to 6")).toBeInTheDocument();
    expect(screen.getByText("What is a lead?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    await waitFor(() => expect(fetch.mock.calls.some(([u]) => String(u).includes("/support/tickets?page=2"))).toBe(true));
  });

  it("shows the empty state, loading contacts, and no contacts", async () => {
    let release!: () => void;
    mockApi({ ...inApp(), "/app-config": () => new Promise<Response>((r) => (release = () => r(json(config({ support_email: null, support_phone: null, support_hours: null }))))), "/support/tickets": { tickets: [], page: 1, totalPages: 1 } });
    await renderApp("/support");
    expect(await screen.findByText("No requests yet")).toBeInTheDocument();
    expect(document.querySelector(".h-16.animate-pulse")).toBeInTheDocument();
    release();
    expect(await screen.findByText("Send a request above and the team will reply here.")).toBeInTheDocument();
  });

  it("shows a skeleton while requests load", async () => {
    mockApi({ ...inApp(), "/app-config": config(), "/support/tickets": () => new Promise<Response>(() => undefined) });
    await renderApp("/support");
    await screen.findByRole("heading", { name: "Help and support" });
    expect(document.querySelector(".space-y-4 .animate-pulse")).toBeInTheDocument();
  });
});

describe("new support request", () => {
  it("validates, attaches files and sends the request", async () => {
    let answer: { status: number; body: unknown } = { status: 201, body: { url: "http://cdn.test/a.png" } };
    let n = 0;
    stubUploads(() => (answer.status === 201 ? { status: 201, body: { url: `http://cdn.test/f${++n}.${n === 2 ? "pdf" : "png"}` } } : answer));
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "/app-config": config(),
      "/support/tickets": { tickets: [], page: 1, totalPages: 1 },
      "POST /support/tickets": () => (fail ? json({ error: { message: "Too many requests" } }, 429) : json({ ticket: ticket({ id: 11, reference: "SUP-11" }) })),
      "/support/tickets/11": { ticket: ticket({ id: 11 }), messages: [] },
    });
    await renderApp("/support");
    await userEvent.click(await screen.findByRole("button", { name: /Contact support/ }));
    let dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /New request/ }));
    dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Send request/ }));
    expect(await within(dialog).findByText("Choose what this is about")).toBeInTheDocument();
    expect(within(dialog).getByText("Write a short subject, at least 5 characters")).toBeInTheDocument();
    expect(within(dialog).getByText("Describe the problem in at least 10 characters")).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox")).toHaveAttribute("aria-describedby", "category-error");

    await pickOption(within(dialog).getByRole("combobox"), "My listing");
    await userEvent.type(within(dialog).getByLabelText(/Subject/), "Wrong phone number");
    await userEvent.type(within(dialog).getByLabelText(/Details/), "My listing shows an old number.");

    const input = document.querySelector<HTMLInputElement>("#attachment")!;
    const click = vi.spyOn(input, "click");
    await userEvent.click(within(dialog).getByRole("button", { name: /Attach a file/ }));
    expect(click).toHaveBeenCalled();
    await userEvent.upload(input, new File(["x"], "a.txt", { type: "text/plain" }), { applyAccept: false });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Choose a JPG, PNG, WebP or PDF file");
    await userEvent.upload(input, pngFile());
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /Send request/ })).toBeDisabled());
    expect(await within(dialog).findByAltText("Attachment")).toHaveAttribute("src", "http://cdn.test/f1.png");
    await userEvent.upload(input, pdfFile());
    await waitFor(() => expect(within(dialog).getAllByRole("button", { name: "Remove attachment" })).toHaveLength(2));
    answer = { status: 500, body: { error: { message: "Storage is full" } } };
    await userEvent.upload(input, pngFile());
    expect(await within(dialog).findByText("Storage is full")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [] } });
    await userEvent.click(within(dialog).getAllByRole("button", { name: "Remove attachment" })[0]!);
    expect(within(dialog).getAllByRole("button", { name: "Remove attachment" })).toHaveLength(1);

    await userEvent.click(within(dialog).getByRole("button", { name: /Send request/ }));
    expect(await within(dialog).findByText("Too many requests")).toBeInTheDocument();
    fail = false;
    await userEvent.click(within(dialog).getByRole("button", { name: /Send request/ }));
    await waitFor(() => expect(where()).toBe("/support/11"));
    expect(await screen.findByText("Request SUP-11 sent")).toBeInTheDocument();
    expect(lastBody(fetch, "/support/tickets")).toEqual({ category: "listing", subject: "Wrong phone number", message: "My listing shows an old number.", attachments: ["http://cdn.test/f2.pdf"] });
  });

  it("stops at five attachments and closes with Escape", async () => {
    stubUploads();
    let n = 0;
    stubUploads(() => ({ status: 201, body: { url: `http://cdn.test/${++n}.png` } }));
    mockApi({ ...inApp(), "/app-config": config(), "/support/tickets": { tickets: [], page: 1, totalPages: 1 } });
    await renderApp("/support");
    await userEvent.click(await screen.findByRole("button", { name: /New request/ }));
    const dialog = await screen.findByRole("dialog");
    const input = document.querySelector<HTMLInputElement>("#attachment")!;
    for (let i = 1; i <= 5; i++) {
      await userEvent.upload(input, pngFile());
      await waitFor(() => expect(within(dialog).getAllByAltText("Attachment")).toHaveLength(i));
    }
    expect(within(dialog).getByRole("button", { name: /Attach a file/ })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("finishes quietly when the dialog closes mid-upload", async () => {
    stubUploads();
    mockApi({ ...inApp(), "/app-config": config(), "/support/tickets": { tickets: [], page: 1, totalPages: 1 } });
    await renderApp("/support");
    await userEvent.click(await screen.findByRole("button", { name: /New request/ }));
    await screen.findByRole("dialog");
    await userEvent.upload(document.querySelector<HTMLInputElement>("#attachment")!, pngFile());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 60));
  });
});

describe("support conversation", () => {
  it("shows the thread, replies with attachments, and closes the request", async () => {
    stubUploads(() => ({ status: 201, body: { url: "http://cdn.test/shot.png" } }));
    let replyFails = true;
    let closeFails = true;
    let closed = false;
    const fetch = mockApi({
      ...inApp(),
      "/support/tickets/5": () =>
        json({
          ticket: ticket({ status: closed ? "closed" : "pending" }),
          messages: [
            { id: 1, body: "Please fix it", attachments: ["http://cdn.test/doc.pdf"], fromStaff: false, createdAt: "2026-09-20T00:00:00.000Z", authorName: "Ravi" },
            { id: 2, body: "Which number?", attachments: [], fromStaff: true, createdAt: "2026-09-21T00:00:00.000Z", authorName: "Priya from DialNFind" },
          ],
        }),
      "POST /support/tickets/5/messages": () => (replyFails ? json({ error: { message: "Reply failed" } }, 500) : json({ ok: true })),
      "POST /support/tickets/5/close": () => {
        if (closeFails) return json({ error: { message: "Close failed" } }, 500);
        closed = true;
        return json({ ok: true });
      },
    });
    await renderApp("/support/5");
    expect(await screen.findByText("Priya from DialNFind")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText(/SUP-5 · opened 20 Sept? 2026/)).toBeInTheDocument();
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === "http://cdn.test/doc.pdf")).toBe(true);
    expect(screen.queryByRole("button", { name: "Remove attachment" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Write a message first");
    expect(screen.getByLabelText("Reply")).toHaveAttribute("aria-describedby", "reply-error");
    await userEvent.type(screen.getByLabelText("Reply"), "The one ending 3210");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.upload(document.querySelector<HTMLInputElement>("#attachment")!, pngFile());
    await screen.findByAltText("Attachment");
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(await screen.findByText("Reply failed")).toBeInTheDocument();
    replyFails = false;
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(await screen.findByText("Message sent")).toBeInTheDocument();
    expect(lastBody(fetch, "/tickets/5/messages")).toEqual({ body: "The one ending 3210", attachments: ["http://cdn.test/shot.png"] });
    expect(screen.getByLabelText("Reply")).toHaveValue("");

    await userEvent.click(screen.getByRole("button", { name: "Mark as solved" }));
    expect(await screen.findByText("Close failed")).toBeInTheDocument();
    closeFails = false;
    await userEvent.click(screen.getByRole("button", { name: "Mark as solved" }));
    expect(await screen.findByText("Request closed")).toBeInTheDocument();
    expect(await screen.findByText(/This request is closed/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as solved" })).not.toBeInTheDocument();
  });

  it("shows a skeleton while the request loads", async () => {
    mockApi({ ...inApp(), "/support/tickets/5": () => new Promise<Response>(() => undefined) });
    await renderApp("/support/5");
    await screen.findByText("Sharma TV Repair");
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("account settings", () => {
  it("saves the name and phone, with validation and errors", async () => {
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "PATCH /auth/me": (_u: URL, init?: RequestInit) => {
        if (fail) return json({ error: { message: "Could not save" } }, 500);
        const body = JSON.parse(String(init!.body));
        return json({ user: user({ name: body.name, phone: body.phone }) });
      },
    });
    await renderApp("/account");
    const name = await screen.findByLabelText(/Your name/);
    expect(screen.getByRole("button", { name: /Save details/ })).toBeDisabled();
    expect(screen.getByLabelText(/^Email/)).toHaveValue("ravi@example.com");
    await userEvent.clear(name);
    await userEvent.type(name, "R");
    await userEvent.tab();
    expect(await screen.findByText("Enter at least 2 characters")).toBeInTheDocument();
    await userEvent.type(name, "avi Kumar");
    await userEvent.clear(screen.getByLabelText(/Mobile number/));
    await userEvent.click(screen.getByRole("button", { name: /Save details/ }));
    expect(await screen.findByText("Could not save")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Save details/ }));
    expect(await screen.findByText("Account details saved")).toBeInTheDocument();
    expect(lastBody(fetch, "/auth/me")).toEqual({ name: "Ravi Kumar", phone: null });
    await userEvent.type(screen.getByLabelText(/Mobile number/), "9876543210");
    await userEvent.click(screen.getByRole("button", { name: /Save details/ }));
    await waitFor(() => expect(lastBody(fetch, "/auth/me")).toEqual({ name: "Ravi Kumar", phone: "+919876543210" }));
  });

  it("changes the password", async () => {
    let fail = true;
    const fetch = mockApi({ ...inApp(), "POST /auth/change-password": () => (fail ? json({ error: { message: "Current password is wrong" } }, 400) : json({ ok: true })) });
    await renderApp("/account");
    await userEvent.click(await screen.findByRole("button", { name: /^Change password/ }));
    expect(await screen.findByText("Enter your current password")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Current password/), "old12345");
    await userEvent.type(screen.getByLabelText(/^New password/), "new12345");
    await userEvent.type(screen.getByLabelText(/Confirm new password/), "other123");
    await userEvent.click(screen.getByRole("button", { name: /^Change password/ }));
    expect(await screen.findByText("The passwords do not match")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/Confirm new password/));
    await userEvent.type(screen.getByLabelText(/Confirm new password/), "new12345");
    await userEvent.click(screen.getByRole("button", { name: /^Change password/ }));
    expect(await screen.findByText("Current password is wrong")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /^Change password/ }));
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    expect(lastBody(fetch, "/change-password")).toEqual({ currentPassword: "old12345", newPassword: "new12345" });
    expect(screen.getByLabelText(/Current password/)).toHaveValue("");
  });

  it("sets a first password for social accounts", async () => {
    const fetch = mockApi({ ...inApp({ hasPassword: false, linkedAccounts: ["google", "apple"] }), "POST /auth/change-password": { ok: true } });
    await renderApp("/account");
    expect(await screen.findByText(/You sign in with Google and Apple/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Current password/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^New password/), "new12345");
    await userEvent.type(screen.getByLabelText(/Confirm new password/), "new12345");
    await userEvent.click(screen.getByRole("button", { name: /Set password/ }));
    expect(await screen.findByText(/Password set/)).toBeInTheDocument();
    expect(lastBody(fetch, "/change-password")).toEqual({ newPassword: "new12345" });
  });

  it("names a linked account generically when none is listed", async () => {
    mockApi(inApp({ hasPassword: false, linkedAccounts: [] }));
    await renderApp("/account");
    expect(await screen.findByText(/You sign in with a linked account/)).toBeInTheDocument();
  });

  it("deletes an account with a password", async () => {
    let fail = true;
    const fetch = mockApi({
      ...inApp(),
      "DELETE /auth/me": () => (fail ? json({ error: { message: "Wrong password" } }, 400) : json({ ok: true, storeSubscription: null })),
      "POST /auth/logout": { ok: true },
    });
    await renderApp("/account");
    await userEvent.click(await screen.findByRole("button", { name: /Delete account/ }));
    let dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /Delete permanently/ }));
    expect(within(dialog).getByText("Enter your password")).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Enter your password to confirm/), "x");
    expect(within(dialog).queryByText("Enter your password")).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /Delete permanently/ }));
    expect(await within(dialog).findByText("Wrong password")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep my account" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Delete account/ }));
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Enter your password to confirm/)).toHaveValue("");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Delete account/ }));
    dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Enter your password to confirm/), "secret123");
    await userEvent.click(within(dialog).getByRole("button", { name: /Delete permanently/ }));
    await waitFor(() => expect(where()).toMatch(/^\/login/));
    expect(await screen.findByText("Your account has been deleted.")).toBeInTheDocument();
    expect(lastBody(fetch, "/auth/me")).toEqual({ password: "secret123" });
  });

  it("deletes a social account by typing DELETE, and points to the store subscription", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const fetch = mockApi({ ...inApp({ hasPassword: false }), "DELETE /auth/me": { ok: true, storeSubscription: "play_store" }, "POST /auth/logout": { ok: true } });
    await renderApp("/account");
    await userEvent.click(await screen.findByRole("button", { name: /Delete account/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Type DELETE to confirm/), "remove");
    await userEvent.click(within(dialog).getByRole("button", { name: /Delete permanently/ }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Type DELETE to confirm");
    await userEvent.clear(within(dialog).getByLabelText(/Type DELETE to confirm/));
    await userEvent.type(within(dialog).getByLabelText(/Type DELETE to confirm/), " delete ");
    await userEvent.click(within(dialog).getByRole("button", { name: /Delete permanently/ }));
    await waitFor(() => expect(where()).toMatch(/^\/login/));
    expect(lastBody(fetch, "/auth/me")).toEqual({ confirm: " delete " });
    await userEvent.click(await screen.findByRole("button", { name: "Google Play subscriptions" }));
    expect(open).toHaveBeenCalledWith("https://play.google.com/store/account/subscriptions", "_blank", "noopener");
  });

  it("shows a skeleton without a signed-in account", () => {
    mockApi({});
    renderWith(<AccountPage />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
