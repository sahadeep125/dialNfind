import type { ConfigContext, ExpoConfig } from "expo/config";

// Everything lives in app.json. This file only adds Google Sign-In's iOS URL scheme, which is the
// reversed iOS client ID from the environment, so each build can point at its own OAuth client.
const GOOGLE_PLUGIN = "@react-native-google-signin/google-signin";

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const plugins = (config.plugins ?? []).filter((p) => (Array.isArray(p) ? p[0] : p) !== GOOGLE_PLUGIN);
  if (iosClientId) {
    plugins.push([GOOGLE_PLUGIN, { iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}` }]);
  }
  return { ...config, name: config.name ?? "DialNFind Business", slug: config.slug ?? "dialnfind-business", plugins };
};
