import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MessageCircle, Phone, ThumbsDown, ThumbsUp } from "lucide-react-native";

import { AppAvatar, AppButton, AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ContactHistoryItem } from "@/types";
import { formatRelative } from "@/utils/format";

interface Props {
  item: ContactHistoryItem;
  onAnswer: (item: ContactHistoryItem, responded: boolean) => void;
}

/** One past call or WhatsApp message, with the "Did they respond?" follow-up and a review shortcut. */
export const ContactRow = memo(function ContactRow({ item, onAnswer }: Props) {
  const theme = useTheme();
  const p = item.provider;
  const Channel = item.channel === "call" ? Phone : MessageCircle;
  const answered = item.customerReportedResponse;
  const iconColor = theme.colors.text.primary;

  return (
    <AppCard padding={theme.spacing[4]}>
      <View style={[styles.head, { gap: theme.spacing[3] }]}>
        <AppAvatar name={p.businessName} uri={p.logoUrl} size={44} shape="rounded" />
        <View style={styles.flex}>
          <AppText
            variant="subheading"
            numberOfLines={1}
            onPress={() => router.push(`/provider/${p.slug}`)}
            accessibilityRole="link"
          >
            {p.businessName}
          </AppText>
          <View style={[styles.meta, { gap: theme.spacing[1] }]}>
            <Channel size={13} color={theme.colors.text.secondary} />
            <AppText variant="caption" tone="secondary">
              {item.channel === "call" ? "Called" : "WhatsApp"} {formatRelative(item.createdAt)}
            </AppText>
          </View>
        </View>
      </View>
      <View style={[styles.actions, { gap: theme.spacing[2], marginTop: theme.spacing[3] }]}>
        {answered === null ? (
          <>
            <AppText variant="caption" tone="secondary" style={styles.flex}>
              Did they respond?
            </AppText>
            <AppButton
              size="sm"
              variant="secondary"
              accessibilityLabel={`Yes, ${p.businessName} responded`}
              leadingIcon={<ThumbsUp size={14} color={iconColor} />}
              onPress={() => onAnswer(item, true)}
            >
              Yes
            </AppButton>
            <AppButton
              size="sm"
              variant="secondary"
              accessibilityLabel={`No, ${p.businessName} did not respond`}
              leadingIcon={<ThumbsDown size={14} color={iconColor} />}
              onPress={() => onAnswer(item, false)}
            >
              No
            </AppButton>
          </>
        ) : (
          <AppText variant="caption" tone="secondary" style={styles.flex}>
            {answered ? "They responded" : "No response"}
          </AppText>
        )}
      </View>
      {!item.hasReview ? (
        <AppButton
          size="sm"
          variant="ghost"
          accessibilityLabel={`Write a review for ${p.businessName}`}
          onPress={() => router.push(`/review/${p.slug}`)}
          style={{ alignSelf: "flex-start", marginTop: theme.spacing[1] }}
        >
          Write a review
        </AppButton>
      ) : null}
    </AppCard>
  );
});

const styles = StyleSheet.create({
  head: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
  meta: { alignItems: "center", flexDirection: "row", marginTop: 2 },
  actions: { alignItems: "center", flexDirection: "row" },
});
