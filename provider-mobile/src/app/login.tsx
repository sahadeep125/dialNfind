import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from "react-native";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppPressable, AppText } from "@/components/design-system";
import { SocialSignInButtons } from "@/components/auth";
import { PasswordInput } from "@/components/forms";
import { BrandMark, Screen } from "@/components/layout";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import type { SessionUser } from "@/types";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { isValid, validateEmail } from "@/utils/validation";

/** Sign in to a DialNFind business account. */
export default function LoginScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { login } = useAuthActions();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = (): void => {
    const next = { email: validateEmail(email), password: password ? null : "Enter your password" };
    setErrors(next);
    setFormError(null);
    if (!isValid(next)) return;
    login.mutate(
      { email, password },
      {
        onSuccess: ({ user }) => {
          if (!user.emailVerifiedAt) {
            router.replace("/verify-email");
            return;
          }
          toast(`Welcome back, ${user.name.split(" ")[0]}`, "success");
          router.replace("/");
        },
        onError: (error: Error) => setFormError(errorMessage(error)),
      },
    );
  };

  // The home screen sends new business accounts through setup.
  const onSocialSignedIn = ({ user, isNewUser }: { user: SessionUser; isNewUser: boolean }): void => {
    const first = user.name.split(" ")[0];
    toast(isNewUser ? `Welcome to DialNFind, ${first}` : `Welcome back, ${first}`, "success");
    router.replace("/");
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { padding: theme.spacing[6], gap: theme.spacing[5] },
          ]}
        >
          <View style={[styles.brand, { gap: theme.spacing[3] }]}>
            <BrandMark size={56} />
            <AppText variant="overline" tone="brand" align="center">
              DialNFind for Business
            </AppText>
            <AppText variant="title" align="center" accessibilityRole="header">
              Log in to your business
            </AppText>
            <AppText tone="secondary" align="center">
              Manage your listing, leads and reviews.
            </AppText>
          </View>

          {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

          <SocialSignInButtons mode="signin" onError={setFormError} onSignedIn={onSocialSignedIn} />

          <AppInput
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors((e) => ({ ...e, email: null }));
            }}
            error={errors.email}
            placeholder="you@business.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            leadingIcon={<Mail size={18} color={theme.colors.text.tertiary} />}
          />
          <PasswordInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setErrors((e) => ({ ...e, password: null }));
            }}
            error={errors.password}
            placeholder="Your password"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <AppPressable
            accessibilityRole="link"
            hitSlop={10}
            style={styles.forgot}
            onPress={() => router.push("/forgot-password")}
          >
            <AppText variant="label" tone="brand">
              Forgot password?
            </AppText>
          </AppPressable>

          <AppButton size="lg" fullWidth loading={login.isPending} onPress={submit}>
            Log in
          </AppButton>

          <View style={styles.switchRow}>
            <AppText tone="secondary">New here?</AppText>
            <AppPressable
              accessibilityRole="link"
              hitSlop={10}
              onPress={() => router.replace("/register")}
            >
              <AppText variant="label" tone="brand">
                Create a business account
              </AppText>
            </AppPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 440,
    width: "100%",
  },
  brand: { alignItems: "center" },
  forgot: { alignSelf: "flex-end", marginTop: -8 },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
});
