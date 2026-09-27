import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { router } from "expo-router";
import { Heart, Search } from "lucide-react-native";

import { AppButton } from "@/components/design-system";
import { SignInPrompt } from "@/components/auth";
import { EmptyState, ErrorState, Screen, TabHeader } from "@/components/layout";
import { ProviderCard, ProviderCardSkeleton } from "@/components/providers";
import { useFavorites } from "@/hooks/useFavorites";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import type { FavoriteProvider } from "@/types";
import { plural } from "@/utils/format";

export default function FavoritesScreen() {
  const theme = useTheme();
  const { columns, gutter } = useLayout();
  const signedIn = useAuthStore((s) => !!s.token);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFavorites();
  const items = data?.pages.flatMap((page) => page.results) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FavoriteProvider>) => (
      <View style={[styles.cell, columns > 1 && { maxWidth: `${100 / columns}%` }]}>
        <ProviderCard provider={item} source="profile" />
      </View>
    ),
    [columns],
  );

  return (
    <Screen width={columns > 1 ? "grid" : "content"}>
      <TabHeader
        title="Favorites"
        subtitle={
          signedIn && data ? `${plural(total, "saved provider")}` : "Providers you save for later"
        }
      />
      {!signedIn ? (
        <SignInPrompt
          icon={Heart}
          title="Save the pros you like"
          text="Sign in to keep a list of providers you want to call again."
        />
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={isLoading || isError ? [] : items}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={theme.colors.brand.primary} /> : null
          }
          numColumns={columns}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          columnWrapperStyle={columns > 1 ? { gap: theme.spacing[4] } : undefined}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: gutter, paddingVertical: theme.spacing[3], gap: theme.spacing[4] },
          ]}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: theme.spacing[4] }}>
                <ProviderCardSkeleton />
                <ProviderCardSkeleton />
              </View>
            ) : isError ? (
              <ErrorState error={error} onRetry={() => void refetch()} />
            ) : (
              <EmptyState
                icon={Heart}
                tone="danger"
                title="No favorites yet"
                text="Tap the heart on any provider to save them here."
                action={
                  <AppButton icon={Search} onPress={() => router.push("/search")}>
                    Find providers
                  </AppButton>
                }
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => void refetch()}
              tintColor={theme.colors.brand.primary}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  cell: { flex: 1 },
});
