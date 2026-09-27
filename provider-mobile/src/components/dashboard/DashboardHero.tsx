import { StyleSheet, Switch, View } from "react-native";
import { ArrowDownRight, ArrowUpRight, MessageCircle, Phone } from "lucide-react-native";

import { AppCard, AppText } from "@/components/design-system";
import { AppSegmented } from "@/components/forms";
import { useSetAvailability } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { DashboardDays } from "@/types/dashboard";

const RANGES: { value: DashboardDays; label: string }[] = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const WHITE_70 = "rgba(255,255,255,0.72)";
const count = (n: number): string => n.toLocaleString("en-IN");

interface Props {
  days: DashboardDays;
  onDaysChange: (days: DashboardDays) => void;
  leads: number;
  calls: number;
  whatsapp: number;
  change: number | null;
  /** Null hides the availability switch (listing not live yet). */
  isAvailable: boolean | null;
}

/** The headline: how many customers reached out in the period, and whether the provider is taking work. */
export function DashboardHero({
  days,
  onDaysChange,
  leads,
  calls,
  whatsapp,
  change,
  isAvailable,
}: Props) {
  const theme = useTheme();
  const toast = useToast();
  const set = useSetAvailability();
  const up = (change ?? 0) >= 0;

  return (
    <AppCard variant="hero" padding={0}>
      <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
        <View style={styles.row}>
          <AppText variant="caption" style={[styles.flex, { color: WHITE_70 }]}>
            Leads in the last {days} days
          </AppText>
          <View style={styles.range}>
            <AppSegmented
              options={RANGES}
              value={days}
              onChange={onDaysChange}
              size="sm"
              appearance="onHero"
              accessibilityLabel="Date range"
            />
          </View>
        </View>
        <View style={[styles.valueRow, { gap: theme.spacing[2] }]}>
          <AppText variant="display" tone="white" numeric style={styles.big}>
            {count(leads)}
          </AppText>
          {change !== null ? (
            <View
              style={[
                styles.delta,
                {
                  backgroundColor: up ? "rgba(43,197,146,0.2)" : "rgba(242,85,97,0.22)",
                  borderRadius: theme.radius.full,
                },
              ]}
              accessible
              accessibilityLabel={`${up ? "Up" : "Down"} ${Math.abs(change)} percent on the previous period`}
            >
              {up ? (
                <ArrowUpRight size={12} color="#7BE7C0" />
              ) : (
                <ArrowDownRight size={12} color="#FF9AA2" />
              )}
              <AppText variant="caption" numeric style={{ color: up ? "#7BE7C0" : "#FF9AA2" }}>
                {Math.abs(change)}%
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={[styles.row, { gap: theme.spacing[4] }]}>
          <View style={[styles.row, { gap: theme.spacing[1.5] }]}>
            <Phone size={13} color={WHITE_70} />
            <AppText variant="meta" numeric style={{ color: WHITE_70 }}>
              {count(calls)} calls
            </AppText>
          </View>
          <View style={[styles.row, { gap: theme.spacing[1.5] }]}>
            <MessageCircle size={13} color={WHITE_70} />
            <AppText variant="meta" numeric style={{ color: WHITE_70 }}>
              {count(whatsapp)} WhatsApp
            </AppText>
          </View>
        </View>
      </View>
      {isAvailable !== null ? (
        <View
          style={[
            styles.row,
            styles.footer,
            {
              paddingHorizontal: theme.spacing[4],
              paddingVertical: theme.spacing[2],
              gap: theme.spacing[2.5],
            },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: isAvailable, disabled: set.isPending }}
          accessibilityLabel="Taking new customers"
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: isAvailable ? "#2BC592" : "rgba(255,255,255,0.4)" },
            ]}
          />
          <View style={styles.flex}>
            <AppText variant="label" tone="white">
              {isAvailable ? "Taking new customers" : "Not taking new work"}
            </AppText>
            <AppText variant="meta" style={{ color: WHITE_70 }} numberOfLines={1}>
              {isAvailable
                ? "You show as available in search"
                : "You rank lower until you switch this on"}
            </AppText>
          </View>
          <Switch
            value={isAvailable}
            disabled={set.isPending}
            onValueChange={(v) =>
              set.mutate(v, {
                onSuccess: () =>
                  toast(v ? "You are shown as available" : "Marked as unavailable", "success"),
                onError: (error: Error) => toast(errorMessage(error), "error"),
              })
            }
            trackColor={{ false: "rgba(255,255,255,0.25)", true: "#2BC592" }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="rgba(255,255,255,0.25)"
          />
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1, minWidth: 0 },
  range: { width: 140 },
  valueRow: { alignItems: "center", flexDirection: "row" },
  big: { fontSize: 40, lineHeight: 46 },
  delta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  footer: {
    backgroundColor: "rgba(0,0,0,0.16)",
    borderTopColor: "rgba(255,255,255,0.1)",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dot: { borderRadius: 4, height: 8, width: 8 },
});
