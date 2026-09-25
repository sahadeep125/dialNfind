import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import {
  FileText,
  HelpCircle,
  LogIn,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Phone,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react-native";

import {
  AppAvatar,
  AppButton,
  AppChip,
  AppListItem,
  AppSheet,
  AppText,
} from "@/components/design-system";
import { PasswordInput, VerifyEmailCallout } from "@/components/auth";
import { Screen } from "@/components/layout";
import { SettingsGroup } from "@/components/settings";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/constants/config";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import { openEmail, openPhone, openUrl } from "@/services/links";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import type { ThemePreference } from "@/types";
import { formatPhone } from "@/utils/format";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const { signOut } = useAuthActions();
  const deleteAccount = useDeleteAccount();
  const { data: config } = useAppConfig();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const email = config?.support_email || SUPPORT_EMAIL;
  const phone = config?.support_phone || SUPPORT_PHONE;
  const icon = theme.colors.brand.primary;
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const run = async (action: () => Promise<void>, failure: string): Promise<void> => {
    try {
      await action();
    } catch (error: unknown) {
      toast(`${failure} ${errorMessage(error)}`, "error");
    }
  };

  const submitDelete = (): void => {
    if (!password) {
      setPasswordError("Enter your password to confirm");
      return;
    }
    deleteAccount.mutate(password, {
      onSuccess: () => {
        setDeleting(false);
        setPassword("");
        toast("Your account has been deleted", "success");
      },
      onError: (error: Error) => {
        if (error instanceof ApiError && error.status === 400) setPasswordError(error.message);
        else toast(errorMessage(error), "error");
      },
    });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing[4],
          gap: theme.spacing[6],
          paddingBottom: theme.spacing[10],
        }}
      >
        <AppText variant="title" accessibilityRole="header">
          Settings
        </AppText>

        <VerifyEmailCallout />

        <SettingsGroup title="Account">
          {user ? (
            <AppListItem
              title={user.name}
              subtitle={[user.email, user.phone ? formatPhone(user.phone) : null]
                .filter(Boolean)
                .join(" · ")}
              leading={<AppAvatar name={user.name} uri={user.profilePhotoUrl} size={34} />}
              onPress={() => router.push("/profile")}
            />
          ) : (
            <AppListItem
              title="Sign in or create an account"
              subtitle="Save favorites and review providers"
              leading={<LogIn size={18} color={icon} />}
              onPress={() => router.push("/login")}
            />
          )}
          {user ? (
            <AppListItem
              title="Edit profile"
              leading={<UserRound size={18} color={icon} />}
              onPress={() => router.push("/profile")}
            />
          ) : null}
        </SettingsGroup>

        <View style={{ gap: theme.spacing[2] }}>
          <AppText
            variant="overline"
            tone="tertiary"
            style={{ paddingHorizontal: theme.spacing[1] }}
          >
            Appearance
          </AppText>
          <View style={styles.chips}>
            {THEME_OPTIONS.map((o) => {
              const Icon = o.icon;
              const selected = preference === o.value;
              return (
                <AppChip
                  key={o.value}
                  label={o.label}
                  selected={selected}
                  onPress={() => setPreference(o.value)}
                  leadingIcon={
                    <Icon
                      size={15}
                      color={selected ? theme.colors.brand.softText : theme.colors.text.secondary}
                    />
                  }
                />
              );
            })}
          </View>
        </View>

        <SettingsGroup title="Help and support">
          <AppListItem
            title="Help centre"
            subtitle="Answers to common questions"
            leading={<HelpCircle size={18} color={icon} />}
            onPress={() => router.push("/help")}
          />
          <AppListItem
            title="Email support"
            subtitle={email}
            leading={<Mail size={18} color={icon} />}
            onPress={() =>
              void run(() => openEmail(email, "DialNFind app support"), "Could not open email.")
            }
          />
          <AppListItem
            title="Call support"
            subtitle={
              config?.support_hours
                ? `${formatPhone(phone)} · ${config.support_hours}`
                : formatPhone(phone)
            }
            leading={<Phone size={18} color={icon} />}
            onPress={() => void run(() => openPhone(phone), "Calling is not available.")}
          />
          <AppListItem
            title="Rate DialNFind"
            subtitle="Tell us how we are doing"
            leading={<Star size={18} color={icon} />}
            onPress={() =>
              void run(
                () => openEmail(email, "Feedback on the DialNFind app"),
                "Could not open email.",
              )
            }
          />
        </SettingsGroup>

        {config?.terms_url || config?.privacy_url ? (
          <SettingsGroup title="Legal">
            {config.terms_url ? (
              <AppListItem
                title="Terms of service"
                leading={<FileText size={18} color={icon} />}
                onPress={() =>
                  void run(() => openUrl(config.terms_url ?? ""), "Could not open the page.")
                }
              />
            ) : null}
            {config.privacy_url ? (
              <AppListItem
                title="Privacy policy"
                leading={<ShieldCheck size={18} color={icon} />}
                onPress={() =>
                  void run(() => openUrl(config.privacy_url ?? ""), "Could not open the page.")
                }
              />
            ) : null}
          </SettingsGroup>
        ) : null}

        {user ? (
          <SettingsGroup>
            <AppListItem
              title="Sign out"
              leading={<LogOut size={18} color={icon} />}
              onPress={() => setConfirmSignOut(true)}
              showChevron={false}
            />
            {user.role === "customer" ? (
              <AppListItem
                title="Delete account"
                destructive
                leading={<Trash2 size={18} color={theme.colors.semantic.danger} />}
                onPress={() => setDeleting(true)}
                showChevron={false}
              />
            ) : null}
          </SettingsGroup>
        ) : null}

        <AppText variant="caption" tone="tertiary" align="center">
          DialNFind {version}
        </AppText>
      </ScrollView>

      <AppSheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)} title="Sign out?">
        <View style={{ gap: theme.spacing[4] }}>
          <AppText tone="secondary">
            You can keep browsing and calling providers without an account.
          </AppText>
          <View style={styles.row}>
            <AppButton
              variant="secondary"
              style={styles.flex}
              onPress={() => setConfirmSignOut(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              style={styles.flex}
              onPress={() => {
                setConfirmSignOut(false);
                signOut();
                toast("Signed out", "info");
              }}
            >
              Sign out
            </AppButton>
          </View>
        </View>
      </AppSheet>

      <AppSheet visible={deleting} onClose={() => setDeleting(false)} title="Delete your account?">
        <View style={{ gap: theme.spacing[4] }}>
          <AppText tone="secondary">
            Your profile, favorites and reviews will be removed. This cannot be undone.
          </AppText>
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={(v) => (setPassword(v), setPasswordError(null))}
            error={passwordError}
            placeholder="Enter your password"
            onSubmitEditing={submitDelete}
          />
          <View style={styles.row}>
            <AppButton variant="secondary" style={styles.flex} onPress={() => setDeleting(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="destructive"
              style={styles.flex}
              loading={deleteAccount.isPending}
              onPress={submitDelete}
            >
              Delete account
            </AppButton>
          </View>
        </View>
      </AppSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
