import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppCard, AppText } from "@/components/design-system";
import { AppSegmented } from "@/components/forms";
import { SectionHeader } from "@/components/layout";
import { useTheme } from "@/hooks/useTheme";
import type { ChartMetric, DashboardSeriesPoint } from "@/types/dashboard";

const CHART_HEIGHT = 140;

const METRICS: { value: ChartMetric; label: string }[] = [
  { value: "leads", label: "Leads" },
  { value: "views", label: "Profile views" },
];

/** "2026-09-19" to "19/09" without timezone shifts. */
const shortDate = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

interface Props {
  series: DashboardSeriesPoint[];
  days: number;
}

/** Daily bar chart drawn with plain views: leads split by channel, or profile views. */
export function ActivityChart({ series, days }: Props) {
  const theme = useTheme();
  const [metric, setMetric] = useState<ChartMetric>("leads");
  const { max, total } = useMemo(() => {
    const values = series.map((s) => (metric === "leads" ? s.calls + s.whatsapp : s.views));
    return { max: Math.max(1, ...values), total: values.reduce((a, v) => a + v, 0) };
  }, [series, metric]);
  const gap = series.length <= 7 ? 8 : series.length <= 30 ? 3 : 1;
  const first = series[0];
  const last = series[series.length - 1];
  const colors = {
    calls: theme.colors.brand.primary,
    whatsapp: theme.colors.semantic.success,
    views: theme.colors.brand.accent,
  };
  const legend =
    metric === "leads"
      ? [
          { label: "Calls", color: colors.calls },
          { label: "WhatsApp", color: colors.whatsapp },
        ]
      : [{ label: "Profile views", color: colors.views }];

  return (
    <AppCard>
      <View style={{ gap: theme.spacing[3] }}>
        <SectionHeader title="Activity" subtitle={`Last ${days} days`} />
        <AppSegmented
          options={METRICS}
          value={metric}
          onChange={setMetric}
          accessibilityLabel="Chart metric"
        />
        <View style={styles.axisRow}>
          <AppText variant="caption" tone="tertiary">
            Peak {max.toLocaleString("en-IN")} a day
          </AppText>
          <AppText variant="caption" tone="secondary">
            {total.toLocaleString("en-IN")} total
          </AppText>
        </View>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${metric === "leads" ? "Leads" : "Profile views"} per day over the last ${days} days: ${total} in total, at most ${max} in one day.`}
          style={[
            styles.plot,
            {
              gap,
              height: CHART_HEIGHT,
              borderBottomColor: theme.colors.border.primary,
            },
          ]}
        >
          {series.map((s) => {
            const barRadius = gap > 1 ? 3 : 1;
            if (metric === "views") {
              return (
                <View key={s.date} style={styles.column}>
                  <View
                    style={{
                      height: s.views ? Math.max(2, (s.views / max) * CHART_HEIGHT) : 0,
                      backgroundColor: colors.views,
                      borderTopLeftRadius: barRadius,
                      borderTopRightRadius: barRadius,
                    }}
                  />
                </View>
              );
            }
            const leads = s.calls + s.whatsapp;
            const height = leads ? Math.max(2, (leads / max) * CHART_HEIGHT) : 0;
            return (
              <View key={s.date} style={styles.column}>
                <View
                  style={{
                    height,
                    overflow: "hidden",
                    borderTopLeftRadius: barRadius,
                    borderTopRightRadius: barRadius,
                  }}
                >
                  <View style={{ flex: s.whatsapp, backgroundColor: colors.whatsapp }} />
                  <View style={{ flex: s.calls, backgroundColor: colors.calls }} />
                </View>
              </View>
            );
          })}
        </View>
        {first && last ? (
          <View style={styles.axisRow}>
            <AppText variant="caption" tone="tertiary">
              {shortDate(first.date)}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              {shortDate(last.date)}
            </AppText>
          </View>
        ) : null}
        <View style={[styles.legend, { gap: theme.spacing[4] }]}>
          {legend.map((l) => (
            <View key={l.label} style={[styles.legendItem, { gap: theme.spacing[1.5] }]}>
              <View style={[styles.swatch, { backgroundColor: l.color }]} />
              <AppText variant="caption" tone="secondary">
                {l.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  axisRow: { flexDirection: "row", justifyContent: "space-between" },
  plot: { alignItems: "flex-end", borderBottomWidth: 1, flexDirection: "row" },
  column: { flex: 1, justifyContent: "flex-end", minWidth: 1 },
  legend: { flexDirection: "row", flexWrap: "wrap" },
  legendItem: { alignItems: "center", flexDirection: "row" },
  swatch: { borderRadius: 5, height: 10, width: 10 },
});
