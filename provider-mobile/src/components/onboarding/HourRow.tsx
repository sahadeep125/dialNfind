import { memo } from "react";
import { Copy } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { DayTimeRow } from "@/components/hours/DayTimeRow";
import { useTheme } from "@/hooks/useTheme";
import type { Hours } from "@/types";
import { DAY_NAMES } from "@/utils/onboarding";

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
  return (
    <DayTimeRow
      day={DAY_NAMES[hours.dayOfWeek]}
      openTime={hours.openTime}
      closeTime={hours.closeTime}
      error={error}
      onChange={onChange}
      extra={
        onCopyToWeek ? (
          <AppPressable
            accessibilityRole="button"
            onPress={onCopyToWeek}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}
          >
            <Copy size={12} color={theme.colors.brand.primary} />
            <AppText variant="caption" tone="brand">
              Copy to Tue–Sat
            </AppText>
          </AppPressable>
        ) : undefined
      }
    />
  );
});
