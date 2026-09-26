import { useEffect, useState } from "react";
import { AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppText } from "@/components/design-system";
import { Screen, ScreenHeader } from "@/components/layout";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { api, ApiError, errorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SessionUser } from "@/types";

/** Signed in but not confirmed: type the 6-digit code from the email, or tap its link and come back. */
export default function VerifyEmailScreen() {
  const theme = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { sent } = useLocalSearchParams<{ sent?: string }>();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { signOut } = useAuthActions();
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(sent === "1" ? 60 : 0);

  const done = (next: SessionUser): void => {
    setUser(next);
    void qc.invalidateQueries();
    toast("Email confirmed. Let's set up your business.", "success");
    // The home route sends the account on to business setup or the dashboard.
    router.replace("/");
  };

  const verify = useMutation({
    mutationFn: (value: string) => api<{ user: SessionUser }>("/auth/verify-email/code", { method: "POST", body: { code: value } }),
    onSuccess: ({ user: next }) => done(next),
  });

  const resend = useMutation({
    mutationFn: () => api<{ retryAfter: number }>("/auth/resend-verification", { method: "POST" }),
    onSuccess: ({ retryAfter }) => {
      setWait(retryAfter);
      setCode("");
      verify.reset();
    },
    onError: (error: Error) => {
      const retryAfter = error instanceof ApiError ? error.details?.retryAfter : undefined;
      if (typeof retryAfter === "number") setWait(retryAfter);
    },
  });

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Someone who tapped the link in their mail app comes back here already confirmed.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      api<{ user: SessionUser }>("/auth/me")
        .then(({ user: fresh }) => {
          if (fresh.emailVerifiedAt) done(fresh);
        })
        .catch(() => undefined);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return <Redirect href="/login" />;
  if (user.emailVerifiedAt) return <Redirect href="/" />;

  const onChange = (value: string): void => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (verify.isError) verify.reset();
    if (digits.length === 6 && !verify.isPending) verify.mutate(digits);
  };

  const resendError = resend.isError && !(resend.error instanceof ApiError && resend.error.details?.retryAfter);

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Confirm your email" showBack={false} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing[6], gap: theme.spacing[5] }}>
          <MailCheck size={40} color={theme.colors.brand.primary} />
          <AppText variant="heading" accessibilityRole="header">
            Check your inbox
          </AppText>
          <AppText tone="secondary">
            {`We sent a 6-digit code to ${user.email}. Enter it below, or tap the link in the same email and come back.`}
          </AppText>
          {resendError ? <AppCallout tone="danger">{errorMessage(resend.error)}</AppCallout> : null}
          <AppInput
            label="6-digit code"
            value={code}
            onChangeText={onChange}
            error={verify.isError ? errorMessage(verify.error) : null}
            placeholder="000000"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
          />
          <AppButton size="lg" fullWidth loading={verify.isPending} disabled={code.length !== 6} onPress={() => verify.mutate(code)}>
            Confirm email
          </AppButton>
          <AppButton variant="ghost" fullWidth loading={resend.isPending} disabled={wait > 0} onPress={() => resend.mutate()}>
            {wait > 0 ? `Send a new code in ${wait}s` : sent === "1" ? "Send a new code" : "Email me a code"}
          </AppButton>
          <AppButton
            variant="ghost"
            fullWidth
            onPress={() => {
              signOut();
              router.replace("/login");
            }}
          >
            Wrong email? Sign out
          </AppButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
