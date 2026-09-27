import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Clock, LogOut, Search, Sparkles } from "lucide-react-native";

import {
  AppButton,
  AppPressable,
  AppSheet,
  AppSkeleton,
  AppText,
} from "@/components/design-system";
import { BrandMark, ErrorState, Screen } from "@/components/layout";
import { StartChoiceCard } from "@/components/onboarding/StartChoiceCard";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useLayout } from "@/hooks/useLayout";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";

/** First stop for a business account without a listing: claim an existing one or create a new one. */
export default function StartScreen() {
  const theme = useTheme();
  const { isTablet } = useLayout();
  const token = useAuthStore((s) => s.token);
  const session = useSession();
  const { signOut } = useAuthActions();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!token) return <Redirect href="/login" />;
  if (session.data?.state.provider) return <Redirect href="/" />;

  const firstName = session.data?.user.name.split(" ")[0];
  const pending = session.data?.state.claims.filter((c) => c.status === "pending") ?? [];

  const doSignOut = (): void => {
    setConfirmSignOut(false);
    signOut();
    router.replace("/login");
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={[styles.topBar, { paddingHorizontal: theme.spacing[4] }]}>
        <BrandMark size={32} />
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={10}
          onPress={() => setConfirmSignOut(true)}
          style={[styles.signOut, { gap: theme.spacing[1.5] }]}
        >
          <LogOut size={16} color={theme.colors.text.secondary} />
          <AppText
            variant="meta"
            tone="secondary"
            style={{ fontFamily: theme.typography.label.fontFamily }}
          >
            Sign out
          </AppText>
        </AppPressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingTop: theme.spacing[4],
          gap: theme.layout.sectionGap,
        }}
      >
        {session.isError ? (
          <ErrorState error={session.error} onRetry={() => void session.refetch()} />
        ) : null}

        <View style={{ gap: theme.spacing[2] }}>
          {session.isLoading ? (
            <AppSkeleton height={32} width="70%" />
          ) : (
            <AppText variant="title" accessibilityRole="header">
              {firstName ? `Welcome, ${firstName}` : "Welcome"}
            </AppText>
          )}
          <AppText tone="secondary">
            Your business may already be on DialNFind. Claim it to keep its reviews, or start fresh.
          </AppText>
        </View>

        {pending.length > 0 ? (
          <View
            style={[
              {
                gap: theme.spacing[1],
                padding: theme.spacing[3],
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.semantic.warningSoft,
              },
            ]}
          >
            <View style={styles.row}>
              <Clock size={16} color={theme.colors.semantic.warningText} />
              <AppText variant="label" tone="warning">
                Claim in progress
              </AppText>
            </View>
            {pending.map((c) => (
              <AppText key={c.id} variant="meta" tone="secondary">
                {`${c.provider.businessName}, ${c.provider.city}. ${
                  c.method === "document"
                    ? "Our team is reviewing your documents."
                    : "Start the claim again to get a new code."
                }`}
              </AppText>
            ))}
          </View>
        ) : null}

        <View style={[isTablet ? styles.grid : null, { gap: theme.spacing[3] }]}>
          <StartChoiceCard
            icon={<Search size={20} color={theme.colors.brand.primary} />}
            iconBackground={theme.colors.brand.soft}
            title="Claim my existing listing"
            text="Keep your reviews and ranking. Verify with a code sent to the listed number."
            cta="Find my business"
            onPress={() => router.push("/claim")}
            style={isTablet ? styles.card : null}
          />
          <StartChoiceCard
            icon={<Sparkles size={20} color={theme.colors.semantic.success} />}
            iconBackground={theme.colors.semantic.successSoft}
            title="Add a new business"
            badge="Free"
            text="Profile, services, areas and hours in five short steps."
            cta="Start setup"
            onPress={() => router.push("/onboarding")}
            style={isTablet ? styles.card : null}
          />
        </View>
      </ScrollView>

      <AppSheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)} title="Sign out?">
        <View style={{ gap: theme.spacing[2], paddingHorizontal: theme.spacing[4] }}>
          <AppText tone="secondary" style={{ marginBottom: theme.spacing[2] }}>
            You can sign back in any time to finish setting up your business.
          </AppText>
          <AppButton variant="destructive" fullWidth onPress={doSignOut}>
            Sign out
          </AppButton>
          <AppButton variant="ghost" fullWidth onPress={() => setConfirmSignOut(false)}>
            Cancel
          </AppButton>
        </View>
      </AppSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
  },
  signOut: { alignItems: "center", flexDirection: "row", minHeight: 44 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  grid: { flexDirection: "row" },
  card: { flex: 1 },
});
