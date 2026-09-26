import "../../global.css";

import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
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

import { BrandSplash, OfflineBanner, PurchasesSync, PushRegistrar, SessionRefresher, ToastPortal } from "@/components/layout";
import { EmailVerificationGate } from "@/components/auth";
import { colorVariables } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { ApiError } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";

// Keep the native splash up until fonts are ready, then hand over to the branded splash.
SplashScreen.preventAutoHideAsync().catch((error: unknown) =>
  console.error("[splash] Could not hold splash screen", error),
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

export default function RootLayout() {
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
  const ready = (fontsLoaded || !!fontError) && hydrated;

  // The session token is read from the secure store before any screen decides where to go.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (fontError) console.error("[fonts] Falling back to system fonts", fontError);
    if (ready)
      SplashScreen.hideAsync().catch((error: unknown) =>
        console.error("[splash] Could not hide splash screen", error),
      );
  }, [ready, fontError]);

  const finishSplash = useCallback(() => setShowSplash(false), []);

  if (!ready) return null;

  return (
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
          <PurchasesSync />
          <PushRegistrar />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background.primary },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen name="login" options={{ animation: "fade" }} />
            <Stack.Screen name="start" options={{ animation: "fade" }} />
            <Stack.Screen name="register" options={{ animation: "fade" }} />
            <Stack.Screen name="paywall" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="verify-email" options={{ animation: "fade", gestureEnabled: false }} />
          </Stack>
          <EmailVerificationGate />
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
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
