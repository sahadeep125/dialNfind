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
import { Heart } from "lucide-react-native";

import { AppButton, AppText } from "@/components/design-system";
import { SignInPrompt } from "@/components/auth";
import { EmptyState, ErrorState, Screen } from "@/components/layout";
import { ProviderCard, ProviderCardSkeleton } from "@/components/providers";
import { useFavorites } from "@/hooks/useFavorites";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import type { FavoriteProvider } from "@/types";
import { plural } from "@/utils/format";

export default function FavoritesScreen() {
  const theme = useTheme();
  const { columns } = useLayout();
  const signedIn = useAuthStore((s) => !!s.token);
  const { data, isLoading, isError, error, refetch, isRefetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useFavorites();
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
    <Screen constrained={columns === 1}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] },
        ]}
      >
        <AppText variant="title" accessibilityRole="header">
          Favorites
        </AppText>
        <AppText tone="secondary">
          {signedIn && data
            ? `${plural(total, "saved provider")}`
            : "Providers you save for later"}
        </AppText>
      </View>
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
          columnWrapperStyle={columns > 1 ? { gap: theme.spacing[3] } : undefined}
          contentContainerStyle={[
            styles.content,
            { padding: theme.spacing[4], gap: theme.spacing[3] },
          ]}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: theme.spacing[3] }}>
                <ProviderCardSkeleton />
                <ProviderCardSkeleton />
              </View>
            ) : isError ? (
              <ErrorState error={error} onRetry={() => void refetch()} />
            ) : (
              <EmptyState
                icon={Heart}
                title="No favorites yet"
                text="Tap the heart on any provider to save them here."
                action={
                  <AppButton onPress={() => router.push("/search")}>Find providers</AppButton>
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
  header: { gap: 2 },
  content: { flexGrow: 1 },
  cell: { flex: 1 },
});
