import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MessageCircle, PenLine, Phone, ThumbsDown, ThumbsUp } from "lucide-react-native";

import { AppAvatar, AppBadge, AppButton, AppCard, AppText } from "@/components/design-system";
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
  const call = item.channel === "call";
  const answered = item.customerReportedResponse;

  return (
    <AppCard padding={theme.spacing[4]}>
      <View style={[styles.head, { gap: theme.spacing[3] }]}>
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
          <AppText variant="caption" tone="secondary">
            {formatRelative(item.createdAt)}
          </AppText>
        </View>
        <AppBadge
          icon={call ? Phone : MessageCircle}
          label={call ? "Called" : "WhatsApp"}
          tone={call ? "brand" : "success"}
        />
      </View>

      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
            marginTop: theme.spacing[4],
            padding: theme.spacing[3],
            gap: theme.spacing[2],
          },
        ]}
      >
        {answered === null ? (
          <>
            <AppText variant="labelSmall" style={styles.flex}>
              Did they respond?
            </AppText>
            <AppButton
              size="sm"
              variant="secondary"
              icon={ThumbsUp}
              accessibilityLabel={`Yes, ${p.businessName} responded`}
              onPress={() => onAnswer(item, true)}
            >
              Yes
            </AppButton>
            <AppButton
              size="sm"
              variant="secondary"
              icon={ThumbsDown}
              accessibilityLabel={`No, ${p.businessName} did not respond`}
              onPress={() => onAnswer(item, false)}
            >
              No
            </AppButton>
          </>
        ) : (
          <>
            {answered ? (
              <ThumbsUp size={16} color={theme.colors.semantic.success} />
            ) : (
              <ThumbsDown size={16} color={theme.colors.text.tertiary} />
            )}
            <AppText
              variant="labelSmall"
              tone={answered ? "success" : "secondary"}
              style={styles.flex}
            >
              {answered ? "They responded" : "No response"}
            </AppText>
          </>
        )}
      </View>
      {!item.hasReview ? (
        <AppButton
          size="sm"
          variant="soft"
          icon={PenLine}
          accessibilityLabel={`Write a review for ${p.businessName}`}
          onPress={() => router.push(`/review/${p.slug}`)}
          style={{ alignSelf: "flex-start", marginTop: theme.spacing[3] }}
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
  panel: { alignItems: "center", flexDirection: "row", minHeight: 52 },
});
