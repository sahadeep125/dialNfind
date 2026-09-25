import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, type CustomerInfo } from "react-native-purchases";

import { REVENUECAT_ANDROID_KEY, REVENUECAT_IOS_KEY } from "@/constants/config";

/**
 * RevenueCat for App Store and Google Play subscriptions. Purchases belong to the business, so the
 * app user id is the provider (provider_<id>), the same id the server looks up. What a provider
 * can use is still decided by the server's plan, which also covers plans bought on the web.
 */

const apiKey = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : Platform.OS === "android" ? REVENUECAT_ANDROID_KEY : "";

/** False when no SDK key is set for this platform (or on web); the store purchase buttons are then hidden. */
export const purchasesEnabled = apiKey !== "";

let configured = false;
let currentUserId: string | null = null;

export function configurePurchases(): void {
  if (!purchasesEnabled || configured) return;
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  configured = true;
}

export const appUserIdFor = (providerId: number): string => `provider_${providerId}`;

/** Points RevenueCat at the business. Safe to call on every session refresh. */
export async function identifyProvider(providerId: number): Promise<CustomerInfo | null> {
  if (!configured) return null;
  const id = appUserIdFor(providerId);
  if (currentUserId === id) return null;
  try {
    const { customerInfo } = await Purchases.logIn(id);
    currentUserId = id;
    return customerInfo;
  } catch (error: unknown) {
    console.error("[purchases] Could not identify the business", error);
    return null;
  }
}

/** On sign-out, so the next account on this phone does not see this business's purchases. */
export async function resetPurchases(): Promise<void> {
  if (!configured || currentUserId === null) return;
  currentUserId = null;
  try {
    await Purchases.logOut();
  } catch (error: unknown) {
    console.error("[purchases] Could not sign out of RevenueCat", error);
  }
}

export const isIdentified = (): boolean => currentUserId !== null;
