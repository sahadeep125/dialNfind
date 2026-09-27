import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MessageSquareReply, Pencil, Trash2 } from "lucide-react-native";

import {
  AppAvatar,
  AppBadge,
  AppButton,
  AppCard,
  AppDivider,
  AppText,
} from "@/components/design-system";
import { RatingStars } from "@/components/providers";
import { useTheme } from "@/hooks/useTheme";
import type { MyReview } from "@/types";
import { formatRelative } from "@/utils/format";

interface Props {
  review: MyReview;
  onDelete: (review: MyReview) => void;
}

/** A review the person wrote, with the provider's reply and edit or delete actions. */
export const MyReviewCard = memo(function MyReviewCard({ review, onDelete }: Props) {
  const theme = useTheme();
  const p = review.provider;
  return (
    <AppCard padding={theme.spacing[4]} style={styles.card}>
      <View style={styles.head}>
        <AppAvatar name={p.businessName} uri={p.logoUrl} size={46} shape="rounded" />
        <View style={styles.flex}>
          <AppText
            variant="subheading"
            numberOfLines={1}
            onPress={() => router.push(`/provider/${p.slug}`)}
            accessibilityRole="link"
          >
            {p.businessName}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {[p.locality, p.city].filter(Boolean).join(", ")}
          </AppText>
        </View>
        {review.status !== "published" ? (
          <AppBadge
            label={review.status === "flagged" ? "Under review" : "Removed"}
            tone="warning"
          />
        ) : null}
      </View>
      <View style={[styles.rating, { marginTop: theme.spacing[4] }]}>
        <RatingStars rating={review.rating} size={16} />
        <AppText variant="caption" tone="tertiary">
          {formatRelative(review.createdAt)}
        </AppText>
      </View>
      {review.reviewText ? (
        <AppText style={[styles.text, { marginTop: theme.spacing[2] }]}>
          {review.reviewText}
        </AppText>
      ) : null}
      {review.providerReply ? (
        <View
          style={[
            styles.reply,
            {
              backgroundColor: theme.colors.background.tertiary,
              borderLeftColor: theme.colors.brand.primary,
              borderRadius: theme.radius.md,
              marginTop: theme.spacing[3],
            },
          ]}
        >
          <View style={styles.replyHead}>
            <MessageSquareReply size={14} color={theme.colors.brand.primary} />
            <AppText variant="labelSmall" tone="brand" numberOfLines={1} style={styles.flex}>
              Reply from {p.businessName}
            </AppText>
          </View>
          <AppText variant="caption" tone="secondary">
            {review.providerReply}
          </AppText>
        </View>
      ) : null}
      <View style={styles.spacer} />
      <AppDivider style={{ marginTop: theme.spacing[4], marginBottom: theme.spacing[2] }} />
      <View style={styles.actions}>
        <AppButton
          size="sm"
          variant="ghost"
          icon={Pencil}
          onPress={() => router.push(`/review/${p.slug}`)}
        >
          Edit
        </AppButton>
        <AppButton size="sm" variant="destructive" icon={Trash2} onPress={() => onDelete(review)}>
          Delete
        </AppButton>
      </View>
    </AppCard>
  );
});

const styles = StyleSheet.create({
  card: { flexGrow: 1 },
  flex: { flex: 1 },
  head: { alignItems: "center", flexDirection: "row", gap: 12 },
  rating: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  text: { lineHeight: 23 },
  reply: { borderLeftWidth: 3, gap: 4, padding: 12 },
  replyHead: { alignItems: "center", flexDirection: "row", gap: 6 },
  spacer: { flexGrow: 1 },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
});
