import { StyleSheet, View } from "react-native";
import { BadgeCheck } from "lucide-react-native";

import { AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { VerificationStatus } from "@/types";

interface Props {
  status: VerificationStatus;
}

export function VerificationStatusCard({ status }: Props) {
  const theme = useTheme();
  const { semantic, background, text } = theme.colors;
  const look = {
    none: { label: "Not verified", bg: background.tertiary, fg: text.secondary },
    partial: { label: "Partially verified", bg: semantic.warningSoft, fg: semantic.warningText },
    verified: { label: "Verified business", bg: semantic.successSoft, fg: semantic.success },
  }[status];
  return (
    <AppCard>
      <View style={[styles.row, { gap: theme.spacing[4] }]}>
        <View style={[styles.icon, { backgroundColor: look.bg, borderRadius: theme.radius.lg }]}>
          <BadgeCheck size={26} color={look.fg} />
        </View>
        <View style={[styles.body, { gap: theme.spacing[1] }]}>
          <AppText variant="subheading" accessibilityRole="header">
            {look.label}
          </AppText>
          <AppText variant="caption" tone="secondary">
            Verified businesses get a badge, rank higher and earn more trust. Our team reviews each
            document within two working days.
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  icon: { alignItems: "center", height: 52, justifyContent: "center", width: 52 },
  body: { flex: 1 },
});
