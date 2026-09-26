import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, User } from "lucide-react-native";

import { AppButton, AppCallout, AppCard, AppInput, AppSkeleton, AppText } from "@/components/design-system";
import { PasswordInput } from "@/components/forms";
import { Screen, ScreenHeader, SectionHeader } from "@/components/layout";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SessionUser } from "@/types";
import { isValid, normalizePhone, validateName, validateOptionalPhone, validatePassword } from "@/utils/validation";

/** The person's own sign-in details: name, phone and password. Business details live under Edit profile. */
export default function AccountScreen() {
  const theme = useTheme();
  const session = useSession();
  const user = session.data?.user;

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Account settings" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[6], paddingBottom: theme.spacing[10] }}>
          {user ? (
            <>
              <DetailsSection key={`${user.name}|${user.phone ?? ""}`} user={user} />
              <PasswordSection user={user} />
            </>
          ) : (
            <>
              <AppSkeleton shape="block" height={260} />
              <AppSkeleton shape="block" height={220} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DetailsSection({ user }: { user: SessionUser }) {
  const theme = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const save = useMutation({
    mutationFn: () =>
      api<{ user: SessionUser }>("/auth/me", {
        method: "PATCH",
        body: { name: name.trim(), phone: phone.trim() ? normalizePhone(phone) : null },
      }),
    onSuccess: ({ user: saved }) => {
      setUser(saved);
      void qc.invalidateQueries({ queryKey: ["session"] });
      toast("Account details saved", "success");
    },
  });

  const dirty = name.trim() !== user.name || (phone.trim() ? normalizePhone(phone) : null) !== (user.phone ?? null);
  const submit = (): void => {
    const next = { name: validateName(name), phone: validateOptionalPhone(phone) };
    setErrors(next);
    if (isValid(next)) save.mutate();
  };

  return (
    <View style={{ gap: theme.spacing[3] }}>
      <SectionHeader title="Your details" />
      <AppCard>
        <View style={{ gap: theme.spacing[4] }}>
          {save.isError ? <AppCallout tone="danger">{errorMessage(save.error)}</AppCallout> : null}
          <AppInput
            label="Your name"
            required
            value={name}
            onChangeText={(v) => (setName(v), setErrors((e) => ({ ...e, name: null })))}
            error={errors.name}
            autoComplete="name"
            textContentType="name"
            leadingIcon={<User size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            label="Mobile number"
            helper="Only our team sees it. Your business number is under Edit profile."
            value={phone}
            onChangeText={(v) => (setPhone(v), setErrors((e) => ({ ...e, phone: null })))}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            leadingIcon={<Phone size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            label="Email"
            helper="To change your sign-in email, contact support."
            value={user.email}
            editable={false}
            leadingIcon={<Mail size={18} color={theme.colors.text.tertiary} />}
          />
          <AppButton fullWidth disabled={!dirty} loading={save.isPending} onPress={submit}>
            Save details
          </AppButton>
        </View>
      </AppCard>
    </View>
  );
}

function PasswordSection({ user }: { user: SessionUser }) {
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
      api("/auth/change-password", { method: "POST", body: { currentPassword: hasPassword ? current : undefined, newPassword: next } }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      void qc.invalidateQueries({ queryKey: ["session"] });
      toast(hasPassword ? "Password changed. Other devices were signed out." : "Password set. You can sign in with your email too.", "success");
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
