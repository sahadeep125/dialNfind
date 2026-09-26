import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LifeBuoy, Plus } from "lucide-react-native";

import { AppButton, AppIconButton, AppSkeleton, AppText } from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { NewTicketSheet } from "@/components/support/NewTicketSheet";
import { TicketRow } from "@/components/support/TicketRow";
import { useTickets } from "@/hooks/useSupport";
import { useTheme } from "@/hooks/useTheme";
import type { Ticket } from "@/types/support";

export default function SupportScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ new?: string }>();
  const tickets = useTickets();
  const [creating, setCreating] = useState(params.new === "1");
  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo(() => tickets.data?.pages.flatMap((p) => p.tickets) ?? [], [tickets.data]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await tickets.refetch();
    setRefreshing(false);
  };

  const onOpen = useCallback((id: number): void => router.push(`/support/${id}`), []);
  const renderItem = useCallback(
    ({ item }: { item: Ticket }) => <TicketRow ticket={item} onOpen={onOpen} />,
    [onOpen],
  );

  const onCreated = (ticket: Ticket): void => {
    setCreating(false);
    router.push(`/support/${ticket.id}`);
  };

  const plusColor = theme.components.button.primary.text;

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title="Support"
        right={
          <AppIconButton
            accessibilityLabel="New request"
            variant="soft"
            icon={<Plus size={20} color={theme.colors.brand.softText} />}
            onPress={() => setCreating(true)}
          />
        }
      />
      {tickets.isError && !tickets.data ? (
        <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} />
      ) : !tickets.data ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          {[0, 1, 2, 3].map((i) => (
            <AppSkeleton key={i} shape="block" height={88} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: theme.spacing[4],
            gap: theme.spacing[3],
            paddingBottom: theme.spacing[10],
            flexGrow: 1,
          }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (tickets.hasNextPage && !tickets.isFetchingNextPage) void tickets.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.colors.brand.primary}
            />
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <AppText tone="secondary" style={styles.intro}>
                Ask the DialNFind team about your account, a provider or anything else. We usually
                reply within one working day.
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={LifeBuoy}
              title="No requests yet"
              text="When you contact support, your conversations with the team appear here."
              action={
                <AppButton
                  leadingIcon={<Plus size={18} color={plusColor} />}
                  onPress={() => setCreating(true)}
                >
                  Contact support
                </AppButton>
              }
            />
          }
          ListFooterComponent={
            tickets.isFetchingNextPage ? (
              <ActivityIndicator color={theme.colors.brand.primary} />
            ) : null
          }
        />
      )}
      <NewTicketSheet visible={creating} onClose={() => setCreating(false)} onCreated={onCreated} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 4 },
});
