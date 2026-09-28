import { describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { appleSignIn, createNonce, googleSignedOut, loadScript, renderGoogleButton, SocialCancelled } from "@/lib/social-auth";
import { json, lastBody, mockApi, renderApp, signedIn, user } from "./helpers";

// Both providers switched on, so the buttons render.
vi.mock("@/lib/config", async (orig) => ({
  ...(await orig<typeof import("@/lib/config")>()),
  GOOGLE_CLIENT_ID: "gid",
  APPLE_SERVICES_ID: "sid",
  APPLE_REDIRECT_URI: "https://app.test/cb",
}));

const where = () => screen.getByTestId("where").textContent;

/** jsdom never fetches scripts; report every injected one as loaded. */
async function loadScripts() {
  await waitFor(() => expect(document.head.querySelector("script")).not.toBeNull());
  document.head.querySelectorAll("script").forEach((s) => s.onload?.(new Event("load")));
}

type GoogleConfig = { callback: (r: { credential?: string }) => void; nonce: string };
function stubGoogle() {
  const google = { initialize: vi.fn<(c: GoogleConfig) => void>(), renderButton: vi.fn(), disableAutoSelect: vi.fn() };
  vi.stubGlobal("google", { accounts: { id: google } });
  return google;
}

function stubApple(signIn: () => Promise<unknown>) {
  const auth = { init: vi.fn(), signIn: vi.fn(signIn) };
  vi.stubGlobal("AppleID", { auth });
  return auth;
}

describe("social-auth library", () => {
  it("loads a script once, and retries after a load error", async () => {
    const first = loadScript("https://x.test/a.js");
    expect(loadScript("https://x.test/a.js")).toBe(first);
    const el = document.head.querySelector<HTMLScriptElement>('script[src="https://x.test/a.js"]')!;
    el.onerror!(new Event("error"));
    await expect(first).rejects.toThrow("Could not load the sign-in service");
    const second = loadScript("https://x.test/a.js");
    expect(second).not.toBe(first);
    document.head.querySelectorAll<HTMLScriptElement>('script[src="https://x.test/a.js"]')[1]!.onload!(new Event("load"));
    await expect(second).resolves.toBeUndefined();
  });

  it("makes a raw nonce and its SHA-256", async () => {
    const { raw, hashed } = await createNonce();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).not.toBe(raw);
  });

  it("renders Google's button and passes the credential on", async () => {
    const el = document.createElement("div");
    el.innerHTML = "<span>old</span>";
    const onToken = vi.fn();
    const pending = renderGoogleButton(el, "gid", onToken, "signup_with");
    // Without the Google global the script loaded but is unusable.
    await loadScripts();
    await expect(pending).rejects.toThrow("Google sign-in is unavailable right now.");

    const google = stubGoogle();
    await renderGoogleButton(el, "gid", onToken, "continue_with");
    expect(el.childElementCount).toBe(0);
    expect(google.renderButton).toHaveBeenCalledWith(el, expect.objectContaining({ text: "continue_with", width: 200 }));
    const config = google.initialize.mock.calls[0]![0];
    config.callback({});
    expect(onToken).not.toHaveBeenCalled();
    config.callback({ credential: "id-token" });
    expect(onToken).toHaveBeenCalledWith({ idToken: "id-token", nonce: expect.stringMatching(/^[0-9a-f]{64}$/) });

    googleSignedOut();
    expect(google.disableAutoSelect).toHaveBeenCalled();
    vi.unstubAllGlobals();
    expect(() => googleSignedOut()).not.toThrow();
  });

  it("signs in with Apple and checks the state", async () => {
    const pending = appleSignIn("sid", "https://app.test/cb");
    await loadScripts();
    await expect(pending).rejects.toThrow("Apple sign-in is unavailable right now.");

    let answer: unknown;
    const auth = stubApple(async () => answer);
    const stateOf = () => auth.init.mock.calls.at(-1)![0].state as string;

    auth.signIn.mockImplementationOnce(async () => ({ authorization: { id_token: "t", code: "c", state: stateOf() }, user: { name: { firstName: "Ravi", lastName: "Kumar" } } }));
    await expect(appleSignIn("sid", "https://app.test/cb")).resolves.toMatchObject({ idToken: "t", authorizationCode: "c", redirectUri: "https://app.test/cb", name: { givenName: "Ravi", familyName: "Kumar" } });

    answer = { authorization: { id_token: "t", code: "c" }, user: { name: {} } };
    await expect(appleSignIn("sid", "https://app.test/cb")).resolves.toMatchObject({ name: { givenName: null, familyName: null } });

    answer = { authorization: { id_token: "t", code: "c" }, user: { email: "a@b.co" } };
    expect((await appleSignIn("sid", "https://app.test/cb")).name).toBeUndefined();

    answer = { authorization: { id_token: "t", code: "c", state: "other" } };
    await expect(appleSignIn("sid", "https://app.test/cb")).rejects.toThrow("Sign-in response did not match");

    auth.signIn.mockImplementationOnce(() => Promise.reject({ error: "popup_closed_by_user" }));
    await expect(appleSignIn("sid", "https://app.test/cb")).rejects.toBeInstanceOf(SocialCancelled);
    auth.signIn.mockImplementationOnce(() => Promise.reject({ error: "user_cancelled_authorize" }));
    await expect(appleSignIn("sid", "https://app.test/cb")).rejects.toBeInstanceOf(SocialCancelled);
    auth.signIn.mockImplementationOnce(() => Promise.reject({ error: "invalid_client" }));
    await expect(appleSignIn("sid", "https://app.test/cb")).rejects.toThrow("Apple sign-in did not complete. Please try again.");
    auth.signIn.mockImplementationOnce(() => Promise.reject(null));
    await expect(appleSignIn("sid", "https://app.test/cb")).rejects.toThrow("Apple sign-in did not complete. Please try again.");
  });
});

describe("social buttons", () => {
  const signedInAfter = (isNewUser: boolean, provider: "google" | "apple"): Record<string, unknown> => {
    const routes = signedIn();
    localStorage.clear();
    return {
      ...routes,
      "/provider/dashboard": json({ error: { message: "x" } }, 500),
      "/provider/profile": json({ error: { message: "x" } }, 500),
      "/me/notifications": { notifications: [], unread: 0 },
      [`POST /auth/${provider}`]: () => {
        localStorage.setItem("dnf_provider_token", "tok");
        return json({ token: "tok", isNewUser, user: user() });
      },
    };
  };

  it("signs in with Google on the login page and goes to next", async () => {
    const google = stubGoogle();
    const fetch = mockApi(signedInAfter(false, "google"));
    await renderApp("/login?next=%2Fleads");
    await loadScripts();
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled());
    expect(google.renderButton.mock.calls[0]![1]).toMatchObject({ text: "continue_with" });
    expect(screen.getByRole("button", { name: /Continue with Apple/ })).toBeInTheDocument();
    await act(async () => google.initialize.mock.calls.at(-1)![0].callback({ credential: "gtok" }));
    await waitFor(() => expect(["/leads", "/"]).toContain(where())); // "/" when PublicOnly redirects first (see finding)
    expect(lastBody(fetch, "/auth/google")).toMatchObject({ idToken: "gtok", role: "provider" });
  });

  it("sends new Google users to setup from the register page, with a busy overlay meanwhile", async () => {
    const google = stubGoogle();
    let release!: () => void;
    const routes = signedInAfter(true, "google");
    const finish = routes["POST /auth/google"] as () => Response;
    mockApi({ ...routes, "POST /auth/google": () => new Promise<Response>((r) => (release = () => r(finish()))) });
    await renderApp("/register");
    await loadScripts();
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled());
    expect(google.renderButton.mock.calls.at(-1)![1]).toMatchObject({ text: "signup_with" });
    expect(screen.getByRole("button", { name: /Sign up with Apple/ })).toBeInTheDocument();
    act(() => google.initialize.mock.calls.at(-1)![0].callback({ credential: "gtok" }));
    expect(await screen.findByLabelText("Signing in with Google")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign up with Apple/ })).toBeDisabled();
    await act(async () => release());
    await waitFor(() => expect(["/start", "/"]).toContain(where())); // "/" when PublicOnly redirects first (see finding)
  });

  it("sends returning Google users from the register page to next", async () => {
    const google = stubGoogle();
    mockApi(signedInAfter(false, "google"));
    await renderApp("/register?next=%2Freviews");
    await loadScripts();
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    await act(async () => google.initialize.mock.calls.at(-1)![0].callback({ credential: "gtok" }));
    await waitFor(() => expect(["/reviews", "/"]).toContain(where())); // "/" when PublicOnly redirects first (see finding)
  });

  it("shows why Google could not load", async () => {
    const google = stubGoogle();
    google.initialize.mockImplementationOnce(() => {
      throw new Error("Blocked by the browser");
    });
    mockApi({});
    await renderApp("/login");
    await loadScripts();
    expect(await screen.findByText("Blocked by the browser")).toBeInTheDocument();
  });

  it("shows a fallback when Google fails with something that is not an Error", async () => {
    const google = stubGoogle();
    google.initialize.mockImplementationOnce(() => {
      throw "nope";
    });
    mockApi({});
    await renderApp("/login");
    await loadScripts();
    expect(await screen.findByText("Google sign-in is unavailable right now.")).toBeInTheDocument();
  });

  it("signs in with Apple, and new users go to setup", async () => {
    stubGoogle();
    const auth = stubApple(async () => ({ authorization: { id_token: "atok", code: "c" } }));
    let release!: () => void;
    const routes = signedInAfter(true, "apple");
    const finish = routes["POST /auth/apple"] as () => Response;
    const fetch = mockApi({ ...routes, "POST /auth/apple": () => new Promise<Response>((r) => (release = () => r(finish()))) });
    await renderApp("/login");
    await loadScripts();
    await userEvent.click(screen.getByRole("button", { name: /Continue with Apple/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Continue with Apple/ })).toBeDisabled());
    await act(async () => release());
    await waitFor(() => expect(["/start", "/"]).toContain(where())); // "/" when PublicOnly redirects first (see finding)
    expect(auth.init).toHaveBeenCalledWith(expect.objectContaining({ clientId: "sid", redirectURI: "https://app.test/cb", usePopup: true }));
    expect(lastBody(fetch, "/auth/apple")).toMatchObject({ idToken: "atok", authorizationCode: "c", role: "provider" });
  });

  it("stays quiet when Apple is cancelled, and shows other Apple and API errors", async () => {
    stubGoogle();
    const auth = stubApple(async () => ({ authorization: { id_token: "atok", code: "c" } }));
    mockApi({ "POST /auth/apple": json({ error: { message: "Account is suspended" } }, 403) });
    await renderApp("/login");
    await loadScripts();
    const apple = screen.getByRole("button", { name: /Continue with Apple/ });

    await userEvent.click(apple);
    expect(await screen.findByText("Account is suspended")).toBeInTheDocument();
    await waitFor(() => expect(apple).toBeEnabled());

    auth.signIn.mockImplementationOnce(() => Promise.reject({ error: "popup_closed_by_user" }));
    await userEvent.click(apple);
    await waitFor(() => expect(screen.queryByText("Account is suspended")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    auth.signIn.mockImplementationOnce(() => Promise.reject(new Error("Popup blocked")));
    await userEvent.click(apple);
    expect(await screen.findByText("Popup blocked")).toBeInTheDocument();

    auth.init.mockImplementationOnce(() => {
      throw "odd";
    });
    await userEvent.click(apple);
    expect(await screen.findByText("Apple sign-in did not complete.")).toBeInTheDocument();
  });
});
