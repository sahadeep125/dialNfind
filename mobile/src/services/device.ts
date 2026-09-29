import { Platform } from "react-native";
import * as Application from "expo-application";

import { logError } from "@/utils/log";

/**
 * An id for this install that survives sign-outs: the Android ID or the iOS vendor id. Sent only with a
 * new review, where the server keeps a hash of it to notice one phone behind several reviewer accounts.
 */
export async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === "android") return Application.getAndroidId();
    if (Platform.OS === "ios") return await Application.getIosIdForVendorAsync();
  } catch (error: unknown) {
    logError("[device] Could not read the device id", error);
  }
  return null;
}
