// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import posthog from "posthog-js";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ForgotPasswordForm, ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { VerifyEmail } from "@/components/auth/verify-email";
import { VerifyEmailCode } from "@/components/auth/verify-email-code";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { nav } from "../next-state";
import { json, mockApi } from "../helpers";

describe("AuthShell and form helpers", () => {
  it("renders the shell", () => {
    render(<AuthShell title="Welcome" subtitle="Sign in"><p>child</p></AuthShell>);
    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });
  it("renders field states", () => {
    const { rerender } = render(<Field id="a" label="A" required hint="Hint"><input /></Field>);
    expect(screen.getByText("Hint")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
    rerender(<Field id="a" label="A" optional error={{ type: "x", message: "Bad" }}><input /></Field>);
    expect(screen.getByRole("alert")).toHaveTextContent("Bad");
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    rerender(<Field id="a" label="A" error="Also bad"><input /></Field>);
    expect(screen.getByRole("alert")).toHaveTextContent("Also bad");
    rerender(<Field id="a" label="A"><input /></Field>);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fieldA11y("x")).toEqual({ id: "x", "aria-invalid": undefined, "aria-describedby": undefined });
    expect(fieldA11y("x", "e")).toMatchObject({ "aria-invalid": true, "aria-describedby": "x-error" });
    expect(fieldA11y("x", undefined, true)["aria-describedby"]).toBe("x-hint");
    const { container } = render(<FormAlert message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LoginForm", () => {
  it("validates, shows API errors, and signs in", async () => {
    const u = userEvent.setup();
    nav.search = "next=/dashboard/favorites";
    const fetch = mockApi({ "POST /api/auth/login": json({ error: { message: "Incorrect email or password" } }, 401) });
    render(<LoginForm />);
    await u.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText("Enter your email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    await u.type(screen.getByLabelText("Email"), " a@b.co ");
    await u.type(screen.getByLabelText("Password"), "secret1");
    await u.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    await u.click(screen.getByRole("button", { name: "Hide password" }));
    await u.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText("Incorrect email or password")).toBeInTheDocument();
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ email: "a@b.co", password: "secret1" });

    mockApi({ "POST /api/auth/login": new Response("x", { status: 500 }) });
    await u.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText("Could not log in")).toBeInTheDocument();

    mockApi({ "POST /api/auth/login": { user: { emailVerifiedAt: "2026" } } });
    await u.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith("/dashboard/favorites"));
    expect(nav.router.refresh).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register?next=%2Fdashboard%2Ffavorites");
    expect(screen.queryByText(/password123/)).toBeNull(); // no demo accounts in any environment
  });
  it("sends unconfirmed accounts to the code screen", async () => {
    const u = userEvent.setup();
    mockApi({ "POST /api/auth/login": { user: { emailVerifiedAt: null } } });
    render(<LoginForm />);
    await u.type(screen.getByLabelText("Email"), "a@b.co");
    await u.type(screen.getByLabelText("Password"), "x");
    await u.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith("/verify-email?next=%2Fdashboard"));
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });
});

describe("RegisterForm", () => {
  it("validates and creates the account", async () => {
    const u = userEvent.setup();
    nav.search = "next=/claim";
    const fetch = mockApi({ "POST /api/auth/register": json({ error: { message: "An account with this email already exists" } }, 409) });
    render(<RegisterForm />);
    await u.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Accept the terms to continue")).toBeInTheDocument();
    await u.type(screen.getByLabelText("Full name"), "Asha Rao");
    await u.type(screen.getByLabelText("Email"), "asha@example.com");
    await u.type(screen.getByLabelText(/Phone/), "98765 43210");
    await u.type(screen.getByLabelText("Password"), "secret123");
    await u.click(screen.getByRole("button", { name: "Show password" }));
    await u.click(screen.getByRole("button", { name: "Hide password" }));
    await u.click(screen.getByRole("checkbox"));
    await u.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("An account with this email already exists")).toBeInTheDocument();
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toMatchObject({ name: "Asha Rao", phone: "+919876543210", acceptTerms: true });

    mockApi({ "POST /api/auth/register": new Response("x", { status: 500 }) });
    await u.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Could not create your account")).toBeInTheDocument();

    await u.clear(screen.getByLabelText(/Phone/));
    const ok = mockApi({ "POST /api/auth/register": { user: {} } });
    await u.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(nav.router.push).toHaveBeenCalledWith("/verify-email?sent=1&next=%2Fclaim"));
    expect(JSON.parse(String(ok.mock.calls[0]![1]!.body)).phone).toBeUndefined();
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login?next=%2Fclaim");
  });
  it("links to login without next by default", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});

describe("password reset", () => {
  it("sends the reset link", async () => {
    const u = userEvent.setup();
    mockApi({ "POST /auth/forgot-password": json({ error: { message: "Slow down" } }, 429) });
    render(<ForgotPasswordForm />);
    await u.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText("Enter your email address")).toBeInTheDocument();
    await u.type(screen.getByLabelText("Email"), "a@b.co");
    await u.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText("Slow down")).toBeInTheDocument();
    mockApi({ "POST /auth/forgot-password": () => Promise.reject(new TypeError("offline")) as never });
    await u.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText("Could not send the email. Try again.")).toBeInTheDocument();
    mockApi({ "POST /auth/forgot-password": { ok: true } });
    await u.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/If a@b.co has a DialNFind account/)).toBeInTheDocument();
  });
  it("sets a new password", async () => {
    const u = userEvent.setup();
    mockApi({ "POST /auth/reset-password": json({ error: { message: "Link expired" } }, 400) });
    render(<ResetPasswordForm token="tok" />);
    await u.type(screen.getByLabelText("New password"), "secret123");
    await u.type(screen.getByLabelText("Confirm new password"), "different1");
    await u.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText("The passwords do not match")).toBeInTheDocument();
    await u.clear(screen.getByLabelText("Confirm new password"));
    await u.type(screen.getByLabelText("Confirm new password"), "secret123");
    await u.click(screen.getByRole("button", { name: "Show password" }));
    await u.click(screen.getByRole("button", { name: "Hide password" }));
    await u.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText("Link expired")).toBeInTheDocument();
    mockApi({ "POST /auth/reset-password": () => Promise.reject(new TypeError("offline")) as never });
    await u.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText("Could not change the password. Try again.")).toBeInTheDocument();
    mockApi({ "POST /auth/reset-password": { ok: true } });
    await u.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText("Password changed")).toBeInTheDocument();
  });
});

describe("email confirmation", () => {
  it("confirms by link once", async () => {
    const fetch = mockApi({ "POST /auth/verify-email": { ok: true } });
    const { rerender } = render(<VerifyEmail token="t" />);
    expect(screen.getByText(/Confirming your email/)).toBeInTheDocument();
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    rerender(<VerifyEmail token="t2" />);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("shows why a link failed", async () => {
    mockApi({ "POST /auth/verify-email": json({ error: { message: "Link expired" } }, 400) });
    render(<VerifyEmail token="t" />);
    expect(await screen.findByText("Link expired")).toBeInTheDocument();
  });
  it("shows a generic message for a network failure", async () => {
    mockApi({ "POST /auth/verify-email": () => Promise.reject(new TypeError("offline")) as never });
    render(<VerifyEmail token="t" />);
    expect(await screen.findByText("Could not confirm your email. Try again.")).toBeInTheDocument();
  });

  it("checks the typed code and continues", async () => {
    const u = userEvent.setup();
    mockApi({ "POST /auth/verify-email/code": json({ error: { message: "That code is not right" } }, 400) });
    render(<VerifyEmailCode email="a@b.co" next="/dashboard" justSent={false} />);
    expect(screen.getByRole("button", { name: "Email me a code" })).toBeEnabled();
    const input = screen.getByPlaceholderText("000000");
    await u.type(input, "12ab34");
    expect(input).toHaveValue("1234");
    await u.click(screen.getByRole("button", { name: /confirm email/i }));
    await u.type(input, "56");
    expect(await screen.findByText("That code is not right")).toBeInTheDocument();
    mockApi({ "POST /auth/verify-email/code": () => Promise.reject(new TypeError("offline")) as never });
    await u.click(screen.getByRole("button", { name: /confirm email/i }));
    expect(await screen.findByText("Could not check the code. Try again.")).toBeInTheDocument();
    mockApi({ "POST /auth/verify-email/code": { user: {} } });
    await u.click(screen.getByRole("button", { name: /confirm email/i }));
    await waitFor(() => expect(nav.router.replace).toHaveBeenCalledWith("/dashboard"));
  });
  it("ignores a second submit while checking", async () => {
    const u = userEvent.setup();
    let resolve!: (r: Response) => void;
    const fetch = mockApi({ "POST /auth/verify-email/code": () => new Promise<Response>((r) => (resolve = r)) });
    render(<VerifyEmailCode email="a@b.co" next="/d" justSent={false} />);
    await u.type(screen.getByPlaceholderText("000000"), "123456");
    const form = screen.getByPlaceholderText("000000").closest("form")!;
    form.requestSubmit();
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve(json({}));
    await waitFor(() => expect(nav.router.replace).toHaveBeenCalled());
  });
  it("resends codes with a countdown and signs out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<VerifyEmailCode email="a@b.co" next="/d" justSent />);
    expect(screen.getByRole("button", { name: "Send a new code in 60s" })).toBeDisabled();
    const tick = async (seconds: number) => {
      for (let i = 0; i < seconds; i++) await act(async () => void vi.advanceTimersByTime(1000));
    };
    await tick(60);
    expect(await screen.findByRole("button", { name: "Send a new code" })).toBeEnabled();

    mockApi({ "POST /auth/resend-verification": { ok: true, retryAfter: 2 } });
    await u.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(await screen.findByRole("button", { name: /^Send a new code in \ds$/ })).toBeDisabled();
    await tick(2);

    mockApi({ "POST /auth/resend-verification": json({ error: { message: "Wait", details: { retryAfter: 5 } } }, 429) });
    await u.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(await screen.findByRole("button", { name: /^Send a new code in \ds$/ })).toBeInTheDocument();
    await tick(5);

    mockApi({ "POST /auth/resend-verification": json({ error: { message: "Already confirmed" } }, 400) });
    await u.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("Already confirmed")).toBeInTheDocument();
    mockApi({ "POST /auth/resend-verification": () => Promise.reject(new TypeError("offline")) as never });
    await u.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(await screen.findByText("Could not send the email. Try again.")).toBeInTheDocument();

    mockApi({ "POST /api/auth/logout": { ok: true } });
    await u.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(nav.router.replace).toHaveBeenCalledWith("/login"));
  });
});
