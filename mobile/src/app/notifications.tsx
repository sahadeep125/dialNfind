import { useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { router } from "expo-router";
import { BellOff } from "lucide-react-native";

import { AppButton, AppDivider } from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { routeForNotification } from "@/components/layout/PushRegistrar";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { NotificationRowSkeleton } from "@/components/notifications/NotificationRowSkeleton";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { AppNotification } from "@/types/notifications";

export default function NotificationsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { data, error, isLoading, isError, isRefetching, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const { mutate } = markRead;
  const unread = data?.unread ?? 0;

  const onPress = useCallback(
    (n: AppNotification) => {
      if (!n.isRead) mutate([n.id], { onError: (e: Error) => toast(errorMessage(e), "error") });
      const target = routeForNotification({ ...(n.dataJson as object | null), type: n.type });
      if (target !== "/notifications") router.push(target);
    },
    [mutate, toast],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => (
      <NotificationRow notification={item} onPress={onPress} />
    ),
    [onPress],
  );

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : undefined}
        right={
          unread ? (
            <AppButton
              variant="ghost"
              size="sm"
              disabled={markRead.isPending}
              onPress={() =>
                mutate(undefined, { onError: (e: Error) => toast(errorMessage(e), "error") })
              }
            >
              Mark all read
            </AppButton>
          ) : undefined
        }
      />
      <FlatList
        data={isLoading || isError ? [] : (data?.notifications ?? [])}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={AppDivider}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          isLoading ? (
            <View>
              <NotificationRowSkeleton />
              <NotificationRowSkeleton />
              <NotificationRowSkeleton />
            </View>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <EmptyState
              icon={BellOff}
              title="No notifications"
              text="Replies to your reviews and updates on your support requests will show up here."
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
});
