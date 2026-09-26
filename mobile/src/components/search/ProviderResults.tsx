import { useCallback, useMemo, type ReactElement } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { SearchX } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { EmptyState, ErrorState } from "@/components/layout";
import { ProviderCard, ProviderCardSkeleton } from "@/components/providers";
import { useLayout } from "@/hooks/useLayout";
import { useSearchProviders } from "@/hooks/useSearchProviders";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderCard as ProviderCardData, SearchFilters } from "@/types";
import { resultsSummary } from "@/utils/filters";
import { useLocationStore } from "@/stores/useLocationStore";

interface Props {
  filters: SearchFilters;
  header?: ReactElement;
  source?: "search" | "category_browse";
}

/** Infinite list of providers for a search or category, in one to three columns depending on screen width. */
export function ProviderResults({ filters, header, source = "search" }: Props) {
  const theme = useTheme();
  const { columns } = useLayout();
  const query = useSearchProviders(filters);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = query;
  const results = useMemo(() => data?.pages.flatMap((p) => p.results) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const radiusKm = data?.pages[0]?.radiusKm;
  const place = useLocationStore((s) => s.location.name);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ProviderCardData>) => (
      <View style={[styles.cell, columns > 1 && { maxWidth: `${100 / columns}%` }]}>
        <ProviderCard provider={item} source={source} />
      </View>
    ),
    [columns, source],
  );

  const listHeader = (
    <View style={{ gap: theme.spacing[3], paddingBottom: theme.spacing[3] }}>
      {header}
      {!isLoading && !isError ? (
        <AppText variant="caption" tone="secondary">
          {resultsSummary(total, radiusKm, place)}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <FlatList
      key={`cols-${columns}`}
      data={isLoading || isError ? [] : results}
      numColumns={columns}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      columnWrapperStyle={columns > 1 ? { gap: theme.spacing[3] } : undefined}
      contentContainerStyle={[styles.content, { padding: theme.spacing[4], gap: theme.spacing[3] }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        isLoading ? (
          <View style={{ gap: theme.spacing[3] }}>
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
          </View>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <EmptyState
            icon={SearchX}
            title="No providers found"
            text="Try another search, remove a filter or change your area."
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
        />
      }
      initialNumToRender={6}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 120 },
  cell: { flex: 1 },
  footer: { paddingVertical: 16 },
});
