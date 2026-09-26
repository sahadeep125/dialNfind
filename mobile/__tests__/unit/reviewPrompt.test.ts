jest.mock("expo-store-review", () => ({
  hasAction: jest.fn(async () => true),
  requestReview: jest.fn(async () => undefined),
  storeUrl: jest.fn(() => null),
}));

import * as StoreReview from "expo-store-review";

import {
  askAfterReview,
  askIfPending,
  coolingDown,
  nextAfterContact,
  recordContact,
  type PromptState,
} from "@/services/reviewPrompt";
import { STORAGE_KEYS, storage } from "@/services/storage";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

beforeEach(() => {
  storage.remove(STORAGE_KEYS.reviewPrompt);
  jest.clearAllMocks();
});

describe("rating prompt", () => {
  it("becomes due after the third contact", () => {
    let state: PromptState = { contacts: 0, lastAskedAt: null, pending: false };
    state = nextAfterContact(state, NOW);
    state = nextAfterContact(state, NOW);
    expect(state.pending).toBe(false);
    state = nextAfterContact(state, NOW);
    expect(state.pending).toBe(true);
  });

  it("waits 90 days between prompts", () => {
    expect(coolingDown({ contacts: 0, lastAskedAt: NOW - 30 * DAY, pending: false }, NOW)).toBe(true);
    expect(coolingDown({ contacts: 0, lastAskedAt: NOW - 91 * DAY, pending: false }, NOW)).toBe(false);
  });

  it("asks when the app comes back after enough contacts, then not again", async () => {
    recordContact(NOW);
    recordContact(NOW);
    await askIfPending(NOW);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
    recordContact(NOW);
    await askIfPending(NOW);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    await askIfPending(NOW + DAY);
    await askAfterReview(NOW + DAY);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it("asks after a posted review", async () => {
    await askAfterReview(NOW);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });
});
