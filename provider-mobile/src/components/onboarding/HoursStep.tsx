import { Fragment } from "react";
import { View } from "react-native";

import { AppCard, AppDivider, AppText } from "@/components/design-system";
import { AppSwitchRow } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { Hours } from "@/types";
import type { StepErrors } from "@/types/onboarding";
import { DAY_ORDER, validateHours } from "@/utils/onboarding";
import { HourRow } from "./HourRow";
import { StepTitle } from "./StepTitle";

interface Props {
  value: Hours[];
  errors: StepErrors;
  onChange: (hours: Hours[]) => void;
}

/** Step 4: opening hours for each day, or open around the clock. */
export function HoursStep({ value, errors, onChange }: Props) {
  const theme = useTheme();
  const dayErrors = validateHours(value);
  const allDay = value.some((h) => h.is24x7);
  const byDay = (d: number): Hours =>
    value.find((h) => h.dayOfWeek === d) ?? {
      dayOfWeek: d,
      openTime: null,
      closeTime: null,
      is24x7: false,
    };
  const set = (d: number, patch: Partial<Hours>): void =>
    onChange(DAY_ORDER.map((x) => (x === d ? { ...byDay(x), ...patch } : byDay(x))));
  const copyMonday = (): void => {
    const monday = byDay(1);
    onChange(
      DAY_ORDER.map((d) =>
        d >= 2 && d <= 6
          ? { ...byDay(d), openTime: monday.openTime, closeTime: monday.closeTime }
          : byDay(d),
      ),
    );
  };

  return (
    <View style={{ gap: theme.spacing[5] }}>
      <StepTitle
        title="When can customers call you?"
        subtitle="We show an Open now label during these hours."
      />
      <AppCard variant="flat">
        <AppSwitchRow
          label="Open 24 hours, 7 days"
          description="For emergency services that take calls any time."
          value={allDay}
          onValueChange={(v) =>
            onChange(
              DAY_ORDER.map((d) => ({
                dayOfWeek: d,
                is24x7: v,
                openTime: v ? null : "09:00",
                closeTime: v ? null : "20:00",
              })),
            )
          }
        />
      </AppCard>
      {!allDay ? (
        <AppCard variant="flat" padding={theme.spacing[4]}>
          {DAY_ORDER.map((d, i) => (
            <Fragment key={d}>
              {i > 0 ? <AppDivider /> : null}
              <HourRow
                hours={byDay(d)}
                error={dayErrors[d]}
                onChange={(patch) => set(d, patch)}
                onCopyToWeek={d === 1 ? copyMonday : undefined}
              />
            </Fragment>
          ))}
        </AppCard>
      ) : null}
      {errors.hours && Object.keys(dayErrors).length ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {errors.hours}
        </AppText>
      ) : null}
    </View>
  );
}
