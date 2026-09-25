import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/design-system";
import { AppSelect, AppSwitchRow } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { Hours } from "@/types";
import { DAYS, DEFAULT_CLOSE, DEFAULT_OPEN, formatTime, timeOptions } from "./hoursRules";

interface Props {
  hours: Hours;
  error?: string;
  onChange: (dayOfWeek: number, patch: Partial<Hours>) => void;
}

/** One day: an open switch, and when open, opening and closing time pickers. */
export const DayHoursRow = memo(function DayHoursRow({ hours: h, error, onChange }: Props) {
  const theme = useTheme();
  const open = !!h.openTime || !!h.closeTime;
  const openOptions = useMemo(() => timeOptions("open", h.openTime), [h.openTime]);
  const closeOptions = useMemo(() => timeOptions("close", h.closeTime), [h.closeTime]);

  return (
    <View style={{ gap: theme.spacing[2], paddingVertical: theme.spacing[2] }}>
      <AppSwitchRow
        label={DAYS[h.dayOfWeek]}
        description={
          open && h.openTime && h.closeTime
            ? `${formatTime(h.openTime)} to ${formatTime(h.closeTime)}`
            : open
              ? "Pick both times"
              : "Closed"
        }
        value={open}
        onValueChange={(on) =>
          onChange(
            h.dayOfWeek,
            on
              ? { openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE }
              : { openTime: null, closeTime: null },
          )
        }
      />
      {open ? (
        <View style={[styles.times, { gap: theme.spacing[3] }]}>
          <View style={styles.cell}>
            <AppSelect
              label="Opens"
              placeholder="Opening time"
              options={openOptions}
              value={h.openTime}
              onChange={(openTime) => onChange(h.dayOfWeek, { openTime })}
            />
          </View>
          <View style={styles.cell}>
            <AppSelect
              label="Closes"
              placeholder="Closing time"
              options={closeOptions}
              value={h.closeTime}
              onChange={(closeTime) => onChange(h.dayOfWeek, { closeTime })}
            />
          </View>
        </View>
      ) : null}
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  times: { flexDirection: "row", flexWrap: "wrap" },
  cell: { flexBasis: 130, flexGrow: 1 },
});
