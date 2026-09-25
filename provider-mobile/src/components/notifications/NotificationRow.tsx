import { memo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Bell,
  CreditCard,
  LifeBuoy,
  MessageSquareText,
  PhoneIncoming,
  Store,
  type LucideIcon,
} from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { AppNotification } from "@/types/notifications";
import { formatRelative } from "@/utils/format";

const ICONS: Record<string, LucideIcon> = {
  lead: PhoneIncoming,
  review: MessageSquareText,
  review_reply: MessageSquareText,
  subscription: CreditCard,
  listing: Store,
  support: LifeBuoy,
};

interface Props {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
}

export const NotificationRow = memo(function NotificationRow({ notification, onPress }: Props) {
  const theme = useTheme();
  const Icon = ICONS[notification.type] ?? Bell;
  const unread = !notification.isRead;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread. " : ""}${notification.title}`}
      accessibilityHint={unread ? "Marks it as read" : undefined}
      onPress={() => onPress(notification)}
      scale={false}
      style={[
        styles.row,
        {
          gap: theme.spacing[3],
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
          backgroundColor: unread ? theme.colors.brand.soft : "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: unread
              ? theme.colors.background.elevated
              : theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Icon size={18} color={theme.colors.brand.primary} />
      </View>
      <View style={[styles.main, { gap: theme.spacing[0.5] }]}>
        <View style={[styles.titleRow, { gap: theme.spacing[2] }]}>
          <AppText variant="label" style={styles.title}>
            {notification.title}
          </AppText>
          {unread ? (
            <View style={[styles.dot, { backgroundColor: theme.colors.brand.primary }]} />
          ) : null}
        </View>
        {notification.body ? (
          <AppText variant="body" tone="secondary" numberOfLines={3}>
            {notification.body}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="tertiary">
          {formatRelative(notification.createdAt)}
        </AppText>
      </View>
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  icon: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  main: { flex: 1, minWidth: 0 },
  titleRow: { alignItems: "center", flexDirection: "row" },
  title: { flex: 1 },
  dot: { borderRadius: 4, height: 8, width: 8 },
});
