import { memo } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { Copy } from "lucide-react-native";

import { AppButton, AppText } from "@/components/design-system";
import { AppSelect } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { Hours } from "@/types";
import { DAY_NAMES, TIME_OPTIONS } from "@/utils/onboarding";

interface Props {
  hours: Hours;
  error?: string;
  onChange: (patch: Partial<Hours>) => void;
  /** Shown on Monday: copies its times to Tuesday through Saturday. */
  onCopyToWeek?: () => void;
}

/** One day of opening hours: open or closed, and from when to when. */
export const HourRow = memo(function HourRow({ hours, error, onChange, onCopyToWeek }: Props) {
  const theme = useTheme();
  const day = DAY_NAMES[hours.dayOfWeek];
  const open = !!hours.openTime || !!hours.closeTime;
  return (
    <View style={{ gap: theme.spacing[2], paddingVertical: theme.spacing[3] }}>
      <View style={styles.head}>
        <Switch
          accessibilityLabel={`${day} open`}
          value={open}
          onValueChange={(v) =>
            onChange(
              v ? { openTime: "09:00", closeTime: "20:00" } : { openTime: null, closeTime: null },
            )
          }
          trackColor={{ false: theme.colors.border.secondary, true: theme.colors.brand.primary }}
          ios_backgroundColor={theme.colors.border.secondary}
        />
        <AppText variant="label" style={styles.day}>
          {day}
        </AppText>
        {!open ? (
          <AppText variant="caption" tone="tertiary">
            Closed
          </AppText>
        ) : onCopyToWeek ? (
          <AppButton
            size="sm"
            variant="ghost"
            onPress={onCopyToWeek}
            leadingIcon={<Copy size={14} color={theme.colors.text.primary} />}
          >
            Copy to Tue-Sat
          </AppButton>
        ) : null}
      </View>
      {open ? (
        <View style={[styles.times, { gap: theme.spacing[2] }]}>
          <View style={styles.time}>
            <AppSelect
              label="Opens"
              options={TIME_OPTIONS}
              value={hours.openTime}
              onChange={(openTime) => onChange({ openTime })}
              placeholder="Opening time"
              error={error ? " " : null}
            />
          </View>
          <View style={styles.time}>
            <AppSelect
              label="Closes"
              options={TIME_OPTIONS}
              value={hours.closeTime}
              onChange={(closeTime) => onChange({ closeTime })}
              placeholder="Closing time"
              error={error ? " " : null}
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
  head: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 44 },
  day: { flex: 1 },
  times: { flexDirection: "row", flexWrap: "wrap" },
  time: { flexBasis: 120, flexGrow: 1 },
});
