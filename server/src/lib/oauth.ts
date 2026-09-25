import { createHash } from "node:crypto";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { env } from "../env.js";
import { notConfigured, unauthorized } from "./errors.js";

/**
 * Checks Google and Apple ID tokens against the providers' published keys, and talks to Apple's token
 * endpoints (exchange a sign-in code for a refresh token, revoke it when an account is deleted).
 */

export type OAuthProviderName = "google" | "apple";

export interface VerifiedIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  /** The client the token was issued to (for Apple: bundle ID or Services ID). */
  audience: string;
}

// jose caches the key sets and refetches them when a token names a key it has not seen.
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const APPLE_ISSUER = "https://appleid.apple.com";

export const googleEnabled = () => env.oauth.googleClientIds.length > 0;
export const appleEnabled = () => env.oauth.appleClientIds.length > 0;
/** Revoking Apple access needs the Sign in with Apple key, which is optional for signing in. */
const appleKeyConfigured = () => Boolean(env.oauth.appleTeamId && env.oauth.appleKeyId && env.oauth.applePrivateKey);

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

/** Clients send Google/Apple the SHA-256 of a random nonce and send us the raw value, so a stolen token cannot be replayed. */
function checkNonce(payload: JWTPayload, rawNonce: string | undefined) {
  if (rawNonce === undefined) return;
  if (typeof payload.nonce !== "string" || payload.nonce !== sha256Hex(rawNonce)) throw new Error("nonce mismatch");
}

const asBool = (v: unknown) => v === true || v === "true";
const audienceOf = (payload: JWTPayload) => (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) ?? "";

export async function verifyGoogleIdToken(idToken: string, rawNonce?: string): Promise<VerifiedIdentity> {
  if (!googleEnabled()) throw notConfigured("Sign in with Google is not available yet");
  try {
    const { payload } = await jwtVerify(idToken, googleKeys, {
      issuer: ["accounts.google.com", "https://accounts.google.com"],
      audience: env.oauth.googleClientIds,
    });
    checkNonce(payload, rawNonce);
    if (!payload.sub) throw new Error("missing sub");
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
      emailVerified: asBool(payload.email_verified),
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
      audience: audienceOf(payload),
    };
  } catch (err) {
    console.warn("[oauth] Google token rejected:", (err as Error).message);
    throw unauthorized("We could not verify your Google sign-in. Please try again.");
  }
}

export async function verifyAppleIdToken(idToken: string, rawNonce?: string): Promise<VerifiedIdentity> {
  if (!appleEnabled()) throw notConfigured("Sign in with Apple is not available yet");
  try {
    const { payload } = await jwtVerify(idToken, appleKeys, { issuer: APPLE_ISSUER, audience: env.oauth.appleClientIds });
    checkNonce(payload, rawNonce);
    if (!payload.sub) throw new Error("missing sub");
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
      // Apple only hands out addresses it has verified (including private relay addresses).
      emailVerified: typeof payload.email === "string" && (payload.email_verified === undefined || asBool(payload.email_verified)),
      name: null, // Apple never puts the name in the token; the app sends it on the first sign-in.
      picture: null,
      audience: audienceOf(payload),
    };
  } catch (err) {
    console.warn("[oauth] Apple token rejected:", (err as Error).message);
    throw unauthorized("We could not verify your Apple sign-in. Please try again.");
  }
}

export interface AppleServerEvent {
  type: "email-disabled" | "email-enabled" | "consent-revoked" | "account-delete" | string;
  sub: string;
  email?: string;
}

/** Apple's server-to-server notifications arrive as a JWT signed with the same keys as ID tokens. */
export async function verifyAppleNotification(signedPayload: string): Promise<AppleServerEvent> {
  const { payload } = await jwtVerify(signedPayload, appleKeys, { issuer: APPLE_ISSUER, audience: env.oauth.appleClientIds });
  const events = typeof payload.events === "string" ? JSON.parse(payload.events) : payload.events;
  if (!events || typeof events.type !== "string" || typeof events.sub !== "string") throw new Error("malformed events");
  return events as AppleServerEvent;
}

// Apple token endpoints ---------------------------------------------------------------------------

let cachedSecret: { clientId: string; value: string; expiresAt: number } | null = null;

/** Apple's "client secret" is a short-lived JWT signed with the Sign in with Apple key. */
async function appleClientSecret(clientId: string): Promise<string> {
  const now = Date.now();
  if (cachedSecret && cachedSecret.clientId === clientId && cachedSecret.expiresAt > now + 60_000) return cachedSecret.value;
  const key = await importPKCS8(env.oauth.applePrivateKey, "ES256");
  const lifetimeSeconds = 10 * 60;
  const value = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.oauth.appleKeyId })
    .setIssuer(env.oauth.appleTeamId)
    .setIssuedAt()
    .setExpirationTime(`${lifetimeSeconds}s`)
    .setAudience(APPLE_ISSUER)
    .setSubject(clientId)
    .sign(key);
  cachedSecret = { clientId, value, expiresAt: now + lifetimeSeconds * 1000 };
  return value;
}

async function applePost(path: string, form: Record<string, string>): Promise<Response> {
  return fetch(`${APPLE_ISSUER}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(10_000),
  });
}

/**
 * Trades the one-time authorization code from a sign-in for a refresh token, which we keep only so we
 * can revoke it later. Returns null when the key is not configured or Apple refuses; sign-in still works.
 */
export async function exchangeAppleCode(code: string, clientId: string, redirectUri?: string): Promise<string | null> {
  if (!appleKeyConfigured()) return null;
  try {
    const form: Record<string, string> = {
      client_id: clientId,
      client_secret: await appleClientSecret(clientId),
      code,
      grant_type: "authorization_code",
    };
    if (redirectUri) form.redirect_uri = redirectUri;
    const res = await applePost("/auth/token", form);
    const body = (await res.json().catch(() => null)) as { refresh_token?: string; error?: string } | null;
    if (!res.ok || !body?.refresh_token) {
      console.warn("[oauth] Apple code exchange failed:", res.status, body?.error);
      return null;
    }
    return body.refresh_token;
  } catch (err) {
    console.warn("[oauth] Apple code exchange failed:", (err as Error).message);
    return null;
  }
}

/** Tells Apple the person no longer uses Sign in with Apple with us. Never throws. */
export async function revokeAppleToken(refreshToken: string, clientId: string): Promise<boolean> {
  if (!appleKeyConfigured()) return false;
  try {
    const res = await applePost("/auth/revoke", {
      client_id: clientId,
      client_secret: await appleClientSecret(clientId),
      token: refreshToken,
      token_type_hint: "refresh_token",
    });
    if (!res.ok) console.warn("[oauth] Apple revoke failed:", res.status);
    return res.ok;
  } catch (err) {
    console.warn("[oauth] Apple revoke failed:", (err as Error).message);
    return false;
  }
}
