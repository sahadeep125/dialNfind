import { useState } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";
import {
  BadgeCheck,
  Check,
  Moon,
  Plus,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  Images,
  LifeBuoy,
  LogOut,
  MapPin,
  ShieldCheck,
  Star,
  Store,
  UserCog,
  UserX,
  Wrench,
} from "lucide-react-native";

import {
  AppListItem,
  AppSection,
  AppSheet,
  AppSkeleton,
  AppText,
} from "@/components/design-system";
import { Screen, ScreenHeader, ScreenScroll } from "@/components/layout";
import { BusinessHeader } from "@/components/more/BusinessHeader";
import { DeleteAccountSheet } from "@/components/more/DeleteAccountSheet";
import { PushAlertsRow } from "@/components/more/PushAlertsRow";
import { SignOutSheet } from "@/components/more/SignOutSheet";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useSwitchListing } from "@/hooks/useListings";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openPublicProfile, openUrl } from "@/services/links";
import { useThemeStore } from "@/stores/useThemeStore";
import type { SelectOption, ThemePreference } from "@/types";
import { listingTitle } from "@/utils/accountType";

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
  await openUrl(
    Platform.OS === "ios"
      ? "https://apps.apple.com/search?term=KaajVa%20Business"
      : "https://play.google.com/store/search?q=KaajVa%20Business",
  );
}

export default function MoreScreen() {
  const theme = useTheme();
  const toast = useToast();
  const session = useSession();
  const profile = useProfile();
  const { signOut } = useAuthActions();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickingTheme, setPickingTheme] = useState(false);

  const switchListing = useSwitchListing();
  const provider = session.data?.state.provider ?? null;
  const listings = session.data?.state.listings ?? [];
  const current = listings.find((l) => l.id === provider?.id);
  const individual = current?.businessType === "individual";
  // An individual professional has one listing per profession and can add more.
  const canAdd = session.data?.state.accountType === "individual" && !!session.data?.state.canAddListing;
  const pick = async (id: number): Promise<void> => {
    if (id === provider?.id) return;
    await switchListing(id);
    toast("Switched listing", "success");
  };
  const user = session.data?.user;
  const businessName = provider?.businessName ?? profile.data?.businessName ?? "Your business";
  const icon = theme.colors.text.secondary;
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

  const verification =
    provider?.verificationStatus === "verified"
      ? "Verified"
      : provider?.verificationStatus === "partial"
        ? "Partly"
        : "Not yet";

  return (
    <Screen>
      <ScreenHeader variant="large" title="More" />
      <ScreenScroll>
        {provider ? (
          <BusinessHeader
            name={businessName}
            logoUrl={profile.data?.logoUrl ?? null}
            status={provider.status}
            verification={provider.verificationStatus}
            email={user?.email}
            type={current?.businessType}
            subtitle={
              current
                ? [individual ? current.professionLabel : current.primaryCategory?.name, current.locality?.trim() || current.city]
                    .filter(Boolean)
                    .join(" – ")
                : null
            }
            completeness={provider.profileCompletenessPct}
            onPress={() => router.push("/profile")}
          />
        ) : (
          <AppSkeleton shape="block" height={84} />
        )}

        {listings.length > 1 || canAdd ? (
          <AppSection title={individual ? "Your professions" : "Your listings"}>
            {listings.map((l) => (
              <AppListItem
                key={l.id}
                title={listingTitle(l)}
                subtitle={l.id === provider?.id ? "Editing now" : l.status === "pending" ? "In review" : undefined}
                leading={l.id === provider?.id ? <Check size={16} color={theme.colors.brand.primary} /> : <Store size={16} color={icon} />}
                accent={l.id === provider?.id}
                onPress={() => void pick(l.id)}
              />
            ))}
            {canAdd ? (
              <AppListItem
                title="Add another profession"
                subtitle="A separate listing under your name"
                leading={<Plus size={16} color={theme.colors.brand.primary} />}
                accent
                onPress={() => router.push("/onboarding?add=1")}
              />
            ) : null}
          </AppSection>
        ) : null}

        <AppSection title="Your listing">
          <AppListItem
            title={individual ? "Profile details" : "Business details"}
            subtitle="Name, about, contact, photos"
            leading={<Store size={16} color={icon} />}
            onPress={() => router.push("/profile")}
          />
          <AppListItem
            title="Services and prices"
            leading={<Wrench size={16} color={icon} />}
            onPress={() => router.push("/services")}
          />
          <AppListItem
            title="Working hours"
            leading={<Clock size={16} color={icon} />}
            onPress={() => router.push("/hours")}
          />
          <AppListItem
            title="Service areas"
            leading={<MapPin size={16} color={icon} />}
            onPress={() => router.push("/areas")}
          />
          <AppListItem
            title="Photos of your work"
            leading={<Images size={16} color={icon} />}
            onPress={() => router.push("/portfolio")}
          />
          <AppListItem
            title="Verification"
            value={verification}
            accent={provider?.verificationStatus !== "verified"}
            leading={
              <BadgeCheck
                size={16}
                color={
                  provider?.verificationStatus !== "verified" ? theme.colors.brand.primary : icon
                }
              />
            }
            onPress={() => router.push("/verification")}
          />
          {provider?.slug ? (
            <AppListItem
              title="View public page"
              leading={<ExternalLink size={16} color={icon} />}
              onPress={() =>
                void openPublicProfile(provider.slug, provider.status).catch((e: unknown) => toast(errorMessage(e), "error"))
              }
            />
          ) : null}
        </AppSection>


        <AppSection title="Preferences">
          <PushAlertsRow />
          <AppListItem
            title="Appearance"
            value={THEME_OPTIONS.find((o) => o.value === preference)?.label}
            leading={<Moon size={16} color={icon} />}
            onPress={() => setPickingTheme(true)}
          />
        </AppSection>

        <AppSection title="Help">
          <AppListItem
            title="Support requests"
            leading={<LifeBuoy size={16} color={icon} />}
            onPress={() => router.push("/support")}
          />
          <AppListItem
            title="Help and FAQ"
            leading={<HelpCircle size={16} color={icon} />}
            onPress={() => router.push("/help")}
          />
          <AppListItem
            title="Rate the app"
            leading={<Star size={16} color={icon} />}
            onPress={() => void rate()}
          />
        </AppSection>

        <AppSection title="Legal">
          <AppListItem
            title="Terms for businesses"
            leading={<FileText size={16} color={icon} />}
            onPress={() => router.push("/legal/terms")}
          />
          <AppListItem
            title="Privacy"
            leading={<ShieldCheck size={16} color={icon} />}
            onPress={() => router.push("/legal/privacy")}
          />
        </AppSection>

        <AppSection title="Account">
          <AppListItem
            title="Account settings"
            subtitle="Name, phone and password"
            leading={<UserCog size={16} color={icon} />}
            onPress={() => router.push("/account")}
          />
          <AppListItem
            title="Sign out"
            subtitle={user?.email}
            leading={<LogOut size={16} color={icon} />}
            onPress={() => setConfirmSignOut(true)}
            showChevron={false}
          />
          <AppListItem
            title="Delete account"
            destructive
            leading={<UserX size={16} color={theme.colors.semantic.danger} />}
            onPress={() => setDeleting(true)}
            showChevron={false}
          />
        </AppSection>

        <AppText variant="meta" align="center">
          KaajVa Business {version}
        </AppText>
      </ScreenScroll>

      <AppSheet visible={pickingTheme} onClose={() => setPickingTheme(false)} title="Appearance">
        <View style={{ paddingHorizontal: theme.spacing[4] }}>
          <AppSection dividerInset={14}>
            {THEME_OPTIONS.map((o) => (
              <AppListItem
                key={o.value}
                title={o.label}
                subtitle={o.value === "system" ? "Match your phone's setting" : undefined}
                showChevron={false}
                trailing={
                  preference === o.value ? (
                    <Check size={16} color={theme.colors.brand.primary} />
                  ) : undefined
                }
                onPress={() => {
                  setPreference(o.value);
                  setPickingTheme(false);
                }}
              />
            ))}
          </AppSection>
        </View>
      </AppSheet>
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
