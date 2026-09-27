import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Mail, MailCheck } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppText } from "@/components/design-system";
import { AuthLayout } from "@/components/auth";
import { useTheme } from "@/hooks/useTheme";
import { api, errorMessage } from "@/services/api";
import { validateEmail } from "@/utils/validation";

/** Emails a reset link. The link opens the DialNFind website, which works for business accounts too. */
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: (address: string) =>
      api("/auth/forgot-password", {
        method: "POST",
        body: { email: address.trim().toLowerCase() },
        token: null,
      }),
  });

  const submit = (): void => {
    const problem = validateEmail(email);
    setError(problem);
    if (!problem) send.mutate(email);
  };

  if (send.isSuccess)
    return (
      <AuthLayout
        back
        title="Check your email"
        subtitle={`If an account exists for ${email.trim()}, a reset link is on its way. It works for one hour.`}
      >
        <View
          accessibilityLiveRegion="polite"
          style={{
            alignItems: "center",
            justifyContent: "center",
            height: 72,
            width: 72,
            borderRadius: 36,
            backgroundColor: theme.colors.semantic.successSoft,
          }}
        >
          <MailCheck size={30} color={theme.colors.semantic.success} />
        </View>
        <AppText variant="meta">Not there after a few minutes? Check your spam folder.</AppText>
        <AppButton size="lg" fullWidth onPress={() => router.back()}>
          Back to log in
        </AppButton>
        <AppButton variant="ghost" fullWidth onPress={() => send.reset()}>
          Use a different email
        </AppButton>
      </AuthLayout>
    );

  return (
    <AuthLayout
      back
      title="Reset password"
      subtitle="Enter the email you sign in with. We will send you a link to choose a new password."
    >
      {send.isError ? <AppCallout tone="danger" title={errorMessage(send.error)} /> : null}
      <AppInput
        label="Email"
        value={email}
        onChangeText={(v) => (setEmail(v), setError(null))}
        error={error}
        placeholder="you@business.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        returnKeyType="send"
        onSubmitEditing={submit}
        leadingIcon={<Mail size={16} color={theme.colors.text.tertiary} />}
      />
      <AppButton size="lg" fullWidth loading={send.isPending} onPress={submit}>
        Send reset link
      </AppButton>
    </AuthLayout>
  );
}
