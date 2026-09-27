import { useState } from "react";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Mail, MailCheck } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppText } from "@/components/design-system";
import { AuthScaffold } from "@/components/auth";
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

  if (send.isSuccess) {
    return (
      <AuthScaffold
        headerTitle="Reset password"
        icon={MailCheck}
        iconTone="success"
        title="Check your email"
        subtitle={`If an account exists for ${email.trim()}, a reset link is on its way. It works for one hour.`}
      >
        <AppText variant="caption" tone="tertiary" align="center" accessibilityLiveRegion="polite">
          Check your spam folder if it does not arrive in a few minutes.
        </AppText>
        <AppButton size="lg" fullWidth onPress={() => router.back()}>
          Back to log in
        </AppButton>
        <AppButton variant="ghost" fullWidth onPress={() => send.reset()}>
          Use a different email
        </AppButton>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      headerTitle="Reset password"
      icon={KeyRound}
      title="Forgot your password?"
      subtitle="Enter the email you sign in with and we will send you a link to choose a new password."
    >
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
    </AuthScaffold>
  );
}
