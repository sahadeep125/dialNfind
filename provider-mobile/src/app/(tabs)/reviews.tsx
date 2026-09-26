import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { MessageSquare } from "lucide-react-native";

import { AppChip, AppSkeleton, AppText } from "@/components/design-system";
import { EmptyState, ErrorState, Screen } from "@/components/layout";
import { RatingSummary } from "@/components/reviews/RatingSummary";
import { ReplySheet } from "@/components/reviews/ReplySheet";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReportReviewSheet } from "@/components/reviews/ReportReviewSheet";
import { ReviewCardSkeleton } from "@/components/reviews/ReviewCardSkeleton";
import { useReviews } from "@/hooks/useReviews";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderReview, ReviewFilter } from "@/types/reviews";

const FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "All reviews" },
  { value: "unreplied", label: "Needs a reply" },
];

export default function ReviewsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [replyingTo, setReplyingTo] = useState<ProviderReview | null>(null);
  const [reporting, setReporting] = useState<ProviderReview | null>(null);
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
  } = useReviews(filter);

  const reviews = useMemo(() => data?.pages.flatMap((p) => p.reviews) ?? [], [data]);
  const summary = data?.pages[0]?.summary;

  const onReply = useCallback((review: ProviderReview) => setReplyingTo(review), []);
  const closeSheet = useCallback(() => setReplyingTo(null), []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ProviderReview>) => (
      <ReviewCard review={item} onReply={onReply} onReport={setReporting} />
    ),
    [onReply],
  );

  const header = (
    <View style={{ gap: theme.spacing[4], marginBottom: theme.spacing[1] }}>
      <View style={{ gap: theme.spacing[1] }}>
        <AppText variant="title" accessibilityRole="header">
          Reviews
        </AppText>
        <AppText tone="secondary">
          Replying to reviews shows customers you care and improves your ranking.
        </AppText>
      </View>
      {summary ? (
        <RatingSummary summary={summary} />
      ) : isLoading ? (
        <AppSkeleton shape="block" height={132} />
      ) : null}
      <View style={[styles.chips, { gap: theme.spacing[2] }]}>
        {FILTERS.map((f) => (
          <AppChip
            key={f.value}
            label={f.label}
            size="sm"
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={isLoading || isError ? [] : reviews}
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
              <ReviewCardSkeleton />
              <ReviewCardSkeleton />
            </View>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : filter === "unreplied" ? (
            <EmptyState
              icon={MessageSquare}
              title="You are all caught up"
              text="Every review has a reply."
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No reviews yet"
              text="Customers who contact you through DialNFind can leave a review here."
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
        initialNumToRender={6}
        windowSize={9}
      />
      <ReplySheet review={replyingTo} onClose={closeSheet} />
      <ReportReviewSheet review={reporting} onClose={() => setReporting(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  footer: { paddingVertical: 16 },
});
