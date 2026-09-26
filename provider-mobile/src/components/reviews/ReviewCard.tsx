import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { BadgeCheck, Flag, Pencil, Reply } from "lucide-react-native";

import { AppAvatar, AppButton, AppCard, AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderReview } from "@/types/reviews";
import { formatRelative } from "@/utils/format";
import { StarRating } from "./StarRating";

interface Props {
  review: ProviderReview;
  onReply: (review: ProviderReview) => void;
  onReport: (review: ProviderReview) => void;
}

export const ReviewCard = memo(function ReviewCard({ review, onReply, onReport }: Props) {
  const theme = useTheme();
  return (
    <AppCard>
      <View style={[styles.head, { gap: theme.spacing[3] }]}>
        <AppAvatar name={review.author} size={40} />
        <View style={[styles.main, { gap: theme.spacing[1] }]}>
          <View style={[styles.meta, { gap: theme.spacing[2] }]}>
            <AppText variant="label" numberOfLines={1} style={styles.fill}>
              {review.author}
            </AppText>
            {review.reported ? (
              <AppText variant="caption" tone="tertiary">
                Reported
              </AppText>
            ) : (
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={`Report the review from ${review.author}`}
                hitSlop={10}
                onPress={() => onReport(review)}
                style={[styles.meta, { gap: theme.spacing[1] }]}
              >
                <Flag size={13} color={theme.colors.text.tertiary} />
                <AppText variant="caption" tone="tertiary">
                  Report
                </AppText>
              </AppPressable>
            )}
          </View>
          <View style={[styles.meta, { gap: theme.spacing[2] }]}>
            <StarRating rating={review.rating} size={13} />
            <AppText variant="caption" tone="secondary">
              {formatRelative(review.createdAt)}
            </AppText>
          </View>
          {review.isVerifiedContact ? (
            <View style={[styles.meta, { gap: theme.spacing[1] }]}>
              <BadgeCheck size={14} color={theme.colors.semantic.success} />
              <AppText variant="caption" tone="success">
                Contacted via DialNFind
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {review.reviewText ? (
        <AppText style={{ marginTop: theme.spacing[3] }}>{review.reviewText}</AppText>
      ) : null}

      {review.providerReply ? (
        <View
          style={{
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
            marginTop: theme.spacing[3],
            padding: theme.spacing[3],
            gap: theme.spacing[1],
          }}
        >
          <View style={styles.replyHead}>
            <AppText variant="label" style={styles.fill}>
              Your reply
            </AppText>
            <AppButton
              variant="ghost"
              size="sm"
              leadingIcon={<Pencil size={14} color={theme.colors.text.primary} />}
              onPress={() => onReply(review)}
              accessibilityLabel={`Edit your reply to ${review.author}`}
            >
              Edit
            </AppButton>
          </View>
          <AppText tone="secondary">{review.providerReply}</AppText>
        </View>
      ) : (
        <View style={[styles.replyButton, { marginTop: theme.spacing[3] }]}>
          <AppButton
            variant="secondary"
            size="sm"
            leadingIcon={<Reply size={16} color={theme.colors.text.primary} />}
            onPress={() => onReply(review)}
            accessibilityLabel={`Reply to ${review.author}`}
          >
            Reply
          </AppButton>
        </View>
      )}
    </AppCard>
  );
});

const styles = StyleSheet.create({
  head: { flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
  meta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
  replyHead: { alignItems: "center", flexDirection: "row" },
  fill: { flex: 1 },
  replyButton: { alignItems: "flex-start" },
});
