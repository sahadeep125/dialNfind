import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import { AppCard, AppSection, AppSkeleton } from "@/components/design-system";
import { ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { VerificationCard } from "@/components/verification/VerificationCard";
import { VerificationStatusCard } from "@/components/verification/VerificationStatusCard";
import { VERIFICATION_TYPES } from "@/components/verification/verificationTypes";
import { useTheme } from "@/hooks/useTheme";
import { useVerifications } from "@/hooks/useVerifications";

export default function VerificationScreen() {
  const theme = useTheme();
  const query = useVerifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Verification" subtitle="Earn the verified badge" />
      {query.data ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: theme.layout.screenPadding,
            paddingTop: theme.spacing[1],
            gap: theme.layout.sectionGap,
            paddingBottom: theme.spacing[10],
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.colors.brand.primary}
            />
          }
        >
          <VerificationStatusCard status={query.data.verificationStatus} />
          <AppSection title="Documents" subtitle="Each one you add builds more trust" kind="plain">
            <View style={{ gap: theme.spacing[2.5] }}>
              {VERIFICATION_TYPES.map((info) => (
                <VerificationCard
                  key={info.type}
                  info={info}
                  // Newest first from the API, so the first match is the latest submission.
                  latest={query.data.verifications.find((v) => v.type === info.type)}
                />
              ))}
            </View>
          </AppSection>
        </ScrollView>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <View style={{ padding: theme.layout.screenPadding, gap: theme.spacing[3] }}>
          {[0, 1, 2].map((i) => (
            <AppCard key={i}>
              <View style={{ gap: theme.spacing[3] }}>
                <AppSkeleton width="50%" height={18} />
                <AppSkeleton height={12} />
                <AppSkeleton width="80%" height={12} />
              </View>
            </AppCard>
          ))}
        </View>
      )}
    </Screen>
  );
}
