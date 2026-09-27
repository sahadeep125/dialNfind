import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ArrowDownRight, ArrowUpRight, Lock, type LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  /** Percent change against the previous period of the same length. */
  change?: number | null;
  /** Shows a lock and "Pro" instead of the value; tapping calls onPress. */
  locked?: boolean;
  onPress?: () => void;
}

/** One KPI: a quiet label, a loud number, and an optional trend. Lives inside AppStatGrid. */
export function AppStat({
  label,
  value,
  icon: Icon,
  hint,
  change,
  locked = false,
  onPress,
}: Props) {
  const theme = useTheme();
  const up = (change ?? 0) >= 0;
  const body = (
    <View style={[styles.cell, { padding: theme.spacing[3], gap: 2 }]}>
      <View style={[styles.head, { gap: theme.spacing[1.5] }]}>
        {Icon ? <Icon size={13} color={theme.colors.text.tertiary} /> : null}
        <AppText variant="meta" tone="secondary" numberOfLines={1} style={styles.shrink}>
          {label}
        </AppText>
      </View>
      <View style={[styles.valueRow, { gap: theme.spacing[1.5] }]}>
        {locked ? (
          <View style={[styles.head, { gap: 4 }]}>
            <Lock size={14} color={theme.colors.brand.primary} />
            <AppText variant="section" tone="brand">
              Pro
            </AppText>
          </View>
        ) : (
          <AppText variant="metric" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </AppText>
        )}
        {!locked && change !== undefined && change !== null ? (
          <View
            style={styles.head}
            accessible
            accessibilityLabel={`${up ? "Up" : "Down"} ${Math.abs(change)} percent`}
          >
            {up ? (
              <ArrowUpRight size={13} color={theme.colors.semantic.success} />
            ) : (
              <ArrowDownRight size={13} color={theme.colors.semantic.danger} />
            )}
            <AppText variant="caption" tone={up ? "success" : "danger"} numeric>
              {Math.abs(change)}%
            </AppText>
          </View>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="meta" numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${locked ? "locked" : value}`}
      onPress={onPress}
      scale={false}
    >
      {body}
    </AppPressable>
  );
}

/** KPIs on one outlined surface split by hairlines, instead of a card per number. */
export function AppStatGrid({ columns = 2, children }: { columns?: number; children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  const rule = { backgroundColor: theme.colors.border.primary };
  return (
    <View
      style={[
        styles.grid,
        {
          backgroundColor: theme.colors.background.elevated,
          borderColor: theme.colors.border.primary,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {rows.map((row, r) => (
        <View key={r}>
          {r > 0 ? <View style={[styles.hRule, rule]} /> : null}
          <View style={styles.row}>
            {row.map((item, c) => (
              <View key={c} style={styles.fill}>
                {c > 0 ? <View style={[styles.vRule, rule]} /> : null}
                {item}
              </View>
            ))}
            {Array.from({ length: columns - row.length }, (_, k) => (
              <View key={`pad-${k}`} style={styles.fill} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 },
  head: { alignItems: "center", flexDirection: "row" },
  shrink: { flexShrink: 1 },
  valueRow: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap" },
  grid: { borderCurve: "continuous", borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row" },
  fill: { flex: 1, minWidth: 0 },
  hRule: { height: StyleSheet.hairlineWidth },
  vRule: { bottom: 12, left: 0, position: "absolute", top: 12, width: StyleSheet.hairlineWidth },
});
