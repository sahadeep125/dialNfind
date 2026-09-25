// iOS 27 terminates apps at launch unless they adopt the UIScene life cycle
// (UIKit traps in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// The SDK 57 prebuild template still creates the window in the AppDelegate, so
// this plugin registers Expo's ExpoAppSceneDelegate in Info.plist and lets it
// create the window and start React Native instead.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const SCENE_DELEGATE_CLASS = "EXExpoAppSceneDelegate";

const START_REACT_NATIVE = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

`;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return config;
  });
}

function withFactoryProvider(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error("withSceneLifecycle only supports a Swift AppDelegate");
    }
    let contents = config.modResults.contents;

    if (!contents.includes("ExpoReactNativeFactoryProvider")) {
      contents = contents.replace(
        "class AppDelegate: ExpoAppDelegate {",
        "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
      );
    }
    // ExpoAppSceneDelegate creates the window and starts React Native in it.
    contents = contents.replace(START_REACT_NATIVE, "");

    if (
      !contents.includes("ExpoReactNativeFactoryProvider") ||
      contents.includes("UIWindow(frame: UIScreen.main.bounds)")
    ) {
      throw new Error("withSceneLifecycle could not patch AppDelegate.swift; the template changed");
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withFactoryProvider(withSceneManifest(config));
};
