import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppSection } from "@/components/design-system";
import { AppSwitchRow } from "@/components/forms";
import { ScreenScroll } from "@/components/layout";
import { SaveBar } from "@/components/profile/SaveBar";
import { useSaveHours } from "@/hooks/useHours";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { Hours } from "@/types";
import { DayHoursRow } from "./DayHoursRow";
import {
  DAY_ORDER,
  DEFAULT_CLOSE,
  DEFAULT_HOURS,
  DEFAULT_OPEN,
  normalizeHours,
  validateHours,
} from "./hoursRules";

interface Props {
  saved: Hours[];
}

export function HoursEditor({ saved }: Props) {
  const toast = useToast();
  const save = useSaveHours();
  const initial = useMemo(() => (saved.length ? normalizeHours(saved) : DEFAULT_HOURS), [saved]);
  const [hours, setHours] = useState<Hours[]>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateHours(hours);
  const allDay = hours.some((h) => h.is24x7);
  // Never-saved hours are "dirty" so the provider can save the suggested defaults in one tap.
  const dirty = !saved.length || JSON.stringify(hours) !== JSON.stringify(initial);
  const monday = hours[1];
  const mondayOpen = !!monday.openTime && !!monday.closeTime;

  const setDay = useCallback((dayOfWeek: number, patch: Partial<Hours>) => {
    setHours((list) => list.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h)));
  }, []);

  const setAllDay = (on: boolean): void =>
    setHours((list) =>
      list.map((h) => ({
        ...h,
        is24x7: on,
        openTime: on ? null : DEFAULT_OPEN,
        closeTime: on ? null : DEFAULT_CLOSE,
      })),
    );

  const copyMonday = (): void => {
    setHours((list) =>
      list.map((h) => ({ ...h, openTime: monday.openTime, closeTime: monday.closeTime })),
    );
    toast("Monday's hours copied to every day", "success");
  };

  const submit = (): void => {
    setShowErrors(true);
    if (Object.keys(errors).length) {
      toast("Fix the highlighted days before saving", "error");
      return;
    }
    save.mutate(hours, {
      onSuccess: (provider) => {
        setHours(normalizeHours(provider.businessHours));
        setShowErrors(false);
        toast("Working hours saved", "success");
      },
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });
  };

  return (
    <View style={styles.flex}>
      <ScreenScroll keyboard>
        <AppSection footer="Customers see an Open now label during these hours.">
          <AppSwitchRow
            inset
            label="Open 24 hours, 7 days"
            description="For emergency services that take calls any time."
            value={allDay}
            onValueChange={setAllDay}
          />
        </AppSection>
        {allDay ? null : (
          <AppSection
            title="Weekly hours"
            action={mondayOpen ? { label: "Copy Monday to all", onPress: copyMonday } : undefined}
            dividerInset={14}
          >
            {DAY_ORDER.map((d) => (
              <DayHoursRow
                key={d}
                hours={hours[d]}
                error={showErrors ? errors[d] : undefined}
                onChange={setDay}
              />
            ))}
          </AppSection>
        )}
      </ScreenScroll>
      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        onSave={submit}
        onDiscard={saved.length ? () => (setHours(initial), setShowErrors(false)) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
