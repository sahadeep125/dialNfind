import { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BadgeCheck, Flag, Pencil, Reply } from "lucide-react-native";

import {
  AppAvatar,
  AppButton,
  AppCard,
  AppIconButton,
  AppPressable,
  AppText,
} from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderReview } from "@/types/reviews";
import { formatRelative } from "@/utils/format";
import { StarRating } from "./StarRating";

interface Props {
  review: ProviderReview;
  onReply: (review: ProviderReview) => void;
  onReport: (review: ProviderReview) => void;
}

const CLAMP = 4;

export const ReviewCard = memo(function ReviewCard({ review, onReply, onReport }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const long = (review.reviewText?.length ?? 0) > 220;

  return (
    <AppCard padding={14}>
      <View style={[styles.head, { gap: theme.spacing[2.5] }]}>
        <AppAvatar name={review.author} size={34} />
        <View style={styles.main}>
          <View style={[styles.line, { gap: theme.spacing[1] }]}>
            <AppText variant="label" numberOfLines={1} style={styles.shrink}>
              {review.author}
            </AppText>
            {review.isVerifiedContact ? (
              <BadgeCheck
                size={14}
                color={theme.colors.semantic.success}
                accessibilityLabel="Contacted you via DialNFind"
              />
            ) : null}
          </View>
          <View style={[styles.line, { gap: theme.spacing[2] }]}>
            <StarRating rating={review.rating} size={12} />
            <AppText variant="meta">{formatRelative(review.createdAt)}</AppText>
          </View>
        </View>
        {review.reported ? (
          <AppText variant="meta">Reported</AppText>
        ) : (
          <AppIconButton
            accessibilityLabel={`Report the review from ${review.author}`}
            size="sm"
            icon={<Flag size={14} color={theme.colors.text.tertiary} />}
            onPress={() => onReport(review)}
          />
        )}
      </View>

      {review.reviewText ? (
        <View style={{ marginTop: theme.spacing[2.5] }}>
          <AppText numberOfLines={expanded || !long ? undefined : CLAMP}>
            {review.reviewText}
          </AppText>
          {long ? (
            <AppPressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setExpanded((v) => !v)}
              style={styles.more}
            >
              <AppText variant="caption" tone="brand">
                {expanded ? "Show less" : "Read more"}
              </AppText>
            </AppPressable>
          ) : null}
        </View>
      ) : null}

      {review.providerReply ? (
        <View
          style={[
            styles.reply,
            {
              backgroundColor: theme.colors.background.subtle,
              borderLeftColor: theme.colors.brand.primary,
              borderRadius: theme.radius.sm,
              marginTop: theme.spacing[3],
              paddingHorizontal: theme.spacing[3],
              paddingVertical: theme.spacing[2],
            },
          ]}
        >
          <View style={styles.line}>
            <AppText
              variant="caption"
              tone="brand"
              style={[
                styles.shrink,
                styles.fill,
                { fontFamily: theme.typography.label.fontFamily },
              ]}
            >
              Your reply
            </AppText>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={`Edit your reply to ${review.author}`}
              hitSlop={10}
              onPress={() => onReply(review)}
              style={[styles.line, { gap: 4 }]}
            >
              <Pencil size={12} color={theme.colors.text.secondary} />
              <AppText variant="caption" tone="secondary">
                Edit
              </AppText>
            </AppPressable>
          </View>
          <AppText variant="meta" tone="secondary">
            {review.providerReply}
          </AppText>
        </View>
      ) : (
        <AppButton
          variant="soft"
          size="xs"
          leadingIcon={<Reply size={14} color={theme.colors.brand.softText} />}
          onPress={() => onReply(review)}
          accessibilityLabel={`Reply to ${review.author}`}
          style={{ alignSelf: "flex-start", marginTop: theme.spacing[3] }}
        >
          Reply
        </AppButton>
      )}
    </AppCard>
  );
});

const styles = StyleSheet.create({
  head: { alignItems: "center", flexDirection: "row" },
  main: { flex: 1, gap: 2, minWidth: 0 },
  line: { alignItems: "center", flexDirection: "row" },
  shrink: { flexShrink: 1 },
  fill: { flex: 1 },
  more: { alignSelf: "flex-start", marginTop: 4 },
  reply: { borderLeftWidth: 2, gap: 2 },
});
