import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { Mail, Phone, UserRound } from "lucide-react-native";

import { AppAvatar, AppButton, AppInput, AppText } from "@/components/design-system";
import { Screen, ScreenHeader } from "@/components/layout";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { ApiError, errorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDate } from "@/utils/format";
import { isValid, validateName, validateOptionalPhone } from "@/utils/validation";

export default function ProfileScreen() {
  const theme = useTheme();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  if (!user) return <Redirect href="/login" />;

  const dirty = name.trim() !== user.name || phone.trim() !== (user.phone ?? "");

  const save = (): void => {
    const next = { name: validateName(name), phone: validateOptionalPhone(phone) };
    setErrors(next);
    if (!isValid(next)) return;
    update.mutate(
      { name, phone },
      {
        onSuccess: () => toast("Profile saved", "success"),
        onError: (error: Error) => {
          if (error instanceof ApiError && Object.keys(error.fieldErrors).length)
            setErrors(error.fieldErrors);
          toast(errorMessage(error), "error");
        },
      },
    );
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Your profile" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[5] }}
        >
          <View style={[styles.hero, { gap: theme.spacing[2] }]}>
            <AppAvatar name={user.name} uri={user.profilePhotoUrl} size={84} />
            <AppText variant="heading" align="center">
              {user.name}
            </AppText>
            <AppText variant="caption" tone="secondary" align="center">
              Member since {formatDate(user.createdAt)}
            </AppText>
          </View>
          <AppInput
            label="Full name"
            required
            value={name}
            onChangeText={(v) => (setName(v), setErrors((e) => ({ ...e, name: null })))}
            error={errors.name}
            autoComplete="name"
            leadingIcon={<UserRound size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            label="Email"
            value={user.email}
            editable={false}
            helper="Contact support to change your email."
            leadingIcon={<Mail size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            label="Mobile number"
            helper="Optional. Providers never see it unless you call them."
            value={phone}
            onChangeText={(v) => (setPhone(v), setErrors((e) => ({ ...e, phone: null })))}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="98765 43210"
            leadingIcon={<Phone size={18} color={theme.colors.text.tertiary} />}
          />
          <AppButton
            size="lg"
            fullWidth
            disabled={!dirty}
            loading={update.isPending}
            onPress={save}
          >
            Save changes
          </AppButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center" },
});
