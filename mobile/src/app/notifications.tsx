import { useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { router } from "expo-router";
import { BellOff, CheckCheck } from "lucide-react-native";

import { AppButton, AppDivider } from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { routeForNotification } from "@/components/layout/PushRegistrar";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { NotificationRowSkeleton } from "@/components/notifications/NotificationRowSkeleton";
import { useLayout } from "@/hooks/useLayout";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { AppNotification } from "@/types/notifications";

export default function NotificationsScreen() {
  const theme = useTheme();
  const { gutter } = useLayout();
  const toast = useToast();
  const { data, error, isLoading, isError, isRefetching, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const { mutate } = markRead;
  const unread = data?.unread ?? 0;
  const items = isLoading || isError ? [] : (data?.notifications ?? []);
  const last = items.length - 1;

  const onPress = useCallback(
    (n: AppNotification) => {
      if (!n.isRead) mutate([n.id], { onError: (e: Error) => toast(errorMessage(e), "error") });
      const target = routeForNotification({ ...(n.dataJson as object | null), type: n.type });
      if (target !== "/notifications") router.push(target);
    },
    [mutate, toast],
  );

  // Rows share one rounded surface: the first rounds its top corners, the last its bottom ones.
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<AppNotification>) => {
      const r = theme.components.card.radius;
      return (
        <View
          style={[
            styles.cell,
            {
              backgroundColor: theme.colors.background.elevated,
              borderTopLeftRadius: index === 0 ? r : 0,
              borderTopRightRadius: index === 0 ? r : 0,
              borderBottomLeftRadius: index === last ? r : 0,
              borderBottomRightRadius: index === last ? r : 0,
            },
          ]}
        >
          {index > 0 ? <AppDivider inset={74} /> : null}
          <NotificationRow notification={item} onPress={onPress} />
        </View>
      );
    },
    [onPress, theme, last],
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
              icon={CheckCheck}
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
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingTop: theme.spacing[2] },
        ]}
        ListEmptyComponent={
          isLoading ? (
            <View
              style={[
                styles.cell,
                {
                  backgroundColor: theme.colors.background.elevated,
                  borderRadius: theme.components.card.radius,
                },
              ]}
            >
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
  cell: { borderCurve: "continuous", overflow: "hidden" },
});
