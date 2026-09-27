import { StyleSheet, View } from "react-native";
import { Bell } from "lucide-react-native";

import {
  AppAvatar,
  AppBadge,
  AppIconButton,
  AppText,
  type BadgeTone,
} from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderStatus } from "@/types";

const STATUS: Record<ProviderStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Live", tone: "success" },
  pending: { label: "In review", tone: "warning" },
  rejected: { label: "Not approved", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

interface Props {
  businessName: string;
  logoUrl?: string | null;
  status: ProviderStatus;
  unread: number;
  onOpenNotifications: () => void;
}

/** Who you are and whether you are live, with the bell on the right. */
export function DashboardHeader({
  businessName,
  logoUrl,
  status,
  unread,
  onOpenNotifications,
}: Props) {
  const theme = useTheme();
  const badge = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <View style={[styles.row, { gap: theme.spacing[3], paddingTop: theme.spacing[2] }]}>
      <AppAvatar name={businessName || "?"} uri={logoUrl} size={40} shape="rounded" />
      <View style={styles.titles}>
        <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
          {businessName}
        </AppText>
        <AppBadge label={badge.label} tone={badge.tone} dot />
      </View>
      <AppIconButton
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
        variant="surface"
        badge={unread}
        icon={<Bell size={18} color={theme.colors.text.primary} />}
        onPress={onOpenNotifications}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  titles: { flex: 1, gap: 3, minWidth: 0 },
});
