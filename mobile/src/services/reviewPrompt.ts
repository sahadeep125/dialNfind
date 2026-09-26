import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";

import { openUrl } from "@/services/links";
import { STORAGE_KEYS, readJson, writeJson } from "@/services/storage";

const DAY = 24 * 60 * 60 * 1000;
/** Ask again at most every 90 days, whatever the OS allows. */
const COOLDOWN = 90 * DAY;
const CONTACTS_BEFORE_ASKING = 3;

export interface PromptState {
  contacts: number;
  lastAskedAt: number | null;
  /** Set after enough contacts; the prompt shows when the person is back in the app. */
  pending: boolean;
}

const EMPTY: PromptState = { contacts: 0, lastAskedAt: null, pending: false };

const read = (): PromptState => ({ ...EMPTY, ...readJson<PromptState>(STORAGE_KEYS.reviewPrompt) });

export function coolingDown(state: PromptState, now: number): boolean {
  return state.lastAskedAt !== null && now - state.lastAskedAt < COOLDOWN;
}

/** After a call or message: counts it, and after the third one marks the prompt as due. */
export function nextAfterContact(state: PromptState, now: number): PromptState {
  const contacts = state.contacts + 1;
  return { ...state, contacts, pending: state.pending || (contacts >= CONTACTS_BEFORE_ASKING && !coolingDown(state, now)) };
}

async function ask(now: number): Promise<void> {
  if (!(await StoreReview.hasAction())) return;
  writeJson(STORAGE_KEYS.reviewPrompt, { contacts: 0, lastAskedAt: now, pending: false });
  await StoreReview.requestReview();
}

/** Counts a call or message. The person is in the dialer or WhatsApp now, so nothing is shown yet. */
export function recordContact(now = Date.now()): void {
  writeJson(STORAGE_KEYS.reviewPrompt, nextAfterContact(read(), now));
}

/** After posting a review: a good moment to ask, unless we asked recently. */
export async function askAfterReview(now = Date.now()): Promise<void> {
  if (!coolingDown(read(), now)) await ask(now);
}

/** When the app comes back to the foreground: shows the prompt if contacts made it due. */
export async function askIfPending(now = Date.now()): Promise<void> {
  const state = read();
  if (state.pending && !coolingDown(state, now)) await ask(now);
}

/**
 * "Rate DialNFind" in Settings: the in-app prompt when the OS allows it, otherwise the store listing
 * (`ios.appStoreUrl` / `android.playStoreUrl` in app.json), otherwise a store search.
 */
export async function rateApp(): Promise<void> {
  if (await StoreReview.hasAction()) {
    await StoreReview.requestReview();
    return;
  }
  const url = StoreReview.storeUrl();
  await openUrl(
    url ??
      (Platform.OS === "ios"
        ? "https://apps.apple.com/search?term=DialNFind"
        : "https://play.google.com/store/apps/details?id=com.dialnfind.app"),
  );
}
