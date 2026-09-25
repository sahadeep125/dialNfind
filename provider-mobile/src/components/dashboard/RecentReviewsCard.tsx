import { StyleSheet, View } from "react-native";

import { AppBadge, AppCard, AppDivider, AppPressable, AppText } from "@/components/design-system";
import { SectionHeader } from "@/components/layout";
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
  return (
    <AppCard>
      <View style={{ gap: theme.spacing[2] }}>
        <SectionHeader title="Latest reviews" actionLabel="View all" onAction={onViewAll} />
        {unreplied > 0 ? (
          <AppPressable accessibilityRole="link" onPress={onViewAll} style={styles.badge}>
            <AppBadge tone="warning" label={`${unreplied} need a reply`} />
          </AppPressable>
        ) : null}
        {reviews.length === 0 ? (
          <AppText tone="secondary" style={{ paddingVertical: theme.spacing[4] }} align="center">
            No reviews yet.
          </AppText>
        ) : (
          reviews.map((r, i) => (
            <View key={r.id}>
              {i > 0 ? <AppDivider /> : null}
              <View style={{ gap: theme.spacing[1], paddingVertical: theme.spacing[3] }}>
                <View style={[styles.head, { gap: theme.spacing[2] }]}>
                  <AppText variant="label" numberOfLines={1} style={styles.name}>
                    {r.author}
                  </AppText>
                  <StarRating rating={r.rating} size={12} />
                </View>
                {r.reviewText ? (
                  <AppText tone="secondary" numberOfLines={2}>
                    {r.reviewText}
                  </AppText>
                ) : null}
                <View style={[styles.head, { gap: theme.spacing[2] }]}>
                  <AppText variant="caption" tone="tertiary" style={styles.name}>
                    {formatRelative(r.createdAt)}
                  </AppText>
                  {!r.providerReply ? (
                    <AppPressable accessibilityRole="link" hitSlop={10} onPress={onViewAll}>
                      <AppText variant="label" tone="brand">
                        Reply
                      </AppText>
                    </AppPressable>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start" },
  head: { alignItems: "center", flexDirection: "row" },
  name: { flex: 1 },
});
