import { StyleSheet, View } from "react-native";
import { Bell } from "lucide-react-native";

import { AppBadge, AppIconButton, AppText, type BadgeTone } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderStatus } from "@/types";
import { greeting } from "@/utils/format";

const STATUS: Record<ProviderStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Live", tone: "success" },
  pending: { label: "Awaiting approval", tone: "warning" },
  rejected: { label: "Not approved", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

interface Props {
  businessName: string;
  status: ProviderStatus;
  unread: number;
  onOpenNotifications: () => void;
}

export function DashboardHeader({ businessName, status, unread, onOpenNotifications }: Props) {
  const theme = useTheme();
  const badge = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <View style={[styles.row, { gap: theme.spacing[3] }]}>
      <View style={[styles.titles, { gap: theme.spacing[1] }]}>
        <AppText variant="body" tone="secondary">
          {greeting()}
        </AppText>
        <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
          {businessName}
        </AppText>
        <View style={styles.badge}>
          <AppBadge label={badge.label} tone={badge.tone} />
        </View>
      </View>
      <View>
        <AppIconButton
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
          variant="surface"
          icon={<Bell size={22} color={theme.colors.text.primary} />}
          onPress={onOpenNotifications}
        />
        {unread > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.semantic.danger,
                borderColor: theme.colors.background.primary,
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  titles: { flex: 1, minWidth: 0 },
  badge: { alignItems: "flex-start" },
  dot: {
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    position: "absolute",
    right: 8,
    top: 8,
    width: 12,
  },
});
