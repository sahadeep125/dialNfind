import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { api } from "@/services/api";
import { STORAGE_KEYS, storage } from "@/services/storage";

/** Android channel the API sends to (server/src/services/push.ts). */
const CHANNEL_ID = "alerts";
const OPT_OUT_KEY = "push.optOut";

// Alerts that arrive while the app is open still show as a banner, so a reply is never missed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushStatus = "on" | "off" | "denied" | "unsupported";

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ?? Constants.easConfig?.projectId;

/** The token this device registered, sent on sign-out so the API stops pushing to it. */
export const storedPushToken = (): string | null => storage.getString(STORAGE_KEYS.pushToken) ?? null;

/** The person switched alerts off in Settings; the app does not re-register until they switch them on. */
export const pushOptedOut = (): boolean => storage.getString(OPT_OUT_KEY) === "1";

export async function pushStatus(): Promise<PushStatus> {
  if (!Device.isDevice || !projectId()) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "denied") return "denied";
  return status === "granted" && storedPushToken() && !pushOptedOut() ? "on" : "off";
}

/**
 * Asks for permission (when `ask`), gets this device's Expo push token and registers it with the API.
 * Returns the resulting status. Simulators and builds without an EAS project id cannot receive pushes.
 */
export async function registerForPush({ ask }: { ask: boolean }): Promise<PushStatus> {
  if (!Device.isDevice) return "unsupported";
  const id = projectId();
  if (!id) {
    console.warn("[push] No EAS projectId in app config (run `eas init`); push alerts are off.");
    return "unsupported";
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Replies and account alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && ask) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return status === "denied" ? "denied" : "off";

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await api("/me/push-tokens", { method: "POST", body: { token, platform: Platform.OS === "ios" ? "ios" : "android" } });
  storage.set(STORAGE_KEYS.pushToken, token);
  storage.remove(OPT_OUT_KEY);
  return "on";
}

/** Stops alerts on this device and remembers the choice. */
export async function disablePush(): Promise<void> {
  storage.set(OPT_OUT_KEY, "1");
  const token = storedPushToken();
  storage.remove(STORAGE_KEYS.pushToken);
  if (token) await api("/me/push-tokens", { method: "DELETE", body: { token } });
}

/** Sign-out: the token is sent with the logout request, so only the local copy is forgotten here. */
export function forgetPushToken(): void {
  storage.remove(STORAGE_KEYS.pushToken);
}
