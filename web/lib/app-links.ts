/** Paths on this site that open in the DialNFind app when it is installed (mobile/src/app/+native-intent.tsx maps them). */
export const APP_LINK_PATHS = ["/providers/*", "/services", "/services/*", "/search", "/dashboard/notifications", "/dashboard/support/*", "/dashboard/contacts"];

export const IOS_APP_ID = `${process.env.APPLE_TEAM_ID || "9HH33XNTUX"}.${process.env.IOS_BUNDLE_ID || "com.dialnfind.app"}`;
export const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || "com.dialnfind.app";

/** SHA-256 fingerprints of the app signing certificates (Play Console > App integrity), comma-separated. */
export const ANDROID_FINGERPRINTS = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? "")
  .split(",")
  .map((f) => f.trim())
  .filter(Boolean);
