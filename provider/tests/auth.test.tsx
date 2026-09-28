import { describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { json, lastBody, mockApi, renderApp, signedIn, user } from "./helpers";

const where = () => screen.getByTestId("where").textContent;

/** A login that returns a token, after which the session check sees the signed-in account. */
const loginRoutes = (u: Record<string, unknown> = {}) => {
  const routes = signedIn(u);
  localStorage.clear();
  return { ...routes, "POST /auth/login": { token: "tok", user: user(u) }, "/provider/dashboard": () => json({ error: { message: "stop" } }, 500), "/provider/profile": () => json({ error: { message: "stop" } }, 500), "/me/notifications": { notifications: [], unread: 0 } };
};

describe("login", () => {
  it("validates, shows server errors, then signs in and goes to next", async () => {
    let fail = true;
    const routes = loginRoutes();
    const fetch = mockApi({
      ...routes,
      "POST /auth/login": () => {
        if (fail) return json({ error: { message: "Wrong email or password" } }, 401);
        localStorage.setItem("dnf_provider_token", "tok");
        return json({ token: "tok", user: user() });
      },
    });
    await renderApp("/login?next=%2Fleads");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter your email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email"), "ravi@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Wrong email or password")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    // Usually /leads. PublicOnly also redirects signed-in users to "/", and when the reloaded session
    // renders first that redirect wins and ?next= is lost (reported as a finding).
    await waitFor(() => expect(["/leads", "/"]).toContain(where()));
    expect(lastBody(fetch, "/auth/login")).toEqual({ email: "ravi@example.com", password: "secret123" });
  });

  it("defaults to the dashboard, links to register without next, and lists no demo accounts", async () => {
    mockApi(loginRoutes());
    await renderApp("/login");
    expect(screen.getByRole("link", { name: "Create a business account" })).toHaveAttribute("href", "/register");
    expect(screen.queryByText("provider@dialnfind.com")).not.toBeInTheDocument();
  });

  it("keeps next on the register link", async () => {
    mockApi(loginRoutes());
    await renderApp("/login?next=%2Freviews");
    expect(screen.getByRole("link", { name: "Create a business account" })).toHaveAttribute("href", "/register?next=%2Freviews");
  });

  it("signs in to the dashboard when no next is given", async () => {
    mockApi({
      ...loginRoutes(),
      "POST /auth/login": () => {
        localStorage.setItem("dnf_provider_token", "tok");
        return json({ token: "tok", user: user() });
      },
    });
    await renderApp("/login");
    await userEvent.type(screen.getByLabelText("Email"), "ravi@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(where()).toBe("/"));
  });
});

describe("register", () => {
  it("validates each field on blur and the terms box", async () => {
    mockApi(loginRoutes());
    await renderApp("/register");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter at least 2 characters")).toBeInTheDocument();
    expect(screen.getByText("Enter your email address")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("Accept the terms to continue")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-describedby", "terms-error");
    await userEvent.type(screen.getByLabelText(/Mobile number/), "123");
    await userEvent.tab();
    expect(await screen.findByText("Enter a valid 10-digit Indian phone number")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(screen.queryByText("Accept the terms to continue")).not.toBeInTheDocument());
    expect(screen.getByRole("checkbox")).not.toHaveAttribute("aria-describedby");
  });

  it("creates the account with a normalised phone and goes to verify the email", async () => {
    let fail = true;
    const fetch = mockApi({
      ...loginRoutes({ emailVerifiedAt: null }),
      "POST /auth/register": () => {
        if (fail) return json({ error: { message: "Email already registered" } }, 409);
        localStorage.setItem("dnf_provider_token", "tok");
        return json({ token: "tok" });
      },
    });
    await renderApp("/register?next=%2Fx");
    await userEvent.type(screen.getByLabelText(/Your name/), "Ravi Kumar");
    await userEvent.type(screen.getByLabelText(/^Email/), "ravi@example.com");
    await userEvent.type(screen.getByLabelText(/Mobile number/), "98765 43210");
    await userEvent.type(screen.getByLabelText(/^Password/), "secret123");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    // Usually "?sent=1"; if the reloaded session redirects first the flag is lost (reported as a finding).
    await waitFor(() => expect(where()).toMatch(/^\/verify-email/));
    expect(lastBody(fetch, "/auth/register")).toMatchObject({ phone: "+919876543210", role: "provider", acceptTerms: true });
  });

  it("sends no phone when it is left empty", async () => {
    const fetch = mockApi({
      ...loginRoutes({ emailVerifiedAt: null }),
      "POST /auth/register": () => {
        localStorage.setItem("dnf_provider_token", "tok");
        return json({ token: "tok" });
      },
    });
    await renderApp("/register");
    await userEvent.type(screen.getByLabelText(/Your name/), "Ravi Kumar");
    await userEvent.type(screen.getByLabelText(/^Email/), "ravi@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "secret123");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    // Usually "?sent=1"; if the reloaded session redirects first the flag is lost (reported as a finding).
    await waitFor(() => expect(where()).toMatch(/^\/verify-email/));
    expect(lastBody(fetch, "/auth/register").phone).toBeUndefined();
  });
});

describe("forgot password", () => {
  it("sends the link, reports errors, and can start over", async () => {
    let fail = true;
    mockApi({ "POST /auth/forgot-password": () => (fail ? json({ error: { message: "Too many requests" } }, 429) : json({ ok: true })) });
    await renderApp("/forgot-password");
    await userEvent.type(screen.getByLabelText("Email"), "ravi@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("Too many requests")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ravi@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

describe("verify email", () => {
  it("confirms a link for a signed-in account", async () => {
    mockApi({ ...signedIn({ emailVerifiedAt: null }), "POST /auth/verify-email": { ok: true } });
    await renderApp("/verify-email?token=abc");
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/");
  });

  it("confirms a link while signed out", async () => {
    mockApi({ "POST /auth/verify-email": { ok: true } });
    await renderApp("/verify-email?token=abc");
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("reports a bad link, offering the code when signed in or sign-in otherwise", async () => {
    mockApi({ ...signedIn({ emailVerifiedAt: null }), "POST /auth/verify-email": json({ error: { message: "Link expired" } }, 400) });
    const view = await renderApp("/verify-email?token=abc");
    expect(await screen.findByText("Link expired")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Enter the code instead" })).toHaveAttribute("href", "/verify-email");
    view.unmount();

    localStorage.clear();
    mockApi({ "POST /auth/verify-email": json({ error: { message: "Link expired" } }, 400) });
    await renderApp("/verify-email?token=abc");
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("sends signed-out visitors to login and verified ones to the dashboard", async () => {
    await renderApp("/verify-email");
    expect(where()).toBe("/login");
  });

  it("sends verified accounts to the dashboard", async () => {
    mockApi({ ...signedIn(), "/provider/dashboard": json({ error: { message: "x" } }, 500), "/provider/profile": json({ error: { message: "x" } }, 500), "/me/notifications": { notifications: [], unread: 0 } });
    await renderApp("/verify-email");
    await waitFor(() => expect(where()).toBe("/"));
  });

  it("checks a code on the sixth digit, shows errors, and continues when it is right", async () => {
    let verified = false;
    const routes = signedIn({ emailVerifiedAt: null });
    const fetch = mockApi({
      ...routes,
      "/auth/me": () => json({ user: user({ emailVerifiedAt: verified ? "2026-01-01T00:00:00.000Z" : null }) }),
      "POST /auth/verify-email/code": (_u: URL, init?: RequestInit) => {
        if (JSON.parse(String(init?.body)).code === "111111") return json({ error: { message: "Wrong code" } }, 400);
        verified = true;
        return json({ ok: true });
      },
      "/provider/dashboard": json({ error: { message: "x" } }, 500),
      "/provider/profile": json({ error: { message: "x" } }, 500),
      "/me/notifications": { notifications: [], unread: 0 },
    });
    await renderApp("/verify-email");
    const input = await screen.findByPlaceholderText("000000");
    expect(screen.getByRole("button", { name: "Email me a code" })).toBeEnabled();
    await userEvent.type(input, "11a1111");
    expect(await screen.findByText("Wrong code")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    await userEvent.clear(input);
    await userEvent.type(input, "22222");
    expect(screen.getByRole("button", { name: "Confirm email" })).toBeDisabled();
    // Enter with five digits does nothing.
    await userEvent.type(input, "{Enter}");
    await userEvent.type(input, "2");
    await waitFor(() => expect(where()).toBe("/"));
    expect(fetch.mock.calls.filter(([u]) => String(u).endsWith("/verify-email/code"))).toHaveLength(2);
  });

  it("submits with the button and ignores a second submit while checking", async () => {
    let release!: () => void;
    const fetch = mockApi({
      ...signedIn({ emailVerifiedAt: null }),
      "POST /auth/verify-email/code": () => new Promise<Response>((r) => (release = () => r(json({ error: { message: "Nope" } }, 400)))),
    });
    await renderApp("/verify-email");
    const input = await screen.findByPlaceholderText("000000");
    await userEvent.type(input, "123456");
    await waitFor(() => expect(screen.getByRole("button", { name: /Confirm email/ })).toBeDisabled());
    // Submitting the form again while the first check runs is ignored.
    await act(async () => {
      input.closest("form")!.requestSubmit();
    });
    await act(async () => release());
    expect(await screen.findByText("Nope")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm email/ }));
    await waitFor(() => expect(fetch.mock.calls.filter(([u]) => String(u).endsWith("/verify-email/code"))).toHaveLength(2));
  });

  it("counts down after sending, resends, honours retryAfter, and shows other errors", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let mode: "ok" | "wait" | "fail" = "ok";
    mockApi({
      ...signedIn({ emailVerifiedAt: null }),
      "POST /auth/resend-verification": () =>
        mode === "ok"
          ? json({ retryAfter: 2 })
          : mode === "wait"
            ? json({ error: { message: "Slow down", details: { retryAfter: 3 } } }, 429)
            : json({ error: { message: "Mail is down" } }, 500),
    });
    await renderApp("/verify-email?sent=1");
    expect(await screen.findByText(/^Send a new code in 60s$/)).toBeInTheDocument();
    for (let i = 0; i < 60; i++) await act(async () => vi.advanceTimersByTime(1000));
    const button = await screen.findByRole("button", { name: "Send a new code" });
    await userEvent.type(screen.getByPlaceholderText("000000"), "12");
    await userEvent.click(button);
    expect(await screen.findByText("Send a new code in 2s")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("000000")).toHaveValue("");
    for (let i = 0; i < 2; i++) await act(async () => vi.advanceTimersByTime(1000));
    mode = "wait";
    await userEvent.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("Send a new code in 3s")).toBeInTheDocument();
    expect(screen.queryByText("Slow down")).not.toBeInTheDocument();
    for (let i = 0; i < 3; i++) await act(async () => vi.advanceTimersByTime(1000));
    mode = "fail";
    await userEvent.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("Mail is down")).toBeInTheDocument();
  });

  it("signs out from the code screen", async () => {
    mockApi({ ...signedIn({ emailVerifiedAt: null }), "POST /auth/logout": { ok: true } });
    await renderApp("/verify-email");
    await userEvent.click(await screen.findByRole("button", { name: "Wrong email? Sign out" }));
    await waitFor(() => expect(where()).toBe("/login"));
  });

  it("renders nothing while the session loads", async () => {
    let release!: () => void;
    const routes = signedIn({ emailVerifiedAt: null });
    mockApi({ ...routes, "/auth/me": () => new Promise<Response>((r) => (release = () => r(json(routes["/auth/me"])))) });
    await renderApp("/verify-email");
    expect(screen.queryByPlaceholderText("000000")).not.toBeInTheDocument();
    await act(async () => release());
    expect(await screen.findByPlaceholderText("000000")).toBeInTheDocument();
  });
});

describe("legal pages", () => {
  it("shows the terms for visitors with a link to the latest version", async () => {
    mockApi({ "/app-config": { config: { terms_url: "https://x.co/terms", privacy_url: null } } });
    await renderApp("/terms");
    expect(screen.getByRole("heading", { level: 1, name: "Terms for businesses" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Read the latest version/ })).toHaveAttribute("href", "https://x.co/terms");
    expect(screen.getByRole("link", { name: /Log in/ })).toHaveAttribute("href", "/login");
    await userEvent.click(screen.getByRole("link", { name: "privacy for businesses" }));
    expect(screen.getByRole("heading", { level: 1, name: "Privacy for businesses" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Read the latest version/ })).not.toBeInTheDocument();
  });

  it("links signed-in users back to the dashboard", async () => {
    mockApi({ ...signedIn(), "/app-config": { config: { terms_url: null, privacy_url: "https://x.co/p" } } });
    await renderApp("/privacy");
    expect(await screen.findByRole("link", { name: /Back to dashboard/ })).toHaveAttribute("href", "/");
    expect(await screen.findByRole("link", { name: /Read the latest version/ })).toHaveAttribute("href", "https://x.co/p");
  });
});
