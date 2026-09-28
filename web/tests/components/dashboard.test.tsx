// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AddressManager, DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/dashboard/account-forms";
import { Attachments, CloseTicketButton, NewTicketButton, TicketReply } from "@/components/dashboard/support";
import { NotificationList } from "@/components/dashboard/notification-list";
import { ContactRow } from "@/components/dashboard/contact-row";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DeleteReviewButton } from "@/components/dashboard/my-review-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SessionProvider } from "@/components/site/session-provider";
import { nav } from "../next-state";
import { json, mockApi, provider, user } from "../helpers";

const upload = vi.hoisted(() => ({ checkFile: vi.fn(), uploadFile: vi.fn() }));
vi.mock("@/lib/upload", async (orig) => ({ ...(await orig<typeof import("@/lib/upload")>()), checkFile: upload.checkFile, uploadFile: upload.uploadFile }));

describe("ProfileForm", () => {
  it("saves only when changed", async () => {
    const u = userEvent.setup();
    render(<ProfileForm name="Asha Rao" email="a@b.co" phone={null} profilePhotoUrl={null} />);
    const save = screen.getByRole("button", { name: /Save profile/ });
    expect(save).toBeDisabled();
    await u.clear(screen.getByLabelText(/Full name/));
    await u.type(screen.getByLabelText(/Full name/), "A1");
    await u.click(save);
    expect(await screen.findByText(/Use letters/)).toBeInTheDocument();
    await u.clear(screen.getByLabelText(/Full name/));
    await u.type(screen.getByLabelText(/Full name/), " Asha R ");
    await u.type(screen.getByLabelText(/Phone/), "9876543210");
    mockApi({ "PATCH /auth/me": json({ error: { message: "Nope" } }, 400) });
    await u.click(save);
    expect(await screen.findByText("Nope")).toBeInTheDocument();
    mockApi({ "PATCH /auth/me": () => Promise.reject(new TypeError("x")) as never });
    await u.click(save);
    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    const fetch = mockApi({ "PATCH /auth/me": { user: {} } });
    await u.click(save);
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ name: "Asha R", phone: "+919876543210", profilePhotoUrl: null });
    await waitFor(() => expect(save).toBeDisabled());
  });
  it("keeps the existing photo and clears an empty phone", async () => {
    const u = userEvent.setup();
    render(<ProfileForm name="Asha Rao" email="a@b.co" phone="+919876543210" profilePhotoUrl="https://x/p.webp" />);
    await u.clear(screen.getByLabelText(/Phone/));
    const fetch = mockApi({ "PATCH /auth/me": { user: {} } });
    await u.click(screen.getByRole("button", { name: /Save profile/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ name: "Asha Rao", phone: null, profilePhotoUrl: "https://x/p.webp" });
  });
});

describe("PasswordForm", () => {
  it("changes a password", async () => {
    const u = userEvent.setup();
    render(<PasswordForm hasPassword />);
    await u.click(screen.getByRole("button", { name: /Change password/ }));
    expect(await screen.findByText("Enter your current password")).toBeInTheDocument();
    await u.type(screen.getByLabelText(/Current password/), "secret123");
    await u.type(screen.getByLabelText(/^New password/), "secret123");
    await u.type(screen.getByLabelText(/Confirm new password/), "other1234");
    await u.click(screen.getByRole("button", { name: /Change password/ }));
    expect(await screen.findByText("Choose a password different from your current one")).toBeInTheDocument();
    expect(screen.getByText("The passwords do not match")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /Show passwords/ }));
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute("type", "text");
    await u.click(screen.getByRole("button", { name: /Hide passwords/ }));
    await u.clear(screen.getByLabelText(/^New password/));
    await u.type(screen.getByLabelText(/^New password/), "newpass123");
    await u.clear(screen.getByLabelText(/Confirm new password/));
    await u.type(screen.getByLabelText(/Confirm new password/), "newpass123");
    mockApi({ "POST /auth/change-password": json({ error: { message: "Current password is incorrect" } }, 400) });
    await u.click(screen.getByRole("button", { name: /Change password/ }));
    expect(await screen.findByText("Current password is incorrect")).toBeInTheDocument();
    const success = vi.spyOn(toast, "success");
    mockApi({ "POST /auth/change-password": { ok: true } });
    await u.click(screen.getByRole("button", { name: /Change password/ }));
    await waitFor(() => expect(success).toHaveBeenCalledWith("Password changed"));
    expect(nav.router.refresh).not.toHaveBeenCalled();
  });
  it("sets a first password", async () => {
    const u = userEvent.setup();
    render(<PasswordForm hasPassword={false} />);
    expect(screen.queryByLabelText(/Current password/)).toBeNull();
    await u.type(screen.getByLabelText(/^New password/), "newpass123");
    await u.type(screen.getByLabelText(/Confirm new password/), "newpass123");
    const fetch = mockApi({ "POST /auth/change-password": { ok: true } });
    await u.click(screen.getByRole("button", { name: /Set password/ }));
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ newPassword: "newpass123" });
  });
});

describe("AddressManager", () => {
  const addresses = [
    { id: 1, label: "Home", addressLine: "1 Road", city: "Mumbai", state: "MH", pincode: "400001", latitude: null, longitude: null, isDefault: true },
    { id: 2, label: "", addressLine: "2 Lane", city: "Pune", state: "MH", pincode: "411001", latitude: null, longitude: null, isDefault: false },
  ];

  it("adds an address", async () => {
    const u = userEvent.setup();
    render(<AddressManager addresses={[]} />);
    await u.click(screen.getByRole("button", { name: /Add address/ }));
    await u.click(screen.getByRole("button", { name: /Save address/ }));
    expect(await screen.findByText("Enter the house, street and landmark")).toBeInTheDocument();
    await u.type(screen.getByLabelText(/PIN code/), "40a0001");
    expect(screen.getByLabelText(/PIN code/)).toHaveValue("400001");
    await u.type(screen.getByLabelText(/^Address/), "1 Main Road");
    await u.type(screen.getByLabelText(/City/), "Mumbai");
    await u.type(screen.getByLabelText(/State/), "Maharashtra");
    mockApi({ "POST /me/addresses": json({ error: { message: "Too many" } }, 400) });
    await u.click(screen.getByRole("button", { name: /Save address/ }));
    expect(await screen.findByText("Too many")).toBeInTheDocument();
    const fetch = mockApi({ "POST /me/addresses": { address: {} } });
    await u.click(screen.getByRole("button", { name: /Save address/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toMatchObject({ label: "Home", isDefault: true });
    await u.click(screen.getByRole("button", { name: /Add address/ }));
    await u.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("makes an address the default and removes one", async () => {
    const u = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    render(<AddressManager addresses={addresses} />);
    expect(screen.getByText("Default")).toBeInTheDocument();
    mockApi({ "PATCH /me/addresses/2": json({ error: { message: "Nope" } }, 400) });
    await u.click(screen.getByRole("button", { name: /Make default/ }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Nope"));
    mockApi({ "PATCH /me/addresses/2": { address: {} } });
    await u.click(screen.getByRole("button", { name: /Make default/ }));
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
    await u.click(screen.getAllByRole("button", { name: /Remove/ })[1]!);
    expect(screen.getByRole("dialog")).toHaveTextContent("This address will be removed");
    mockApi({ "DELETE /me/addresses/2": json({ error: { message: "Gone" } }, 404) });
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Gone"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await u.click(screen.getAllByRole("button", { name: /Remove/ })[0]!);
    expect(screen.getByRole("dialog")).toHaveTextContent("Home will be removed");
    mockApi({ "DELETE /me/addresses/1": { ok: true } });
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("DeleteAccountForm", () => {
  it("asks for the password, then deletes", async () => {
    const u = userEvent.setup();
    render(<DeleteAccountForm hasPassword />);
    await u.click(screen.getByRole("button", { name: /Delete account/ }));
    const dialog = screen.getByRole("dialog");
    await u.click(within(dialog).getByRole("button", { name: /Delete account/ }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter your password to confirm");
    await u.type(within(dialog).getByLabelText("Your password"), "secret123");
    mockApi({ "DELETE /auth/me": json({ error: { message: "Password is incorrect" } }, 400) });
    await u.click(within(dialog).getByRole("button", { name: /Delete account/ }));
    expect(await within(dialog).findByText("Password is incorrect")).toBeInTheDocument();
    // Closing with Escape clears what was typed. (The Cancel button closes without clearing it.)
    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await u.click(screen.getByRole("button", { name: /Delete account/ }));
    expect(screen.getByLabelText("Your password")).toHaveValue("");
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await u.click(screen.getByRole("button", { name: /Delete account/ }));
    await u.type(screen.getByLabelText("Your password"), "secret123");
    mockApi({ "DELETE /auth/me": { ok: true }, "POST /api/auth/logout": () => Promise.reject(new Error("x")) as never });
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Delete account/ }));
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith("/"));
  });
  it("deletes a password-less account", async () => {
    const u = userEvent.setup();
    render(<DeleteAccountForm hasPassword={false} />);
    await u.click(screen.getByRole("button", { name: /Delete account/ }));
    const fetch = mockApi({ "DELETE /auth/me": { ok: true }, "POST /api/auth/logout": { ok: true } });
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Delete account/ }));
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith("/"));
    expect(fetch.mock.calls[0]![1]!.body).toBe("{}");
  });
});

describe("ConfirmDialog", () => {
  it("stays open while working and cannot be dismissed then", async () => {
    const u = userEvent.setup();
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (finish = r)));
    render(<ConfirmDialog trigger={<button>Go</button>} title="Sure?" description="D" confirmLabel="Yes" onConfirm={onConfirm} />);
    await u.click(screen.getByRole("button", { name: "Go" }));
    await u.click(screen.getByRole("button", { name: "Yes" }));
    await u.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await u.click(screen.getByRole("button", { name: "Go" }));
    await u.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("DeleteReviewButton", () => {
  it("deletes a review", async () => {
    const u = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    render(<DeleteReviewButton id={3} providerName="Shop" />);
    await u.click(screen.getByRole("button", { name: "Delete your review of Shop" }));
    mockApi({ "DELETE /reviews/3": json({}, 500) });
    await u.click(screen.getByRole("button", { name: "Delete review" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Could not delete the review"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await u.click(screen.getByRole("button", { name: "Delete your review of Shop" }));
    mockApi({ "DELETE /reviews/3": { ok: true } });
    await u.click(screen.getByRole("button", { name: "Delete review" }));
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
  });
});

describe("support", () => {
  it("shows attachments as images or documents", async () => {
    const u = userEvent.setup();
    const onRemove = vi.fn();
    render(<Attachments urls={["https://u/a.webp", "https://u/b.pdf?sig=1"]} onRemove={onRemove} />);
    expect(screen.getByAltText("Attachment")).toBeInTheDocument();
    await u.click(screen.getAllByRole("button", { name: "Remove attachment" })[0]!);
    expect(onRemove).toHaveBeenCalledWith("https://u/a.webp");
    render(<Attachments urls={["https://u/c.webp"]} />);
  });
  it("opens a ticket with attachments", async () => {
    const u = userEvent.setup();
    render(<NewTicketButton label="Contact us" />);
    await u.click(screen.getByRole("button", { name: /Contact us/ }));
    await u.click(screen.getByRole("button", { name: /Send request/ }));
    expect(await screen.findByText("Choose what this is about")).toBeInTheDocument();
    await u.click(screen.getByRole("combobox"));
    await u.click(await screen.findByRole("option", { name: "My account" }));
    await u.type(screen.getByLabelText(/Subject/), "Cannot sign in");
    await u.type(screen.getByLabelText(/Details/), "It fails every time I try");
    const input = screen.getByLabelText("Attach a file") as HTMLInputElement;
    upload.checkFile.mockResolvedValueOnce("Too big").mockResolvedValue(null);
    await u.upload(input, new File(["x"], "a.png", { type: "image/png" }));
    expect(await screen.findByText("Too big")).toBeInTheDocument();
    upload.uploadFile.mockRejectedValueOnce(new Error("Upload failed. Try again."));
    await u.upload(input, new File(["x"], "a.png", { type: "image/png" }));
    expect(await screen.findByText("Upload failed. Try again.")).toBeInTheDocument();
    upload.uploadFile.mockRejectedValueOnce("odd");
    await u.upload(input, new File(["x"], "a.png", { type: "image/png" }));
    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    upload.uploadFile.mockResolvedValue("https://u/a.webp");
    await u.upload(input, new File(["x"], "a.png", { type: "image/png" }));
    expect(await screen.findByAltText("Attachment")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [] } });
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    await u.click(screen.getByRole("button", { name: /Attach a file/ }));
    expect(click).toHaveBeenCalled();
    mockApi({ "POST /support/tickets": json({ error: { message: "Slow down" } }, 429) });
    await u.click(screen.getByRole("button", { name: /Send request/ }));
    expect(await screen.findByText("Slow down")).toBeInTheDocument();
    const fetch = mockApi({ "POST /support/tickets": { ticket: { id: 12, reference: "DNF-000012" } } });
    await u.click(screen.getByRole("button", { name: /Send request/ }));
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith("/dashboard/support/12"));
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toMatchObject({ category: "account", attachments: ["https://u/a.webp"] });
    await u.click(screen.getByRole("button", { name: /Contact us/ }));
    await u.click(screen.getByRole("button", { name: "Cancel" }));
  });
  it("uses the default label", () => {
    render(<NewTicketButton />);
    expect(screen.getByRole("button", { name: /New request/ })).toBeInTheDocument();
  });
  it("replies to a ticket", async () => {
    const u = userEvent.setup();
    render(<TicketReply id={5} />);
    await u.click(screen.getByRole("button", { name: /Send/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Write a message first");
    await u.type(screen.getByLabelText("Reply"), "Any update?");
    expect(screen.queryByRole("alert")).toBeNull();
    upload.checkFile.mockResolvedValue(null);
    upload.uploadFile.mockResolvedValue("https://u/b.pdf");
    await u.upload(screen.getByLabelText("Attach a file"), new File(["x"], "b.pdf", { type: "application/pdf" }));
    await screen.findByRole("button", { name: "Remove attachment" });
    await u.click(screen.getByRole("button", { name: "Remove attachment" }));
    mockApi({ "POST /support/tickets/5/messages": json({ error: { message: "Closed" } }, 400) });
    await u.click(screen.getByRole("button", { name: /Send/ }));
    expect(await screen.findByText("Closed")).toBeInTheDocument();
    mockApi({ "POST /support/tickets/5/messages": { message: {} } });
    await u.click(screen.getByRole("button", { name: /Send/ }));
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
    expect(screen.getByLabelText("Reply")).toHaveValue("");
  });
  it("closes a ticket", async () => {
    const u = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    render(<CloseTicketButton id={5} />);
    mockApi({ "POST /support/tickets/5/close": json({ error: { message: "Nope" } }, 400) });
    await u.click(screen.getByRole("button", { name: "Mark as solved" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Nope"));
    mockApi({ "POST /support/tickets/5/close": { ok: true } });
    await u.click(screen.getByRole("button", { name: "Mark as solved" }));
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
  });
});

describe("NotificationList", () => {
  const items = [
    { id: 1, type: "support", title: "Reply on DNF-1", body: "We replied", isRead: false, dataJson: { ticketId: 1 }, createdAt: new Date().toISOString() },
    { id: 2, type: "system", title: "Welcome", body: null, isRead: false, dataJson: null, createdAt: new Date().toISOString() },
    { id: 3, type: "review_reply", title: "Old", body: null, isRead: true, dataJson: { providerSlug: "shop" }, createdAt: new Date().toISOString() },
    { id: 4, type: "system", title: "Read", body: null, isRead: true, dataJson: null, createdAt: new Date().toISOString() },
  ];
  const renderList = () => {
    mockApi({ "/api/session": { user: user(), unread: 2 } });
    return render(<SessionProvider><NotificationList initial={items} /></SessionProvider>);
  };

  it("marks one or all read, rolling back on failure", async () => {
    const u = userEvent.setup();
    renderList();
    expect(screen.getByText("2 unread")).toBeInTheDocument();
    mockApi({ "POST /me/notifications/read": json({}, 500), "/api/session": { user: user(), unread: 2 } });
    const error = vi.spyOn(toast, "error");
    await u.click(screen.getByRole("button", { name: "Mark read" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Could not update your notifications"));
    expect(screen.getByText("2 unread")).toBeInTheDocument();
    mockApi({ "POST /me/notifications/read": { ok: true }, "/api/session": { user: user(), unread: 1 } });
    await u.click(screen.getByRole("button", { name: "Mark read" }));
    expect(await screen.findByText("1 unread")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Reply on DNF-1/ });
    link.addEventListener("click", (e) => e.preventDefault());
    await u.click(link);
    await waitFor(() => expect(screen.queryByText(/unread$/)).toBeNull());
    const readLink = screen.getByRole("link", { name: /Old/ });
    readLink.addEventListener("click", (e) => e.preventDefault());
    await u.click(readLink);
  });
  it("marks all read", async () => {
    const u = userEvent.setup();
    renderList();
    const fetch = mockApi({ "POST /me/notifications/read": { ok: true }, "/api/session": { user: user(), unread: 0 } });
    await u.click(screen.getByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(nav.router.refresh).toHaveBeenCalled());
    expect(fetch.mock.calls[0]![1]!.body).toBe("{}");
  });
});

describe("ContactRow and nav", () => {
  const item = (over: Record<string, unknown> = {}) => ({ id: 9, channel: "call", createdAt: new Date().toISOString(), customerReportedResponse: null, hasReview: false, provider: provider(), ...over }) as never;

  it("asks whether the provider responded", async () => {
    const u = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    const { unmount } = render(<ContactRow item={item()} />);
    mockApi({ "PATCH /leads/9/response": json({}, 500) });
    await u.click(screen.getByRole("button", { name: /Yes/ }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Could not save your answer"));
    expect(screen.getByText("Did they respond?")).toBeInTheDocument();
    mockApi({ "PATCH /leads/9/response": { lead: {} } });
    await u.click(screen.getByRole("button", { name: /No/ }));
    expect(await screen.findByText("No response")).toBeInTheDocument();
    unmount();
    render(<ContactRow item={item({ channel: "whatsapp", customerReportedResponse: true, hasReview: true })} />);
    expect(screen.getByText("They responded")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Write review" })).toBeNull();
  });
  it("highlights the current dashboard section", () => {
    nav.pathname = "/dashboard/support/3";
    const { unmount } = render(<DashboardNav />);
    expect(screen.getByRole("link", { name: /Help and support/ }).className).toContain("bg-primary");
    expect(screen.getByRole("link", { name: /Overview/ }).className).not.toContain("bg-primary");
    unmount();
    nav.pathname = "/dashboard";
    render(<DashboardNav />);
    expect(screen.getByRole("link", { name: /Overview/ }).className).toContain("bg-primary");
  });
});
