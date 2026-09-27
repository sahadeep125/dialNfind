import { StyleSheet, View } from "react-native";
import { MessageSquareText } from "lucide-react-native";

import { AppAvatar, AppBadge, AppPressable, AppSection, AppText } from "@/components/design-system";
import { EmptyState } from "@/components/layout";
import { StarRating } from "@/components/reviews/StarRating";
import { useTheme } from "@/hooks/useTheme";
import type { DashboardRecentReview } from "@/types/dashboard";
import { formatRelative } from "@/utils/format";

interface Props {
  reviews: DashboardRecentReview[];
  unreplied: number;
  onViewAll: () => void;
}

export function RecentReviewsCard({ reviews, unreplied, onViewAll }: Props) {
  const theme = useTheme();
  const shown = reviews.slice(0, 3);
  return (
    <AppSection
      title="Latest reviews"
      subtitle={unreplied > 0 ? `${unreplied} waiting for your reply` : undefined}
      action={{ label: "See all", onPress: onViewAll }}
      dividerInset={14 + 32 + 12}
    >
      {shown.length === 0 ? (
        <EmptyState
          compact
          icon={MessageSquareText}
          title="No reviews yet"
          text="Ask happy customers to rate you on DialNFind."
        />
      ) : (
        shown.map((r) => (
          <AppPressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${r.author}, ${r.rating} stars`}
            onPress={onViewAll}
            scale={false}
          >
            <View
              style={[
                styles.row,
                {
                  gap: theme.spacing[3],
                  paddingHorizontal: 14,
                  paddingVertical: theme.spacing[2.5],
                },
              ]}
            >
              <AppAvatar name={r.author} size={32} />
              <View style={styles.main}>
                <View style={[styles.head, { gap: theme.spacing[2] }]}>
                  <AppText variant="label" numberOfLines={1} style={styles.shrink}>
                    {r.author}
                  </AppText>
                  <StarRating rating={r.rating} size={11} />
                  <View style={styles.spacer} />
                  <AppText variant="meta">{formatRelative(r.createdAt)}</AppText>
                </View>
                {r.reviewText ? (
                  <AppText variant="meta" tone="secondary" numberOfLines={2}>
                    {r.reviewText}
                  </AppText>
                ) : null}
                {!r.providerReply ? (
                  <View style={{ marginTop: 4 }}>
                    <AppBadge label="Needs reply" tone="warning" />
                  </View>
                ) : null}
              </View>
            </View>
          </AppPressable>
        ))
      )}
    </AppSection>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  main: { flex: 1, gap: 2, minWidth: 0 },
  head: { alignItems: "center", flexDirection: "row" },
  shrink: { flexShrink: 1 },
  spacer: { flex: 1 },
});
