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
import { PasswordInput } from "@/components/auth";
import { BrandMark, Screen, ScreenHeader } from "@/components/layout";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { isValid, validateEmail } from "@/utils/validation";

export default function LoginScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { login } = useAuthActions();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const close = (): void => (router.canGoBack() ? router.back() : router.replace("/"));

  const submit = (): void => {
    const next = { email: validateEmail(email), password: password ? null : "Enter your password" };
    setErrors(next);
    setFormError(null);
    if (!isValid(next)) return;
    login.mutate(
      { email, password },
      {
        onSuccess: ({ user }) => {
          toast(`Welcome back, ${user.name.split(" ")[0]}`, "success");
          close();
        },
        onError: (error: Error) => setFormError(errorMessage(error)),
      },
    );
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="" />
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
            <AppText variant="title" align="center" accessibilityRole="header">
              Welcome back
            </AppText>
            <AppText tone="secondary" align="center">
              Sign in to save favorites and review providers.
            </AppText>
          </View>

          {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

          <AppInput
            label="Email"
            value={email}
            onChangeText={(v) => (setEmail(v), setErrors((e) => ({ ...e, email: null })))}
            error={errors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
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
            onChangeText={(v) => (setPassword(v), setErrors((e) => ({ ...e, password: null })))}
            error={errors.password}
            placeholder="Your password"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <AppButton size="lg" fullWidth loading={login.isPending} onPress={submit}>
            Sign in
          </AppButton>

          <View style={styles.switchRow}>
            <AppText tone="secondary">New to DialNFind?</AppText>
            <AppPressable
              accessibilityRole="link"
              hitSlop={10}
              onPress={() => router.replace("/register")}
            >
              <AppText variant="label" tone="brand">
                Create an account
              </AppText>
            </AppPressable>
          </View>

          <AppText variant="caption" tone="tertiary" align="center">
            You can browse and call providers without an account.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  brand: { alignItems: "center" },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
});
