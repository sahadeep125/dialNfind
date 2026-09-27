// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { json, mockApi } from "../helpers";

type Social = typeof import("@/lib/social-auth");

/**
 * SocialButtons decides at import time which providers are configured, so each case loads it (and the
 * testing library, to share one React) fresh with its own environment.
 */
async function load(env: { google?: string; apple?: string; redirect?: string }, social: Partial<Social> = {}) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", env.google ?? "");
  vi.stubEnv("NEXT_PUBLIC_APPLE_SERVICES_ID", env.apple ?? "");
  vi.stubEnv("NEXT_PUBLIC_APPLE_REDIRECT_URI", env.redirect ?? "");
  vi.doMock("@/lib/social-auth", async (orig) => ({ ...(await orig<Social>()), ...social }));
  const rtl = await import("@testing-library/react");
  const { default: userEvent } = await import("@testing-library/user-event");
  const mod = await import("@/components/auth/social-buttons");
  const props = { onError: vi.fn(), onSignedIn: vi.fn() };
  return { ...rtl, u: userEvent.setup(), mod, props };
}

describe("SocialButtons", () => {
  it("renders nothing when no provider is configured", async () => {
    const { render, mod, props } = await load({});
    expect(mod.socialSignInAvailable).toBe(false);
    const { container } = render(<mod.SocialButtons mode="signin" {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("signs in with Apple, and reports failures", async () => {
    const appleSignIn = vi.fn();
    const { render, screen, waitFor, u, mod, props } = await load({ apple: "sid", redirect: "https://x/cb" }, { appleSignIn });
    const { unmount } = render(<mod.SocialButtons mode="signup" {...props} />);
    const button = screen.getByRole("button", { name: "Sign up with Apple" });

    appleSignIn.mockResolvedValueOnce({ idToken: "t", nonce: "n" });
    mockApi({ "POST /api/auth/social": json({ error: { message: "Staff accounts sign in with email" } }, 403) });
    await u.click(button);
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith("Staff accounts sign in with email"));

    appleSignIn.mockResolvedValueOnce({ idToken: "t", nonce: "n" });
    mockApi({ "POST /api/auth/social": new Response("x", { status: 500 }) });
    await u.click(button);
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith("Could not sign you in. Please try again."));

    appleSignIn.mockResolvedValueOnce({ idToken: "t", nonce: "n" });
    mockApi({ "POST /api/auth/social": () => Promise.reject("not an error") as never });
    await u.click(button);
    await waitFor(() => expect(props.onError).toHaveBeenCalledTimes(9));
    expect(props.onError).toHaveBeenLastCalledWith("Could not sign you in. Please try again.");

    // Success leaves the button busy: the page moves on.
    appleSignIn.mockResolvedValueOnce({ idToken: "t", nonce: "n" });
    const fetch = mockApi({ "POST /api/auth/social": { isNewUser: true } });
    await u.click(button);
    await waitFor(() => expect(props.onSignedIn).toHaveBeenCalledWith({ isNewUser: true }));
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ provider: "apple", idToken: "t", nonce: "n" });
    expect(button).toBeDisabled();
    unmount();

    render(<mod.SocialButtons mode="signup" {...props} />);
    appleSignIn.mockResolvedValueOnce({ idToken: "t", nonce: "n" });
    mockApi({ "POST /api/auth/social": { isNewUser: false } });
    await u.click(screen.getByRole("button", { name: "Sign up with Apple" }));
    await waitFor(() => expect(props.onSignedIn).toHaveBeenLastCalledWith({ isNewUser: false }));
  });

  it("stays quiet when the Apple popup is closed and explains other failures", async () => {
    const real = await import("@/lib/social-auth");
    const appleSignIn = vi.fn();
    const { render, screen, waitFor, u, mod, props } = await load({ apple: "sid", redirect: "https://x/cb" }, { appleSignIn });
    const { SocialCancelled } = await import("@/lib/social-auth");
    render(<mod.SocialButtons mode="signin" {...props} />);
    const button = screen.getByRole("button", { name: "Continue with Apple" });
    appleSignIn.mockRejectedValueOnce(new SocialCancelled());
    await u.click(button);
    expect(props.onError).toHaveBeenLastCalledWith(null);
    appleSignIn.mockRejectedValueOnce(new Error("Apple is down"));
    await u.click(button);
    await waitFor(() => expect(props.onError).toHaveBeenLastCalledWith("Apple is down"));
    appleSignIn.mockRejectedValueOnce("odd");
    await u.click(button);
    await waitFor(() => expect(props.onError).toHaveBeenLastCalledWith("Apple sign-in did not complete."));
    expect(real.SocialCancelled).toBeDefined();
  });

  it("draws Google's button and signs in with its token", async () => {
    let onToken!: (p: { idToken: string; nonce: string }) => void;
    const renderGoogleButton = vi.fn(async (_el: HTMLElement, _id: string, cb: typeof onToken, text: string) => {
      onToken = cb;
      expect(text).toBe("continue_with");
    });
    const { render, screen, waitFor, act, mod, props } = await load({ google: "gid" }, { renderGoogleButton });
    render(<mod.SocialButtons mode="signin" {...props} />);
    await waitFor(() => expect(renderGoogleButton).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /apple/i })).toBeNull();
    let resolve!: (r: Response) => void;
    mockApi({ "POST /api/auth/social": () => new Promise<Response>((r) => (resolve = r)) });
    act(() => onToken({ idToken: "g", nonce: "n" }));
    expect(await screen.findByLabelText("Signing in with Google")).toBeInTheDocument();
    resolve(json({ isNewUser: false }));
    await waitFor(() => expect(props.onSignedIn).toHaveBeenCalled());
  });

  it("reports when Google cannot load", async () => {
    const renderGoogleButton = vi.fn().mockRejectedValueOnce(new Error("Blocked by an extension"));
    const { render, waitFor, mod, props } = await load({ google: "gid" }, { renderGoogleButton });
    render(<mod.SocialButtons mode="signup" {...props} />);
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith("Blocked by an extension"));
    expect(renderGoogleButton.mock.calls[0]![3]).toBe("signup_with");
  });

  it("uses a general message for odd Google failures", async () => {
    const renderGoogleButton = vi.fn().mockRejectedValueOnce("odd");
    const { render, waitFor, mod, props } = await load({ google: "gid", apple: "sid" }, { renderGoogleButton });
    render(<mod.SocialButtons mode="signin" {...props} />);
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith("Google sign-in is unavailable right now."));
  });
});
