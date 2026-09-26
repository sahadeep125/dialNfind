// Node's own fetch, kept before React Native's test setup replaces it, so tests can talk to a running API.
global.__nodeFetch = globalThis.fetch;

jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));

// Importing react-native-mmkv looks up its native module straight away; use MMKV's in-memory mock instead.
jest.mock("react-native-mmkv", () => {
  const { createMockMMKV } = jest.requireActual("react-native-mmkv/lib/createMMKV/createMockMMKV");
  return { createMMKV: (config) => createMockMMKV(config) };
});

// The secure store is native too; an in-memory map stands in for the Keychain / Keystore.
jest.mock("expo-secure-store", () => {
  const items = new Map();
  return {
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => void items.set(key, value),
    deleteItemAsync: async (key) => void items.delete(key),
  };
});

// expo-notifications loads a web polyfill Jest cannot parse, and push needs a real device anyway.
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: "undetermined" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[test]" })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  useLastNotificationResponse: jest.fn(() => null),
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  AndroidImportance: { HIGH: 4 },
}));

// NetInfo's own Jest mock (the native module is not available in tests).
jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock.js"));

// Google Sign-In's native module is not in Jest; the buttons are hidden without client ids anyway.
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(async () => true), signIn: jest.fn(), signOut: jest.fn(async () => null) },
  isCancelledResponse: jest.fn(() => false),
  isErrorWithCode: jest.fn(() => false),
  isSuccessResponse: jest.fn(() => false),
  statusCodes: {},
}));
