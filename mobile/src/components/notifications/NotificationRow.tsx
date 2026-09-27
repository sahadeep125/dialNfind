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

import { AppIconTile, AppPressable, AppText, type IconTileTone } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { AppNotification } from "@/types/notifications";
import { formatRelative } from "@/utils/format";

const ICONS: Record<string, { icon: LucideIcon; tone: IconTileTone }> = {
  lead: { icon: PhoneIncoming, tone: "success" },
  review: { icon: MessageSquareText, tone: "warning" },
  review_reply: { icon: MessageSquareText, tone: "brand" },
  subscription: { icon: CreditCard, tone: "accent" },
  listing: { icon: Store, tone: "brand" },
  support: { icon: LifeBuoy, tone: "accent" },
};

interface Props {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
}

export const NotificationRow = memo(function NotificationRow({ notification, onPress }: Props) {
  const theme = useTheme();
  const { icon, tone } = ICONS[notification.type] ?? { icon: Bell, tone: "neutral" as const };
  const unread = !notification.isRead;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread. " : ""}${notification.title}`}
      accessibilityHint={unread ? "Opens it and marks it as read" : undefined}
      onPress={() => onPress(notification)}
      scale={false}
      style={[
        styles.row,
        {
          gap: theme.spacing[3],
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[4],
        },
      ]}
    >
      <AppIconTile icon={icon} tone={tone} size={42} />
      <View style={[styles.main, { gap: theme.spacing[0.5] }]}>
        <View style={[styles.titleRow, { gap: theme.spacing[2] }]}>
          <AppText variant="label" tone={unread ? "primary" : "secondary"} style={styles.title}>
            {notification.title}
          </AppText>
          {unread ? (
            <View style={[styles.dot, { backgroundColor: theme.colors.brand.primary }]} />
          ) : null}
        </View>
        {notification.body ? (
          <AppText variant="caption" tone="secondary" numberOfLines={3}>
            {notification.body}
          </AppText>
        ) : null}
        <AppText variant="micro" tone="tertiary" style={{ marginTop: theme.spacing[1] }}>
          {formatRelative(notification.createdAt)}
        </AppText>
      </View>
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
  titleRow: { alignItems: "center", flexDirection: "row" },
  title: { flex: 1 },
  dot: { borderRadius: 5, height: 9, width: 9 },
});
