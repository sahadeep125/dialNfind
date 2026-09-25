// Sign in with Google and Apple. Each flow returns an ID token that the API verifies; null means the
// person cancelled. Apple on Android runs Apple's web flow in a browser tab, and the API hands the
// result back through this app's URL scheme.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  API_URL,
  APPLE_SERVICES_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "@/constants/config";

export type SocialProvider = "google" | "apple";

export interface GooglePayload {
  idToken: string;
}

export interface ApplePayload {
  idToken: string;
  nonce: string;
  authorizationCode?: string;
  redirectUri?: string;
  name?: { givenName?: string | null; familyName?: string | null };
}

const APP_SCHEME = String(Constants.expoConfig?.scheme ?? "dialnfind");
/** The deep link the API's Apple callback redirects to; +native-intent keeps the router off it. */
export const APPLE_RETURN_URL = `${APP_SCHEME}://auth/apple`;

/** Google needs its iOS client on iOS; Android only needs the web client (the token's audience). */
export const googleAvailable =
  Platform.OS !== "web" &&
  Boolean(GOOGLE_WEB_CLIENT_ID) &&
  (Platform.OS !== "ios" || Boolean(GOOGLE_IOS_CLIENT_ID));

/** Native on iOS; on Android it needs the Services ID for Apple's web flow. */
export const appleAvailable =
  Platform.OS === "ios" || (Platform.OS === "android" && Boolean(APPLE_SERVICES_ID));

export class SocialSignInError extends Error {}

let googleConfigured = false;
function configureGoogle(): void {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
  googleConfigured = true;
}

export async function googleSignIn(): Promise<GooglePayload | null> {
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new SocialSignInError("Google did not return your account details. Please try again.");
    }
    return { idToken: response.data.idToken };
  } catch (error) {
    if (error instanceof SocialSignInError) throw error;
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new SocialSignInError("Google Play services are needed to sign in with Google.");
      }
    }
    throw new SocialSignInError("Could not sign in with Google. Please try again.");
  }
}

async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, "");
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}

export async function appleSignIn(): Promise<ApplePayload | null> {
  return Platform.OS === "ios" ? appleSignInNative() : appleSignInWeb();
}

async function appleSignInNative(): Promise<ApplePayload | null> {
  const nonce = await createNonce();
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: nonce.hashed,
    });
    if (!credential.identityToken) throw new SocialSignInError("Apple did not return your account details.");
    return {
      idToken: credential.identityToken,
      nonce: nonce.raw,
      authorizationCode: credential.authorizationCode ?? undefined,
      name: credential.fullName
        ? { givenName: credential.fullName.givenName, familyName: credential.fullName.familyName }
        : undefined,
    };
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    if (error instanceof SocialSignInError) throw error;
    throw new SocialSignInError("Could not sign in with Apple. Please try again.");
  }
}

async function appleSignInWeb(): Promise<ApplePayload | null> {
  const nonce = await createNonce();
  const state = `${APP_SCHEME}.${Crypto.randomUUID()}`;
  const redirectUri = `${API_URL}/auth/apple/callback`;
  const query = toQuery({
    client_id: APPLE_SERVICES_ID,
    redirect_uri: redirectUri,
    response_type: "code id_token",
    response_mode: "form_post",
    scope: "name email",
    state,
    nonce: nonce.hashed,
  });
  const result = await WebBrowser.openAuthSessionAsync(
    `https://appleid.apple.com/auth/authorize?${query}`,
    APPLE_RETURN_URL,
  );
  if (result.type !== "success") return null;

  const params = Linking.parse(result.url).queryParams ?? {};
  const get = (key: string): string | null => (typeof params[key] === "string" ? params[key] : null);
  if (get("state") !== state) throw new SocialSignInError("Sign-in response did not match. Please try again.");
  const error = get("error");
  if (error === "user_cancelled_authorize") return null;
  const idToken = get("id_token");
  if (error || !idToken) throw new SocialSignInError("Could not sign in with Apple. Please try again.");

  // Apple sends the name as JSON, and only the first time someone signs in.
  let name: ApplePayload["name"];
  try {
    const user = JSON.parse(get("user") ?? "null") as { name?: { firstName?: string; lastName?: string } } | null;
    if (user?.name) name = { givenName: user.name.firstName ?? null, familyName: user.name.lastName ?? null };
  } catch {
    name = undefined;
  }
  return { idToken, nonce: nonce.raw, authorizationCode: get("code") ?? undefined, redirectUri, name };
}

const toQuery = (values: Record<string, string>): string =>
  Object.entries(values)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

/** Clears Google's remembered account so the account picker shows next time. */
export async function socialSignOut(): Promise<void> {
  if (!googleAvailable) return;
  configureGoogle();
  await GoogleSignin.signOut().catch(() => undefined);
}
