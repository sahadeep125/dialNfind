// Runtime configuration read from EXPO_PUBLIC_* variables (see .env.example).

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export const WEB_URL: string = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000";

// Sign in with Google / Apple (see docs/social-login.md). A button only shows when its IDs are set.
/** Google "Web application" client ID: the audience of the ID tokens the API accepts. */
export const GOOGLE_WEB_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
/** Google "iOS" client ID for this app's bundle ID. Also sets the iOS URL scheme (app.config.ts). */
export const GOOGLE_IOS_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
/** Apple Services ID, used for Sign in with Apple on Android (Apple's web flow). */
export const APPLE_SERVICES_ID: string = process.env.EXPO_PUBLIC_APPLE_SERVICES_ID ?? "";

// In-app subscriptions through RevenueCat (docs/billing.md). Public SDK keys: appl_... for iOS, goog_... for
// Android. Leave empty to hide store purchases; plans bought on the web still apply.
export const REVENUECAT_IOS_KEY: string = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
export const REVENUECAT_ANDROID_KEY: string = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
/** Where plans bought on the web are managed. */
export const PROVIDER_WEB_URL: string = process.env.EXPO_PUBLIC_PROVIDER_URL ?? "http://localhost:5173";
