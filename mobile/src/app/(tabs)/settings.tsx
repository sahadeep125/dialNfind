import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import {
  Bell,
  FileText,
  HelpCircle,
  LifeBuoy,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Phone,
  PhoneCall,
  ShieldCheck,
  Star,
  Store,
  Sun,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";

import {
  AppAvatar,
  AppButton,
  AppCallout,
  AppCard,
  AppIconTile,
  AppListGroup,
  AppListItem,
  AppSegmentedControl,
  AppSheet,
  AppText,
} from "@/components/design-system";
import { PasswordInput } from "@/components/auth";
import { BrandMark, Screen, TabHeader } from "@/components/layout";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/constants/config";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import { legalUrl, openEmail, openPhone, openUrl, openWebPage } from "@/services/links";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { rateApp } from "@/services/reviewPrompt";
import type { ThemePreference } from "@/types";
import { formatPhone } from "@/utils/format";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { gutter } = useLayout();
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

  // Accounts made with Google or Apple have no password to confirm with.
  const needsPassword = user?.hasPassword !== false;

  const submitDelete = (): void => {
    if (needsPassword && !password) {
      setPasswordError("Enter your password to confirm");
      return;
    }
    deleteAccount.mutate(needsPassword ? password : undefined, {
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
          paddingHorizontal: gutter,
          gap: theme.spacing[6],
          paddingBottom: theme.spacing[10],
        }}
      >
        <View style={{ marginHorizontal: -gutter }}>
          <TabHeader title="Settings" />
        </View>

        {user ? (
          <AppCard
            onPress={() => router.push("/profile")}
            accessibilityLabel="Your profile"
            padding={theme.spacing[4]}
          >
            <View style={[styles.profile, { gap: theme.spacing[4] }]}>
              <AppAvatar name={user.name} uri={user.profilePhotoUrl} size={60} />
              <View style={styles.flex}>
                <AppText variant="subheading" numberOfLines={1}>
                  {user.name}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {user.email}
                </AppText>
                {user.phone ? (
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {formatPhone(user.phone)}
                  </AppText>
                ) : null}
              </View>
            </View>
            <AppButton
              size="sm"
              variant="soft"
              icon={UserRound}
              onPress={() => router.push("/profile")}
              style={{ marginTop: theme.spacing[4] }}
            >
              Edit profile
            </AppButton>
          </AppCard>
        ) : (
          <AppCard variant="tinted" padding={theme.spacing[5]}>
            <View style={{ gap: theme.spacing[4] }}>
              <AppIconTile icon={LogIn} tone="surface" size={48} />
              <View style={{ gap: theme.spacing[1] }}>
                <AppText variant="heading">Sign in or create an account</AppText>
                <AppText tone="secondary">
                  Save favorites, review providers and get replies from them.
                </AppText>
              </View>
              <View style={[styles.row, { gap: theme.spacing[3] }]}>
                <AppButton style={styles.flex} onPress={() => router.push("/login")}>
                  Sign in
                </AppButton>
                <AppButton
                  style={styles.flex}
                  variant="secondary"
                  onPress={() => router.push("/register")}
                >
                  Create account
                </AppButton>
              </View>
            </View>
          </AppCard>
        )}

        {user ? (
          <AppListGroup title="Your activity">
            <AppListItem
              title="Saved addresses"
              subtitle="Search around home, work and more"
              leading={<MapPin size={18} color={icon} />}
              onPress={() => router.push("/addresses")}
            />
            <AppListItem
              title="Recent contacts"
              subtitle="Providers you called or messaged"
              leading={<PhoneCall size={18} color={icon} />}
              onPress={() => router.push("/contacts")}
            />
            <AppListItem
              title="Notifications"
              subtitle="Replies to your reviews and support updates"
              leading={<Bell size={18} color={icon} />}
              onPress={() => router.push("/notifications")}
            />
            <AppListItem
              title="Support requests"
              subtitle="Ask the DialNFind team and follow the replies"
              leading={<LifeBuoy size={18} color={icon} />}
              onPress={() => router.push("/support")}
            />
          </AppListGroup>
        ) : null}

        <View style={{ gap: theme.spacing[2] }}>
          <AppText
            variant="overline"
            tone="tertiary"
            accessibilityRole="header"
            style={{ paddingHorizontal: theme.spacing[1], textTransform: "uppercase" }}
          >
            Appearance
          </AppText>
          <AppSegmentedControl
            accessibilityLabel="Appearance"
            options={THEME_OPTIONS}
            value={preference}
            onChange={setPreference}
          />
        </View>

        <AppListGroup title="Help and support">
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
            title="Own a business?"
            subtitle="List it on DialNFind for free, or claim your listing"
            leading={<Store size={18} color={icon} />}
            onPress={() => void run(() => openWebPage("/claim"), "Could not open the page.")}
          />
          <AppListItem
            title="Rate DialNFind"
            subtitle="Tell us how we are doing"
            leading={<Star size={18} color={icon} />}
            onPress={() => void run(rateApp, "Could not open the store.")}
          />
        </AppListGroup>

        <AppListGroup title="Legal">
          <AppListItem
            title="Terms of use"
            leading={<FileText size={18} color={icon} />}
            onPress={() =>
              void run(
                () => openUrl(legalUrl("terms", config?.terms_url)),
                "Could not open the page.",
              )
            }
          />
          <AppListItem
            title="Privacy policy"
            leading={<ShieldCheck size={18} color={icon} />}
            onPress={() =>
              void run(
                () => openUrl(legalUrl("privacy", config?.privacy_url)),
                "Could not open the page.",
              )
            }
          />
        </AppListGroup>

        {user ? (
          <AppListGroup title="Account">
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
          </AppListGroup>
        ) : null}

        <View style={[styles.footer, { gap: theme.spacing[2] }]}>
          <BrandMark size={28} />
          <AppText variant="caption" tone="tertiary" align="center">
            DialNFind {version}
          </AppText>
        </View>
      </ScrollView>

      <AppSheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)} title="Sign out?">
        <View style={{ gap: theme.spacing[5] }}>
          <AppText tone="secondary">
            You can keep browsing and calling providers without an account.
          </AppText>
          <View style={[styles.row, { gap: theme.spacing[3] }]}>
            <AppButton
              variant="secondary"
              style={styles.flex}
              onPress={() => setConfirmSignOut(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              style={styles.flex}
              icon={LogOut}
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
        <View style={{ gap: theme.spacing[5] }}>
          <AppCallout tone="danger">
            Your profile, favorites and reviews will be removed. This cannot be undone.
          </AppCallout>
          {needsPassword ? (
            <PasswordInput
              label="Password"
              value={password}
              onChangeText={(v) => (setPassword(v), setPasswordError(null))}
              error={passwordError}
              placeholder="Enter your password"
              onSubmitEditing={submitDelete}
            />
          ) : null}
          <View style={[styles.row, { gap: theme.spacing[3] }]}>
            <AppButton variant="secondary" style={styles.flex} onPress={() => setDeleting(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="destructive"
              icon={Trash2}
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
  profile: { alignItems: "center", flexDirection: "row" },
  row: { flexDirection: "row" },
  flex: { flex: 1 },
  footer: { alignItems: "center", opacity: 0.8, paddingTop: 8 },
});
