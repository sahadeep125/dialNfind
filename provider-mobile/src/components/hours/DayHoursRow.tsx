import { memo } from "react";

import type { Hours } from "@/types";
import { DayTimeRow } from "./DayTimeRow";
import { DAYS } from "./hoursRules";

interface Props {
  hours: Hours;
  error?: string;
  onChange: (dayOfWeek: number, patch: Partial<Hours>) => void;
}

/** One day in the hours editor: an open switch and native time pickers on a single line. */
export const DayHoursRow = memo(function DayHoursRow({ hours: h, error, onChange }: Props) {
  return (
    <DayTimeRow
      day={DAYS[h.dayOfWeek]}
      openTime={h.openTime}
      closeTime={h.closeTime}
      error={error}
      onChange={(patch) => onChange(h.dayOfWeek, patch)}
    />
  );
});
