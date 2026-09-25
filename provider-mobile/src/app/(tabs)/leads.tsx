import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { PhoneIncoming } from "lucide-react-native";

import { AppChip, AppText } from "@/components/design-system";
import { EmptyState, ErrorState, Screen } from "@/components/layout";
import { LeadRow } from "@/components/leads/LeadRow";
import { LeadRowSkeleton } from "@/components/leads/LeadRowSkeleton";
import { useLeads } from "@/hooks/useLeads";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openPhone, openWhatsApp } from "@/services/links";
import type { Lead, LeadFilter } from "@/types/leads";
import { plural } from "@/utils/format";

const FILTERS: { value: LeadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "call", label: "Calls" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function LeadsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const [channel, setChannel] = useState<LeadFilter>("all");
  const {
    data,
    error,
    isLoading,
    isError,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useLeads(channel);

  const leads = useMemo(() => data?.pages.flatMap((p) => p.leads) ?? [], [data]);
  const total = data?.pages[0]?.total;

  const onCall = useCallback(
    (phone: string) => {
      openPhone(phone).catch((e: unknown) => toast(errorMessage(e), "error"));
    },
    [toast],
  );
  const onWhatsApp = useCallback(
    (phone: string) => {
      openWhatsApp(phone).catch((e: unknown) => toast(errorMessage(e), "error"));
    },
    [toast],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Lead>) => (
      <LeadRow lead={item} onCall={onCall} onWhatsApp={onWhatsApp} />
    ),
    [onCall, onWhatsApp],
  );

  const header = (
    <View style={{ gap: theme.spacing[3], marginBottom: theme.spacing[1] }}>
      <View style={{ gap: theme.spacing[1] }}>
        <AppText variant="title" accessibilityRole="header">
          Leads
        </AppText>
        <AppText tone="secondary">
          Every customer who tapped Call or WhatsApp on your listing.
        </AppText>
      </View>
      <View style={[styles.chips, { gap: theme.spacing[2] }]}>
        {FILTERS.map((f) => (
          <AppChip
            key={f.value}
            label={f.label}
            size="sm"
            selected={channel === f.value}
            onPress={() => setChannel(f.value)}
          />
        ))}
      </View>
      {total !== undefined && !isError ? (
        <AppText variant="caption" tone="secondary">
          {plural(total, "lead")}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={isLoading || isError ? [] : leads}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          { padding: theme.spacing[4], gap: theme.spacing[3] },
        ]}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[3] }}>
              <LeadRowSkeleton />
              <LeadRowSkeleton />
              <LeadRowSkeleton />
            </View>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <EmptyState
              icon={PhoneIncoming}
              title="No leads yet"
              text="Complete your profile and add prices to appear higher in search. Leads show up here the moment a customer contacts you."
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.brand.primary} style={styles.footer} />
          ) : null
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
        initialNumToRender={8}
        windowSize={9}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  footer: { paddingVertical: 16 },
});
