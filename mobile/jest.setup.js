// Node's own fetch, kept before React Native's test setup replaces it, so tests can talk to a running API.
global.__nodeFetch = globalThis.fetch;

jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));

// Importing react-native-mmkv looks up its native module straight away; use MMKV's in-memory mock instead.
jest.mock("react-native-mmkv", () => {
  const { createMockMMKV } = jest.requireActual("react-native-mmkv/lib/createMMKV/createMockMMKV");
  return { createMMKV: (config) => createMockMMKV(config) };
});
