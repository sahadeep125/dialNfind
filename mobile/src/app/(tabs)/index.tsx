import { useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { router } from "expo-router";
import { Store } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { CategoryGrid, HomeHeader, SearchLauncher } from "@/components/home";
import { EmptyState, ErrorState, Screen, SectionHeader } from "@/components/layout";
import { ProviderCard, ProviderCardSkeleton } from "@/components/providers";
import { useCategories } from "@/hooks/useCategories";
import { useFeaturedProviders } from "@/hooks/useFeaturedProviders";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useLocationStore } from "@/stores/useLocationStore";
import type { ProviderCard as ProviderCardData } from "@/types";

export default function HomeScreen() {
  const theme = useTheme();
  const { columns } = useLayout();
  const city = useLocationStore((s) => s.location.city || s.location.name);
  const categories = useCategories();
  const featured = useFeaturedProviders();
  const refreshing = (categories.isRefetching || featured.isRefetching) && !featured.isLoading;

  const refresh = useCallback(() => {
    void categories.refetch();
    void featured.refetch();
  }, [categories, featured]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ProviderCardData>) => (
      <View style={[styles.cell, columns > 1 && { maxWidth: `${100 / columns}%` }]}>
        <ProviderCard provider={item} source="search" />
      </View>
    ),
    [columns],
  );

  const header = (
    <View style={{ gap: theme.spacing[5], paddingBottom: theme.spacing[3] }}>
      <HomeHeader />
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="title" accessibilityRole="header">
          Find trusted help nearby
        </AppText>
        <AppText tone="secondary">
          Call or WhatsApp local pros directly. No middlemen, no booking fees.
        </AppText>
      </View>
      <SearchLauncher />
      <View style={{ gap: theme.spacing[3] }}>
        <SectionHeader
          title="Browse categories"
          actionLabel="See all"
          onAction={() => router.push("/categories")}
        />
        {categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : (
          <CategoryGrid categories={categories.data} loading={categories.isLoading} />
        )}
      </View>
      <SectionHeader
        title="Top rated near you"
        subtitle={city ? `Popular providers around ${city}` : undefined}
        actionLabel="View all"
        onAction={() => router.push({ pathname: "/search", params: { sort: "rating" } })}
      />
    </View>
  );

  return (
    <Screen constrained={columns === 1}>
      <FlatList
        key={`cols-${columns}`}
        data={featured.data ?? []}
        numColumns={columns}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        columnWrapperStyle={columns > 1 ? { gap: theme.spacing[3] } : undefined}
        contentContainerStyle={{
          padding: theme.spacing[4],
          gap: theme.spacing[3],
          paddingBottom: theme.spacing[10],
        }}
        ListEmptyComponent={
          featured.isLoading ? (
            <View style={{ gap: theme.spacing[3] }}>
              <ProviderCardSkeleton />
              <ProviderCardSkeleton />
            </View>
          ) : featured.isError ? (
            <ErrorState error={featured.error} onRetry={() => void featured.refetch()} />
          ) : (
            <EmptyState
              icon={Store}
              title="No providers here yet"
              text="Try another area from the location menu at the top."
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.brand.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 },
});
