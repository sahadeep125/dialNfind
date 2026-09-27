import { exportJWK, exportPKCS8, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { vi } from "vitest";
import { sha256Hex } from "../../src/lib/oauth.js";

/** One RSA key standing in for both Google's and Apple's published keys. */
const keys = await generateKeyPair("RS256", { extractable: true });
const jwk = { ...(await exportJWK(keys.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };

/** An EC key for Apple's client secret (Sign in with Apple key). */
const appleKey = await generateKeyPair("ES256", { extractable: true });
export const applePrivateKeyPem = await exportPKCS8(appleKey.privateKey);

export const nonce = "raw-nonce";
export const hashedNonce = sha256Hex(nonce);

export function idToken(claims: JWTPayload & { iss: string; aud: string | string[] }, expiresIn = "10m") {
  return new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "test-key" }).setIssuedAt().setExpirationTime(expiresIn).sign(keys.privateKey);
}

export const googleToken = (claims: JWTPayload = {}) => idToken({ iss: "https://accounts.google.com", aud: "google-web", sub: "g-1", email: "Person@Example.com", email_verified: true, name: "Asha Rao", picture: "https://pic", ...claims } as never);
export const appleToken = (claims: JWTPayload = {}) => idToken({ iss: "https://appleid.apple.com", aud: "com.dialnfind.app", sub: "a-1", email: "relay@privaterelay.appleid.com", ...claims } as never);

/**
 * Stubs fetch: key set requests get the test JWKS, Apple token endpoints get `apple` (or 200 {}), and
 * everything else goes to `other`.
 */
export function stubIdentityFetch(apple: (url: string, body: URLSearchParams) => Response = () => Response.json({}), other?: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("/oauth2/v3/certs") || url.endsWith("/auth/keys")) return Response.json({ keys: [jwk] });
    if (url.startsWith("https://appleid.apple.com/auth/")) return apple(url, init!.body as URLSearchParams);
    if (other) return other(url, init);
    throw new Error(`Unmocked fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
