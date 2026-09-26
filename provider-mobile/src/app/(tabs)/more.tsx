import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";
import {
  BadgeCheck,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  HelpCircle,
  Images,
  LifeBuoy,
  LogOut,
  MapPin,
  Megaphone,
  ShieldCheck,
  Star,
  Store,
  UserCog,
  UserX,
  Wrench,
} from "lucide-react-native";

import { AppListItem, AppSkeleton, AppText } from "@/components/design-system";
import { AppSegmented } from "@/components/forms";
import { Screen } from "@/components/layout";
import { BusinessHeader } from "@/components/more/BusinessHeader";
import { DeleteAccountSheet } from "@/components/more/DeleteAccountSheet";
import { MoreGroup } from "@/components/more/MoreGroup";
import { PushAlertsRow } from "@/components/more/PushAlertsRow";
import { SignOutSheet } from "@/components/more/SignOutSheet";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { usePlan } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openUrl } from "@/services/links";
import { WEB_URL } from "@/constants/config";
import { useThemeStore } from "@/stores/useThemeStore";
import type { SelectOption, ThemePreference } from "@/types";

const THEME_OPTIONS: SelectOption<ThemePreference>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Shows the native in-app rating prompt. The OS decides whether it appears (it is rate-limited), so when
 * it cannot, the store listing opens instead: `ios.appStoreUrl` / `android.playStoreUrl` in app.json.
 */
async function rateApp(): Promise<void> {
  if (await StoreReview.hasAction()) {
    await StoreReview.requestReview();
    return;
  }
  const url = StoreReview.storeUrl();
  if (url) {
    await openUrl(url);
    return;
  }
  // No App Store id configured yet on iOS: fall back to a store search.
  await openUrl(Platform.OS === "ios" ? "https://apps.apple.com/search?term=DialNFind%20Business" : "https://play.google.com/store/search?q=DialNFind%20Business");
}

export default function MoreScreen() {
  const theme = useTheme();
  const toast = useToast();
  const session = useSession();
  const profile = useProfile();
  const plan = usePlan();
  const { signOut } = useAuthActions();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const provider = session.data?.state.provider ?? null;
  const user = session.data?.user;
  const businessName = provider?.businessName ?? profile.data?.businessName ?? "Your business";
  const icon = theme.colors.brand.primary;
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const rate = async (): Promise<void> => {
    try {
      await rateApp();
    } catch (error: unknown) {
      toast(`Could not open the store. ${errorMessage(error)}`, "error");
    }
  };

  const doSignOut = (): void => {
    setConfirmSignOut(false);
    signOut();
    router.replace("/login");
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
          More
        </AppText>

        {provider ? (
          <BusinessHeader
            name={businessName}
            logoUrl={profile.data?.logoUrl ?? null}
            status={provider.status}
            verification={provider.verificationStatus}
            email={user?.email}
            onPress={() => router.push("/profile")}
          />
        ) : (
          <AppSkeleton shape="block" height={88} />
        )}

        <MoreGroup title="Business">
          <AppListItem
            title="Edit profile"
            subtitle={
              provider ? `${provider.profileCompletenessPct}% complete` : "Name, contact, photos"
            }
            leading={<Store size={18} color={icon} />}
            onPress={() => router.push("/profile")}
          />
          <AppListItem
            title="Services"
            leading={<Wrench size={18} color={icon} />}
            onPress={() => router.push("/services")}
          />
          <AppListItem
            title="Hours"
            leading={<Clock size={18} color={icon} />}
            onPress={() => router.push("/hours")}
          />
          <AppListItem
            title="Service areas"
            leading={<MapPin size={18} color={icon} />}
            onPress={() => router.push("/areas")}
          />
          {provider?.slug ? (
            <AppListItem
              title="View public listing"
              subtitle="See your page as customers do"
              leading={<ExternalLink size={18} color={icon} />}
              onPress={() => void openUrl(`${WEB_URL}/providers/${provider.slug}`)}
            />
          ) : null}
          <AppListItem
            title="Portfolio"
            leading={<Images size={18} color={icon} />}
            onPress={() => router.push("/portfolio")}
          />
          <AppListItem
            title="Verification"
            value={
              provider?.verificationStatus === "verified"
                ? "Verified"
                : provider?.verificationStatus === "partial"
                  ? "Partly"
                  : undefined
            }
            leading={<BadgeCheck size={18} color={icon} />}
            onPress={() => router.push("/verification")}
          />
        </MoreGroup>

        <MoreGroup title="Grow">
          <AppListItem
            title="Promote"
            subtitle="Sponsored campaigns in search"
            value={plan.features.promote ? undefined : "Business"}
            leading={<Megaphone size={18} color={icon} />}
            onPress={() => router.push("/promote")}
          />
          <AppListItem
            title="Plan and billing"
            subtitle={plan.plan.code === "free" ? "Upgrade for unlimited leads and analytics" : "Your plan, invoices and payments"}
            value={plan.plan.name}
            leading={<CreditCard size={18} color={icon} />}
            onPress={() => router.push("/subscription")}
          />
        </MoreGroup>

        <MoreGroup title="Help">
          <AppListItem
            title="Support requests"
            subtitle="Talk to the DialNFind team"
            leading={<LifeBuoy size={18} color={icon} />}
            onPress={() => router.push("/support")}
          />
          <AppListItem
            title="Help and FAQ"
            leading={<HelpCircle size={18} color={icon} />}
            onPress={() => router.push("/help")}
          />
          <AppListItem
            title="Rate the app"
            subtitle="Tell us how we are doing"
            leading={<Star size={18} color={icon} />}
            onPress={() => void rate()}
          />
        </MoreGroup>

        <View style={{ gap: theme.spacing[2] }}>
          <AppText
            variant="overline"
            tone="tertiary"
            accessibilityRole="header"
            style={{ paddingHorizontal: theme.spacing[1] }}
          >
            Appearance
          </AppText>
          <AppSegmented
            accessibilityLabel="Theme"
            options={THEME_OPTIONS}
            value={preference}
            onChange={setPreference}
          />
        </View>

        <MoreGroup title="Legal">
          <AppListItem
            title="Terms for businesses"
            leading={<FileText size={18} color={icon} />}
            onPress={() => router.push("/legal/terms")}
          />
          <AppListItem
            title="Privacy"
            leading={<ShieldCheck size={18} color={icon} />}
            onPress={() => router.push("/legal/privacy")}
          />
        </MoreGroup>

        <MoreGroup title="Notifications">
          <PushAlertsRow />
        </MoreGroup>

        <MoreGroup title="Account">
          <AppListItem
            title="Account settings"
            subtitle="Name, phone and password"
            leading={<UserCog size={18} color={icon} />}
            onPress={() => router.push("/account")}
          />
          <AppListItem
            title="Sign out"
            subtitle={user?.email}
            leading={<LogOut size={18} color={icon} />}
            onPress={() => setConfirmSignOut(true)}
            showChevron={false}
          />
          <AppListItem
            title="Delete account"
            subtitle="Remove your listing and erase your account"
            destructive
            leading={<UserX size={18} color={theme.colors.semantic.danger} />}
            onPress={() => setDeleting(true)}
            showChevron={false}
          />
        </MoreGroup>

        <AppText variant="caption" tone="tertiary" align="center">
          DialNFind Business {version}
        </AppText>
      </ScrollView>

      <SignOutSheet
        visible={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={doSignOut}
      />
      <DeleteAccountSheet
        visible={deleting}
        onClose={() => setDeleting(false)}
        businessName={businessName}
        hasPassword={user?.hasPassword ?? true}
      />
    </Screen>
  );
}
