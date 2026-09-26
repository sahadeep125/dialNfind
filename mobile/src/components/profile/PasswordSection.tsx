import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppButton, AppCallout, AppCard, AppText } from "@/components/design-system";
import { PasswordInput } from "@/components/auth";
import { SectionHeader } from "@/components/layout";
import { queryKeys } from "@/hooks/queryKeys";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/services/api";
import type { SessionUser } from "@/types";
import { isValid, validatePassword } from "@/utils/validation";

/** Change the password, or set one for accounts made with Google or Apple. */
export function PasswordSection({ user }: { user: SessionUser }) {
  const theme = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const hasPassword = user.hasPassword;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const change = useMutation({
    mutationFn: () =>
      api("/auth/change-password", {
        method: "POST",
        body: { currentPassword: hasPassword ? current : undefined, newPassword: next },
      }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      void qc.invalidateQueries({ queryKey: queryKeys.me });
      toast(
        hasPassword
          ? "Password changed. Other devices were signed out."
          : "Password set. You can sign in with your email too.",
        "success",
      );
    },
  });

  const submit = (): void => {
    const found = {
      current: hasPassword && !current ? "Enter your current password" : null,
      next: validatePassword(next),
      confirm: next && confirm !== next ? "The passwords do not match" : null,
    };
    setErrors(found);
    if (isValid(found)) change.mutate();
  };
  const clear = (key: string) => setErrors((e) => ({ ...e, [key]: null }));
  const via = user.linkedAccounts.map((a) => (a === "google" ? "Google" : "Apple")).join(" and ");

  return (
    <View style={{ gap: theme.spacing[3] }}>
      <SectionHeader title={hasPassword ? "Change password" : "Set a password"} />
      <AppCard>
        <View style={{ gap: theme.spacing[4] }}>
          <AppText tone="secondary">
            {hasPassword
              ? "Changing it signs you out on your other devices."
              : `You sign in with ${via || "a linked account"}. Set a password to also sign in with your email.`}
          </AppText>
          {change.isError ? <AppCallout tone="danger">{errorMessage(change.error)}</AppCallout> : null}
          {hasPassword ? (
            <PasswordInput
              label="Current password"
              value={current}
              onChangeText={(v: string) => (setCurrent(v), clear("current"))}
              error={errors.current}
              autoComplete="current-password"
              textContentType="password"
            />
          ) : null}
          <PasswordInput
            label="New password"
            helper="At least 8 characters with a letter and a number."
            value={next}
            onChangeText={(v: string) => (setNext(v), clear("next"))}
            error={errors.next}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <PasswordInput
            label="Confirm new password"
            value={confirm}
            onChangeText={(v: string) => (setConfirm(v), clear("confirm"))}
            error={errors.confirm}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <AppButton fullWidth variant="secondary" loading={change.isPending} onPress={submit}>
            {hasPassword ? "Change password" : "Set password"}
          </AppButton>
        </View>
      </AppCard>
    </View>
  );
}
