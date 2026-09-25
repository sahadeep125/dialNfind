import { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";

import { AppButton, AppPressable, AppText } from "@/components/design-system";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import { errorMessage } from "@/services/api";
import {
  appleAvailable,
  appleSignIn,
  googleAvailable,
  googleSignIn,
  SocialSignInError,
  type SocialProvider,
} from "@/services/socialAuth";
import type { SessionUser } from "@/types";

const TERMS_NOTE = "By continuing you agree to the DialNFind terms of use and privacy policy.";

interface Props {
  mode: "signin" | "signup";
  onError: (message: string | null) => void;
  onSignedIn: (result: { user: SessionUser; isNewUser: boolean }) => void;
}

/** "Continue with Apple / Google" and an "or" divider. Renders nothing on web or when not configured. */
export function SocialSignInButtons({ mode, onError, onSignedIn }: Props) {
  const theme = useTheme();
  const { socialLogin } = useAuthActions();
  const [active, setActive] = useState<SocialProvider | null>(null);
  const busy = active !== null || socialLogin.isPending;

  if (!googleAvailable && !appleAvailable) return null;

  const run = async (provider: SocialProvider): Promise<void> => {
    if (busy) return;
    onError(null);
    setActive(provider);
    try {
      let result;
      if (provider === "google") {
        const payload = await googleSignIn();
        if (!payload) return; // cancelled
        result = await socialLogin.mutateAsync({ provider, payload });
      } else {
        const payload = await appleSignIn();
        if (!payload) return;
        result = await socialLogin.mutateAsync({ provider, payload });
      }
      onSignedIn({ user: result.user, isNewUser: result.isNewUser });
    } catch (error) {
      onError(error instanceof SocialSignInError ? error.message : errorMessage(error));
    } finally {
      setActive(null);
    }
  };

  const height = theme.components.button.height.lg;
  const radius = theme.components.button.radius;
  const signup = mode === "signup";

  return (
    <View style={{ gap: theme.spacing[5] }}>
      <View style={{ gap: theme.spacing[3] }} pointerEvents={busy ? "none" : "auto"}>
        {appleAvailable && Platform.OS === "ios" ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              signup
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              theme.mode === "dark"
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius}
            style={[styles.full, { height, opacity: busy ? 0.6 : 1 }]}
            onPress={() => void run("apple")}
          />
        ) : null}
        {appleAvailable && Platform.OS === "android" ? (
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={signup ? "Sign up with Apple" : "Continue with Apple"}
            accessibilityState={{ disabled: busy, busy: active === "apple" }}
            onPress={() => void run("apple")}
            style={[
              styles.brandButton,
              { height, borderRadius: radius, backgroundColor: theme.mode === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            {active === "apple" ? (
              <ActivityIndicator color={theme.mode === "dark" ? "#000000" : "#FFFFFF"} />
            ) : (
              <>
                <AppleLogo color={theme.mode === "dark" ? "#000000" : "#FFFFFF"} />
                <AppText variant="label" style={{ color: theme.mode === "dark" ? "#000000" : "#FFFFFF" }}>
                  {signup ? "Sign up with Apple" : "Continue with Apple"}
                </AppText>
              </>
            )}
          </AppPressable>
        ) : null}
        {googleAvailable ? (
          <AppButton
            variant="secondary"
            size="lg"
            fullWidth
            loading={active === "google"}
            disabled={busy && active !== "google"}
            leadingIcon={<GoogleLogo />}
            onPress={() => void run("google")}
          >
            {signup ? "Sign up with Google" : "Continue with Google"}
          </AppButton>
        ) : null}
        {active === "apple" && Platform.OS === "ios" ? (
          <ActivityIndicator accessibilityLabel="Signing in with Apple" color={theme.colors.text.secondary} />
        ) : null}
        <AppText variant="caption" tone="tertiary" align="center">
          {TERMS_NOTE}
        </AppText>
      </View>
      <View style={[styles.dividerRow, { gap: theme.spacing[3] }]}>
        <View style={[styles.line, { backgroundColor: theme.colors.border.primary }]} />
        <AppText variant="caption" tone="tertiary">
          or use your email
        </AppText>
        <View style={[styles.line, { backgroundColor: theme.colors.border.primary }]} />
      </View>
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </Svg>
  );
}

function AppleLogo({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path
        fill={color}
        d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  full: { width: "100%" },
  brandButton: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  dividerRow: { alignItems: "center", flexDirection: "row" },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
