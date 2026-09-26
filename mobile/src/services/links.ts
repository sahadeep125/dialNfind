import { Linking, Platform, Share } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { WEB_URL } from "@/constants/config";

export async function openPhone(number: string): Promise<void> {
  await Linking.openURL(`tel:${number}`);
}

export async function openWhatsApp(number: string, message?: string): Promise<void> {
  const digits = number.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  await Linking.openURL(`https://wa.me/${digits}${text}`);
}

export async function openEmail(address: string, subject: string): Promise<void> {
  await Linking.openURL(`mailto:${address}?subject=${encodeURIComponent(subject)}`);
}

/** The terms or privacy page: the link set in the admin console, or the website's own page. */
export function legalUrl(doc: "terms" | "privacy", configured: string | null | undefined): string {
  return configured || `${WEB_URL}/${doc}`;
}

/** Opens a page of the website (terms, privacy) in an in-app browser. */
export async function openWebPage(path: string): Promise<void> {
  await WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);
}

/** Opens any https link (for example legal pages set in the admin console) in an in-app browser. */
export async function openUrl(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url);
}

/** Opens the address in the phone's maps app, or Google Maps in the browser if none answers. */
export async function openMaps(latitude: number, longitude: number, label: string): Promise<void> {
  const q = encodeURIComponent(label);
  const native =
    Platform.OS === "ios"
      ? `maps:?q=${q}&ll=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${q})`;
  try {
    await Linking.openURL(native);
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
  }
}

/** Opens the share sheet with a link to the provider's page on the website. */
export async function shareProvider(slug: string, businessName: string): Promise<void> {
  const url = `${WEB_URL}/providers/${encodeURIComponent(slug)}`;
  await Share.share(
    Platform.OS === "ios"
      ? { message: `${businessName} on DialNFind`, url }
      : { message: `${businessName} on DialNFind: ${url}` },
  );
}
