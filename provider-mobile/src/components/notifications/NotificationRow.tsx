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
          paddingHorizontal: theme.layout.screenPadding,
          paddingVertical: theme.spacing[3],
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: unread ? theme.colors.brand.soft : theme.colors.background.subtle,
            borderRadius: theme.radius.sm + 2,
          },
        ]}
      >
        <Icon size={16} color={unread ? theme.colors.brand.primary : theme.colors.text.secondary} />
      </View>
      <View style={[styles.main, { gap: 2 }]}>
        <View style={[styles.titleRow, { gap: theme.spacing[2] }]}>
          <AppText variant={unread ? "label" : "body"} numberOfLines={2} style={styles.title}>
            {notification.title}
          </AppText>
          <AppText variant="meta" numeric>
            {formatRelative(notification.createdAt)}
          </AppText>
        </View>
        {notification.body ? (
          <AppText variant="meta" tone="secondary" numberOfLines={2}>
            {notification.body}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.dot,
          { backgroundColor: unread ? theme.colors.brand.primary : "transparent" },
        ]}
      />
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  icon: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  main: { flex: 1, minWidth: 0 },
  titleRow: { alignItems: "flex-start", flexDirection: "row" },
  title: { flex: 1 },
  dot: { borderRadius: 4, height: 8, marginTop: 6, width: 8 },
});
