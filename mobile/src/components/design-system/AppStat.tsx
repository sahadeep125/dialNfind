import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppText } from "./AppText";

interface Props {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Color for the icon, e.g. the star color next to a rating. Defaults to brand. */
  iconColor?: string;
}

/** A key figure with its label, laid out in a row of stats (rating, reviews, years, jobs). */
export function AppStat({ value, label, icon: Icon, iconColor }: Props) {
  const theme = useTheme();
  const color = iconColor ?? theme.colors.brand.primary;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={styles.valueRow}>
        {Icon ? (
          <Icon
            size={16}
            color={color}
            fill={iconColor ? color : "transparent"}
            strokeWidth={2.2}
          />
        ) : null}
        <AppText variant="subheading" numberOfLines={1}>
          {value}
        </AppText>
      </View>
      <AppText variant="micro" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/** Evenly spaced row of AppStat with hairline separators. */
export function AppStatRow({ stats }: { stats: Props[] }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.background.tertiary,
          borderRadius: theme.radius.lg,
          paddingVertical: theme.spacing[3],
        },
      ]}
    >
      {stats.map((s, i) => (
        <View key={s.label} style={styles.cell}>
          {i > 0 ? (
            <View style={[styles.sep, { backgroundColor: theme.colors.border.secondary }]} />
          ) : null}
          <AppStat {...s} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", flex: 1, gap: 2, paddingHorizontal: 4 },
  valueRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  row: { borderCurve: "continuous", flexDirection: "row" },
  cell: { flex: 1, flexDirection: "row" },
  sep: { alignSelf: "center", height: 28, width: 1 },
});
