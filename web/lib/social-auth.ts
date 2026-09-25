"use client";

/**
 * Browser side of Sign in with Google / Apple. Both give us an ID token that the API verifies.
 * A random nonce goes to Google/Apple as its SHA-256; the raw value goes to the API, which checks
 * that the token was issued for this exact attempt.
 */

export type SocialProvider = "google" | "apple";

export interface SocialPayload {
  idToken: string;
  nonce: string;
  authorizationCode?: string;
  redirectUri?: string;
  name?: { givenName?: string | null; familyName?: string | null };
}

/** Thrown when the person closes the popup; not an error worth showing. */
export class SocialCancelled extends Error {}

const scripts = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scripts.delete(src);
        reject(new Error("Could not load the sign-in service. Check your connection and try again."));
      };
      document.head.appendChild(el);
    });
    scripts.set(src, p);
  }
  return p;
}

export async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

// Google Identity Services -------------------------------------------------------------------------

interface GoogleId {
  initialize(config: { client_id: string; nonce: string; callback: (r: { credential?: string }) => void; ux_mode?: "popup"; auto_select?: boolean; itp_support?: boolean }): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
    AppleID?: {
      auth: {
        init(config: { clientId: string; scope: string; redirectURI: string; state?: string; nonce?: string; usePopup: boolean }): void;
        signIn(): Promise<{
          authorization: { id_token: string; code: string; state?: string };
          user?: { email?: string; name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

/**
 * Draws Google's own "Continue with Google" button into `el` (Google requires its button for ID tokens)
 * and calls `onToken` after the person picks an account.
 */
export async function renderGoogleButton(el: HTMLElement, clientId: string, onToken: (payload: SocialPayload) => void, text: "continue_with" | "signup_with") {
  await loadScript("https://accounts.google.com/gsi/client");
  const google = window.google?.accounts.id;
  if (!google) throw new Error("Google sign-in is unavailable right now.");
  const nonce = await createNonce();
  google.initialize({
    client_id: clientId,
    nonce: nonce.hashed,
    ux_mode: "popup",
    auto_select: false,
    itp_support: true,
    callback: ({ credential }) => {
      if (credential) onToken({ idToken: credential, nonce: nonce.raw });
    },
  });
  el.replaceChildren();
  google.renderButton(el, {
    type: "standard",
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text,
    logo_alignment: "center",
    width: Math.min(400, Math.max(200, Math.floor(el.getBoundingClientRect().width))),
  });
}

/** Stops Google from signing the person straight back in after they sign out. */
export function googleSignedOut() {
  window.google?.accounts.id.disableAutoSelect();
}

// Sign in with Apple JS ----------------------------------------------------------------------------

export async function appleSignIn(clientId: string, redirectUri: string): Promise<SocialPayload> {
  await loadScript("https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js");
  const apple = window.AppleID?.auth;
  if (!apple) throw new Error("Apple sign-in is unavailable right now.");
  const nonce = await createNonce();
  const state = crypto.randomUUID();
  apple.init({ clientId, scope: "name email", redirectURI: redirectUri, state, nonce: nonce.hashed, usePopup: true });
  try {
    const res = await apple.signIn();
    if (res.authorization.state && res.authorization.state !== state) throw new Error("Sign-in response did not match. Please try again.");
    return {
      idToken: res.authorization.id_token,
      authorizationCode: res.authorization.code,
      redirectUri,
      nonce: nonce.raw,
      name: res.user?.name ? { givenName: res.user.name.firstName ?? null, familyName: res.user.name.lastName ?? null } : undefined,
    };
  } catch (err) {
    const code = (err as { error?: string })?.error;
    if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") throw new SocialCancelled();
    if (err instanceof Error) throw err;
    throw new Error("Apple sign-in did not complete. Please try again.");
  }
}
