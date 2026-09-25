/** Renders the app with the native (Android and iOS) code paths, using Expo's native module mocks. */
module.exports = {
  preset: "jest-expo/android",
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^lucide-react-native$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/__tests__/mocks/style-stub.js",
  },
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/mocks/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|lucide-react-native|nativewind|react-native-css-interop|react-native-mmkv|react-native-nitro-modules|react-native-size-matters|standard-navigation)",
  ],
};
