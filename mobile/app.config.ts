import type { ConfigContext, ExpoConfig } from "expo/config";

// Everything lives in app.json. This file only adds what depends on the environment: Google Sign-In's
// iOS URL scheme (the reversed iOS client ID) and the Sentry plugin.
const GOOGLE_PLUGIN = "@react-native-google-signin/google-signin";

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const plugins = (config.plugins ?? []).filter((p) => (Array.isArray(p) ? p[0] : p) !== GOOGLE_PLUGIN);
  if (iosClientId) {
    plugins.push([GOOGLE_PLUGIN, { iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}` }]);
  }
  // Crash reporting (src/services/monitoring.ts). The plugin uploads source maps during EAS builds when
  // SENTRY_ORG, SENTRY_PROJECT and the SENTRY_AUTH_TOKEN secret are set; without them it is left out.
  const sentryOrg = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
  if (sentryOrg && sentryProject) {
    plugins.push(["@sentry/react-native/expo", { url: "https://sentry.io/", organization: sentryOrg, project: sentryProject }]);
  }
  return { ...config, name: config.name ?? "DialNFind", slug: config.slug ?? "dialnfind", plugins };
};
