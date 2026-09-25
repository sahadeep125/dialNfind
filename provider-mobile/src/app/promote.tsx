import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Megaphone, Plus } from "lucide-react-native";

import { AppButton, AppCallout, AppSkeleton, AppText } from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { CampaignCard } from "@/components/promote/CampaignCard";
import { NewCampaignSheet } from "@/components/promote/NewCampaignSheet";
import { LockedCard } from "@/components/subscription/LockedCard";
import { useSponsored, useToggleCampaign } from "@/hooks/useSponsored";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { Campaign } from "@/types/billing";

export default function PromoteScreen() {
  const theme = useTheme();
  const toast = useToast();
  const sponsored = useSponsored();
  const toggle = useToggleCampaign();
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const data = sponsored.data;

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await sponsored.refetch();
    setRefreshing(false);
  }, [sponsored]);

  const onToggle = useCallback(
    (campaign: Campaign): void => {
      toggle.mutate(campaign, {
        onSuccess: () =>
          toast(campaign.status === "active" ? "Campaign paused" : "Campaign resumed", "success"),
        onError: (error: Error) => toast(errorMessage(error), "error"),
      });
    },
    [toggle, toast],
  );

  const renderItem = useCallback(
    ({ item }: { item: Campaign }) => (
      <CampaignCard
        campaign={item}
        onToggle={onToggle}
        busy={toggle.isPending && toggle.variables?.id === item.id}
      />
    ),
    [onToggle, toggle.isPending, toggle.variables],
  );

  const canStart = !!data && data.categories.length > 0;
  const plusColor = theme.components.button.primary.text;

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Promote" />
      {sponsored.isError && !data ? (
        <ErrorState error={sponsored.error} onRetry={() => void sponsored.refetch()} />
      ) : !data ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
          <AppSkeleton height={20} width="70%" />
          <AppSkeleton height={48} />
          <AppSkeleton shape="block" height={180} />
          <AppSkeleton shape="block" height={180} />
        </View>
      ) : (
        <FlatList
          data={data.listings}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: theme.spacing[4],
            gap: theme.spacing[4],
            paddingBottom: theme.spacing[10],
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.colors.brand.primary}
            />
          }
          ListHeaderComponent={
            <View style={[styles.header, { gap: theme.spacing[4] }]}>
              <View style={{ gap: theme.spacing[1] }}>
                <AppText variant="title" accessibilityRole="header">
                  Promote your business
                </AppText>
                <AppText tone="secondary">
                  Appear with a Sponsored label when customers in {data.pricing.city} search your
                  category. You pay only when a customer calls or messages you.
                </AppText>
              </View>
              {data.locked ? (
                <LockedCard feature="promote" />
              ) : canStart ? (
                <AppButton
                  fullWidth
                  leadingIcon={<Plus size={18} color={plusColor} />}
                  onPress={() => setCreating(true)}
                >
                  Request a campaign
                </AppButton>
              ) : (
                <AppCallout title="Add a service first">
                  You can promote any category you offer.
                </AppCallout>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={Megaphone}
              title="No campaigns yet"
              text="Request a campaign to reach more customers searching for your services."
            />
          }
        />
      )}
      {data && canStart && !data.locked ? (
        <NewCampaignSheet
          visible={creating}
          onClose={() => setCreating(false)}
          categories={data.categories}
          pricing={data.pricing}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 4 },
});
