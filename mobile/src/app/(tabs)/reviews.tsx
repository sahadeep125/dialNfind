import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { router } from "expo-router";
import { MessageSquareText, Search, Trash2 } from "lucide-react-native";

import { AppButton, AppSheet, AppText } from "@/components/design-system";
import { SignInPrompt } from "@/components/auth";
import { EmptyState, ErrorState, Screen, TabHeader } from "@/components/layout";
import { ProviderCardSkeleton } from "@/components/providers";
import { MyReviewCard } from "@/components/reviews";
import { useDeleteReview } from "@/hooks/useDeleteReview";
import { useLayout } from "@/hooks/useLayout";
import { useMyReviews } from "@/hooks/useMyReviews";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MyReview } from "@/types";
import { plural } from "@/utils/format";

export default function MyReviewsScreen() {
  const theme = useTheme();
  const { columns, gutter } = useLayout();
  const signedIn = useAuthStore((s) => !!s.token);
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyReviews();
  const remove = useDeleteReview();
  const [pending, setPending] = useState<MyReview | null>(null);
  const cols = Math.min(columns, 2);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MyReview>) => (
      <View style={[styles.cell, cols > 1 && { maxWidth: "50%" }]}>
        <MyReviewCard review={item} onDelete={setPending} />
      </View>
    ),
    [cols],
  );

  const confirmDelete = (): void => {
    if (!pending) return;
    remove.mutate(pending.id, { onSettled: () => setPending(null) });
  };

  return (
    <Screen width={cols > 1 ? "grid" : "content"}>
      <TabHeader
        title="My reviews"
        subtitle={
          signedIn && data
            ? plural(data.length, "review")
            : "Reviews you write help neighbours choose"
        }
      />
      {!signedIn ? (
        <SignInPrompt
          icon={MessageSquareText}
          title="Share your experience"
          text="Sign in to rate providers you have used and see their replies."
        />
      ) : (
        <FlatList
          key={`cols-${cols}`}
          data={isLoading || isError ? [] : (data ?? [])}
          numColumns={cols}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          columnWrapperStyle={cols > 1 ? { gap: theme.spacing[4] } : undefined}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: gutter, paddingVertical: theme.spacing[3], gap: theme.spacing[4] },
          ]}
          ListEmptyComponent={
            isLoading ? (
              <ProviderCardSkeleton />
            ) : isError ? (
              <ErrorState error={error} onRetry={() => void refetch()} />
            ) : (
              <EmptyState
                icon={MessageSquareText}
                title="No reviews yet"
                text="After you contact a provider, open their profile and tap Write a review."
                tone="warning"
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
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={theme.colors.brand.primary}
            />
          }
        />
      )}
      <AppSheet visible={!!pending} onClose={() => setPending(null)} title="Delete this review?">
        <View style={{ gap: theme.spacing[4] }}>
          <AppText tone="secondary">
            Your review of {pending?.provider.businessName} will be removed and its rating no longer
            counted. This cannot be undone.
          </AppText>
          <View style={styles.row}>
            <AppButton variant="secondary" style={styles.flex} onPress={() => setPending(null)}>
              Keep it
            </AppButton>
            <AppButton
              variant="destructive"
              icon={Trash2}
              style={styles.flex}
              loading={remove.isPending}
              onPress={confirmDelete}
            >
              Delete
            </AppButton>
          </View>
        </View>
      </AppSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  cell: { flex: 1 },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
