// Node's own fetch, kept before React Native's test setup replaces it, so tests can talk to a running API.
global.__nodeFetch = globalThis.fetch;

jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));

// Importing react-native-mmkv looks up its native module straight away; use MMKV's in-memory mock instead.
jest.mock("react-native-mmkv", () => {
  const { createMockMMKV } = jest.requireActual("react-native-mmkv/lib/createMMKV/createMockMMKV");
  return { createMMKV: (config) => createMockMMKV(config) };
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

// react-native-purchases pulls in RevenueCat's ESM web bundle, which Jest cannot parse. Store purchases
// are off in tests (no RevenueCat keys), so a stub is enough.
jest.mock("react-native-purchases", () => {
  const Purchases = {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    logIn: jest.fn(async () => ({ customerInfo: {}, created: false })),
    logOut: jest.fn(async () => ({})),
    getOfferings: jest.fn(async () => ({ current: null, all: {} })),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
    purchasePackage: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    isConfigured: jest.fn(async () => false),
  };
  return { __esModule: true, default: Purchases, LOG_LEVEL: { DEBUG: "DEBUG", WARN: "WARN" }, PURCHASES_ERROR_CODE: {} };
});

// Google Sign-In's native module is not in Jest; the buttons are hidden without client ids anyway.
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(async () => true), signIn: jest.fn(), signOut: jest.fn(async () => null) },
  isCancelledResponse: jest.fn(() => false),
  isErrorWithCode: jest.fn(() => false),
  isSuccessResponse: jest.fn(() => false),
  statusCodes: {},
}));

// NetInfo's own Jest mock (the native module is not available in tests).
jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock.js"));
