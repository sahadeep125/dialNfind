import { Linking } from "react-native";
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

/** Opens a page of the website (terms, privacy) in an in-app browser. */
export async function openWebPage(path: string): Promise<void> {
  await WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);
}

/** Opens any https link (for example legal pages set in the admin console) in an in-app browser. */
export async function openUrl(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url);
}
