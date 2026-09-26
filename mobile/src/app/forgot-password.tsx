import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Mail, MailCheck } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppText } from "@/components/design-system";
import { Screen, ScreenHeader } from "@/components/layout";
import { useTheme } from "@/hooks/useTheme";
import { api, errorMessage } from "@/services/api";
import { validateEmail } from "@/utils/validation";

/** Emails a reset link. The link opens the DialNFind website, where the new password is chosen. */
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: (address: string) =>
      api("/auth/forgot-password", { method: "POST", body: { email: address.trim().toLowerCase() }, token: null }),
  });

  const submit = (): void => {
    const problem = validateEmail(email);
    setError(problem);
    if (!problem) send.mutate(email);
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Reset password" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { padding: theme.spacing[6], gap: theme.spacing[5] }]}>
          {send.isSuccess ? (
            <View style={{ gap: theme.spacing[4] }} accessibilityLiveRegion="polite">
              <MailCheck size={40} color={theme.colors.semantic.success} />
              <AppText variant="heading" accessibilityRole="header">
                Check your email
              </AppText>
              <AppText tone="secondary">
                {`If an account exists for ${email.trim()}, a reset link is on its way. It works for one hour. Check your spam folder if it does not arrive in a few minutes.`}
              </AppText>
              <AppButton fullWidth onPress={() => router.back()}>
                Back to log in
              </AppButton>
              <AppButton variant="ghost" fullWidth onPress={() => send.reset()}>
                Use a different email
              </AppButton>
            </View>
          ) : (
            <>
              <AppText tone="secondary">Enter the email you sign in with and we will send you a link to choose a new password.</AppText>
              {send.isError ? <AppCallout tone="danger">{errorMessage(send.error)}</AppCallout> : null}
              <AppInput
                label="Email"
                value={email}
                onChangeText={(v) => (setEmail(v), setError(null))}
                error={error}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
                returnKeyType="send"
                onSubmitEditing={submit}
                leadingIcon={<Mail size={18} color={theme.colors.text.tertiary} />}
              />
              <AppButton size="lg" fullWidth loading={send.isPending} onPress={submit}>
                Send reset link
              </AppButton>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { alignSelf: "center", maxWidth: 440, width: "100%" },
});
