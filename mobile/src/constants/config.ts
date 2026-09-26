// Runtime configuration read from EXPO_PUBLIC_* variables (see .env.example).

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export const WEB_URL: string = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000";

// The localhost defaults are for development only. Release builds get these from the EAS environment
// named in eas.json; a missing one means the build cannot reach DialNFind.
if (!__DEV__ && (!process.env.EXPO_PUBLIC_API_URL || !process.env.EXPO_PUBLIC_WEB_URL)) {
  console.error("[config] EXPO_PUBLIC_API_URL or EXPO_PUBLIC_WEB_URL is not set for this build; using localhost.");
}
export const SUPPORT_EMAIL = "support@dialnfind.com";
export const SUPPORT_PHONE = "+918001234567";

// Sign in with Google / Apple (see docs/social-login.md). A button only shows when its IDs are set.
/** Google "Web application" client ID: the audience of the ID tokens the API accepts. */
export const GOOGLE_WEB_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
/** Google "iOS" client ID for this app's bundle ID. Also sets the iOS URL scheme (app.config.ts). */
export const GOOGLE_IOS_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
/** Apple Services ID, used for Sign in with Apple on Android (Apple's web flow). */
export const APPLE_SERVICES_ID: string = process.env.EXPO_PUBLIC_APPLE_SERVICES_ID ?? "";
