import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ShieldCheck } from "lucide-react-native";

import { AppAvatar, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Review } from "@/types";
import { formatRelative } from "@/utils/format";
import { RatingStars } from "./RatingStars";

export const ReviewItem = memo(function ReviewItem({ review }: { review: Review }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AppAvatar name={review.author.name} uri={review.author.photoUrl} size={36} />
        <View style={styles.flex}>
          <AppText variant="label" numberOfLines={1}>
            {review.author.name}
          </AppText>
          <View style={styles.meta}>
            <RatingStars rating={review.rating} size={12} />
            <AppText variant="caption" tone="tertiary">
              {formatRelative(review.createdAt)}
            </AppText>
          </View>
        </View>
        {review.isVerifiedContact ? (
          <View style={styles.verified}>
            <ShieldCheck size={13} color={theme.colors.semantic.success} />
            <AppText variant="overline" tone="success">
              Contacted
            </AppText>
          </View>
        ) : null}
      </View>
      {review.reviewText ? <AppText variant="body">{review.reviewText}</AppText> : null}
      {review.photos.length ? (
        <View style={styles.photos}>
          {review.photos.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={[styles.photo, { borderRadius: theme.radius.sm }]}
              contentFit="cover"
              accessibilityLabel="Review photo"
            />
          ))}
        </View>
      ) : null}
      {review.providerReply ? (
        <View
          style={[
            styles.reply,
            { backgroundColor: theme.colors.background.tertiary, borderRadius: theme.radius.md },
          ]}
        >
          <AppText variant="overline" tone="secondary">
            Reply from the business
          </AppText>
          <AppText variant="caption">{review.providerReply}</AppText>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { alignItems: "center", flexDirection: "row", gap: 10 },
  flex: { flex: 1, gap: 2 },
  meta: { alignItems: "center", flexDirection: "row", gap: 8 },
  verified: { alignItems: "center", flexDirection: "row", gap: 3 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { height: 72, width: 72 },
  reply: { gap: 4, padding: 12 },
});
