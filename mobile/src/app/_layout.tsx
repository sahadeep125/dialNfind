import "../../global.css";
// Before anything else, so errors during startup are reported too.
import {
  navigationIntegration,
  reportError,
  setMonitoringUser,
  wrapRoot,
} from "@/services/monitoring";
import { posthog } from "@/services/analytics";

import { useCallback, useEffect, useState } from "react";
import { LogBox, StyleSheet, View } from "react-native";
import { Stack, useNavigationContainerRef, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PostHogProvider } from "posthog-react-native";
import { vars } from "nativewind";
import Animated, { FadeOut } from "react-native-reanimated";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

import {
  AnalyticsSync,
  BrandSplash,
  ErrorState,
  OfflineBanner,
  OnboardingGate,
  PushRegistrar,
  RatingPrompter,
  SessionRefresher,
  ToastPortal,
} from "@/components/layout";
import { EmailVerificationGate } from "@/components/auth";
import { colorVariables } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { ApiError } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { logError } from "@/utils/log";

// LogBox draws its own bar over the tab bar in development. Messages for people use useToast();
// warnings and errors for developers stay in the Metro terminal.
LogBox.ignoreAllLogs();

// Keep the native splash up until fonts are ready, then hand over to the branded splash.
SplashScreen.preventAutoHideAsync().catch((error: unknown) =>
  logError("[splash] Could not hold splash screen", error),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // Retrying a 4xx never helps; retry network hiccups once.
      retry: (count: number, error: Error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
    },
  },
});

/** Shown instead of a screen that crashed while rendering; the error is reported and the person can retry. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => reportError(error), [error]);
  return (
    <View style={[styles.fill, styles.crash]}>
      <ErrorState error={error} onRetry={() => void retry()} />
    </View>
  );
}

function RootLayout() {
  const theme = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useAuthStore((s) => s.hydrated);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const navigationRef = useNavigationContainerRef();

  useEffect(() => setMonitoringUser(userId), [userId]);
  useEffect(() => {
    if (navigationRef) navigationIntegration?.registerNavigationContainer(navigationRef);
  }, [navigationRef]);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (fontError) logError("[fonts] Falling back to system fonts", fontError);
    if (ready)
      SplashScreen.hideAsync().catch((error: unknown) =>
        logError("[splash] Could not hide splash screen", error),
      );
  }, [ready, fontError]);

  const finishSplash = useCallback(() => setShowSplash(false), []);

  if (!ready) return null;

  const tree = (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.colors.background.primary },
            vars(colorVariables(theme.colors)),
          ]}
        >
          <StatusBar style={showSplash || theme.mode === "dark" ? "light" : "dark"} />
          <SessionRefresher />
          <AnalyticsSync />
          <PushRegistrar />
          <RatingPrompter />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background.primary },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding"
              options={{ animation: "fade", gestureEnabled: false }}
            />
            <Stack.Screen
              name="login"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="register"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="review/[slug]"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="search" options={{ animation: "fade" }} />
            <Stack.Screen name="verify-email" options={{ gestureEnabled: false }} />
          </Stack>
          <EmailVerificationGate />
          <OnboardingGate />
          <OfflineBanner />
          <ToastPortal />
          {showSplash ? (
            <Animated.View exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
              <BrandSplash onFinish={finishSplash} />
            </Animated.View>
          ) : null}
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
  // Screens are recorded by AnalyticsSync (Expo Router paths); the provider adds tap autocapture.
  return posthog ? (
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: true }}>
      {tree}
    </PostHogProvider>
  ) : (
    tree
  );
}

const styles = StyleSheet.create({
  crash: { justifyContent: "center", padding: 24 },
  fill: { flex: 1 },
});

export default wrapRoot(RootLayout);
