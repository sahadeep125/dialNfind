import { StyleSheet, View } from "react-native";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react-native";

import { AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

export type StatTone = "brand" | "accent" | "success" | "warning";

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: StatTone;
  hint: string;
  /** Percent change against the previous period of the same length. */
  change?: number | null;
}

export function StatCard({ label, value, icon: Icon, tone, hint, change }: Props) {
  const theme = useTheme();
  const { brand, semantic, background } = theme.colors;
  const tones: Record<StatTone, { bg: string; fg: string }> = {
    brand: { bg: brand.soft, fg: brand.primary },
    accent: { bg: background.tertiary, fg: brand.accent },
    success: { bg: semantic.successSoft, fg: semantic.success },
    warning: { bg: semantic.warningSoft, fg: semantic.warningText },
  };
  const up = (change ?? 0) >= 0;
  return (
    <AppCard style={styles.fill} padding={theme.spacing[3]}>
      <View style={[styles.head, { gap: theme.spacing[2] }]}>
        <AppText variant="caption" tone="secondary" numberOfLines={2} style={styles.fill}>
          {label}
        </AppText>
        <View
          style={[styles.icon, { backgroundColor: tones[tone].bg, borderRadius: theme.radius.sm }]}
        >
          <Icon size={16} color={tones[tone].fg} />
        </View>
      </View>
      <View style={[styles.valueRow, { gap: theme.spacing[1.5], marginTop: theme.spacing[1] }]}>
        <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
        {change !== undefined && change !== null ? (
          <View
            style={styles.change}
            accessible
            accessibilityLabel={`${up ? "Up" : "Down"} ${Math.abs(change)} percent`}
          >
            {up ? (
              <ArrowUpRight size={14} color={semantic.success} />
            ) : (
              <ArrowDownRight size={14} color={semantic.danger} />
            )}
            <AppText variant="caption" tone={up ? "success" : "danger"}>
              {Math.abs(change)}%
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText
        variant="caption"
        tone="tertiary"
        numberOfLines={2}
        style={{ marginTop: theme.spacing[1] }}
      >
        {hint}
      </AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { alignItems: "flex-start", flexDirection: "row" },
  icon: { alignItems: "center", height: 30, justifyContent: "center", width: 30 },
  valueRow: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap" },
  change: { alignItems: "center", flexDirection: "row" },
});
