import { memo, type ReactNode } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/design-system";
import { AppTimePicker } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import { clockToDate, dateToClock } from "@/utils/format";
import { DEFAULT_CLOSE, DEFAULT_OPEN } from "./hoursRules";

interface Props {
  day: string;
  openTime: string | null;
  closeTime: string | null;
  error?: string;
  onChange: (patch: { openTime: string | null; closeTime: string | null }) => void;
  /** A small action under the times, e.g. "Copy to Tue–Sat" on Monday. */
  extra?: ReactNode;
}

/** One day on one line: name, opening and closing time pickers, and an open switch. */
export const DayTimeRow = memo(function DayTimeRow({
  day,
  openTime,
  closeTime,
  error,
  onChange,
  extra,
}: Props) {
  const theme = useTheme();
  const open = !!openTime || !!closeTime;
  return (
    <View
      style={{ paddingHorizontal: 14, paddingVertical: theme.spacing[2], gap: theme.spacing[1.5] }}
    >
      <View style={[styles.row, { gap: theme.spacing[2], minHeight: 36 }]}>
        <AppText
          variant="label"
          style={[styles.day, !open ? { color: theme.colors.text.tertiary } : null]}
          numberOfLines={1}
        >
          {day.slice(0, 3)}
        </AppText>
        {open ? (
          <View style={[styles.row, styles.times, { gap: theme.spacing[1.5] }]}>
            <AppTimePicker
              appearance="inline"
              label={`${day} opens`}
              value={openTime ? clockToDate(openTime) : null}
              minuteInterval={15}
              error={error ? " " : null}
              onChange={(d) => onChange({ openTime: dateToClock(d), closeTime })}
            />
            <AppText variant="meta">to</AppText>
            <AppTimePicker
              appearance="inline"
              label={`${day} closes`}
              value={closeTime ? clockToDate(closeTime) : null}
              minuteInterval={15}
              error={error ? " " : null}
              onChange={(d) => onChange({ openTime, closeTime: dateToClock(d) })}
            />
          </View>
        ) : (
          <AppText variant="meta" style={styles.times}>
            Closed
          </AppText>
        )}
        <Switch
          accessibilityLabel={`${day} open`}
          value={open}
          onValueChange={(v) =>
            onChange(
              v
                ? { openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE }
                : { openTime: null, closeTime: null },
            )
          }
          trackColor={{ false: theme.colors.border.secondary, true: theme.colors.semantic.success }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={theme.colors.border.secondary}
          style={styles.switch}
        />
      </View>
      {error ? (
        <AppText
          variant="meta"
          tone="danger"
          accessibilityLiveRegion="polite"
          style={styles.indent}
        >
          {error}
        </AppText>
      ) : null}
      {extra && open ? <View style={styles.indent}>{extra}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  day: { width: 44 },
  times: { flex: 1 },
  switch: { transform: [{ scale: 0.85 }] },
  indent: { marginLeft: 52 },
});
