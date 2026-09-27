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
    none: { label: "Not verified yet", bg: background.subtle, fg: text.secondary },
    partial: { label: "Partly verified", bg: semantic.warningSoft, fg: semantic.warningText },
    verified: { label: "Verified business", bg: semantic.successSoft, fg: semantic.success },
  }[status];
  return (
    <AppCard padding={14}>
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <View style={[styles.icon, { backgroundColor: look.bg, borderRadius: theme.radius.lg }]}>
          <BadgeCheck size={22} color={look.fg} />
        </View>
        <View style={[styles.body, { gap: 2 }]}>
          <AppText variant="section" accessibilityRole="header">
            {look.label}
          </AppText>
          <AppText variant="meta" tone="secondary">
            Verified businesses get a badge, rank higher and earn more trust.
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  icon: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  body: { flex: 1 },
});
