import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock } from "lucide-react-native";

import {
  AppButton,
  AppField,
  AppInput,
  AppPressable,
  AppSheet,
  AppText,
} from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { formatDate, formatClock } from "@/utils/format";

type Mode = "date" | "time";

export interface DateTimeFieldProps {
  label?: string;
  placeholder?: string;
  value: Date | null;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Time only: step between selectable minutes. */
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  error?: string | null;
  helper?: string;
  required?: boolean;
  disabled?: boolean;
  /** "field" is the full form control; "inline" is a compact tappable value for dense rows. */
  appearance?: "field" | "inline";
}

const pad = (n: number): string => String(n).padStart(2, "0");
const toWebValue = (mode: Mode, d: Date): string =>
  mode === "date"
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function fromWebValue(mode: Mode, text: string, base: Date): Date | null {
  if (mode === "date") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const next = new Date(base);
  next.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return next;
}

/**
 * Native date or time picker behind a themed field. Android opens the system dialog; iOS shows the
 * native picker in a bottom sheet with a Done button, so the choice is confirmed, not applied on scroll.
 */
export function AppDateTimeField({
  mode,
  label,
  placeholder,
  value,
  onChange,
  minimumDate,
  maximumDate,
  minuteInterval,
  error,
  helper,
  required,
  disabled,
  appearance = "field",
}: DateTimeFieldProps & { mode: Mode }) {
  const theme = useTheme();
  const tokens = theme.components.input;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const Icon = mode === "date" ? CalendarDays : Clock;
  const text = value
    ? mode === "date"
      ? formatDate(value.toISOString())
      : formatClock(value)
    : null;
  const fallback = placeholder ?? (mode === "date" ? "Pick a date" : "Pick a time");

  if (Platform.OS === "web") {
    return (
      <AppInput
        label={label}
        helper={helper ?? (mode === "date" ? "YYYY-MM-DD" : "HH:MM, 24 hour")}
        error={error}
        required={required}
        editable={!disabled}
        defaultValue={value ? toWebValue(mode, value) : ""}
        placeholder={mode === "date" ? "2026-01-31" : "09:30"}
        onEndEditing={(e) => {
          const next = fromWebValue(mode, e.nativeEvent.text, value ?? new Date());
          if (next) onChange(next);
        }}
      />
    );
  }

  const openPicker = (): void => {
    const start = value ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: start,
        mode,
        is24Hour: false,
        minimumDate,
        maximumDate,
        minuteInterval,
        onValueChange: (_event, date) => onChange(date),
      });
      return;
    }
    setDraft(start);
    setOpen(true);
  };

  const trigger =
    appearance === "inline" ? (
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? fallback}: ${text ?? "not set"}`}
        disabled={disabled}
        onPress={openPicker}
        hitSlop={6}
        style={[
          styles.inline,
          {
            backgroundColor: theme.colors.background.subtle,
            borderColor: error ? tokens.errorBorder : theme.colors.background.subtle,
            borderRadius: theme.radius.sm,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        <AppText variant="label" numeric tone={text ? "primary" : "tertiary"}>
          {text ?? "--:--"}
        </AppText>
      </AppPressable>
    ) : (
      <AppField label={label} helper={helper} error={error} required={required}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={`${label ?? fallback}: ${text ?? "not set"}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          scale={false}
          onPress={openPicker}
          style={[
            styles.field,
            {
              gap: theme.spacing[2],
              minHeight: tokens.height,
              borderRadius: tokens.radius,
              paddingHorizontal: tokens.paddingHorizontal,
              backgroundColor: disabled ? theme.colors.background.tertiary : tokens.background,
              borderColor: error ? tokens.errorBorder : tokens.border,
              borderWidth: error ? theme.borderWidth.focus : theme.borderWidth.default,
            },
          ]}
        >
          <AppText
            tone={text ? "primary" : "tertiary"}
            numeric
            numberOfLines={1}
            style={styles.flex}
          >
            {text ?? fallback}
          </AppText>
          <Icon size={16} color={theme.colors.text.tertiary} />
        </AppPressable>
      </AppField>
    );

  return (
    <>
      {trigger}
      {Platform.OS === "ios" ? (
        <AppSheet visible={open} onClose={() => setOpen(false)} title={label ?? fallback}>
          <View style={{ paddingHorizontal: theme.spacing[4], gap: theme.spacing[3] }}>
            <View style={styles.center}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === "date" ? "inline" : "spinner"}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                minuteInterval={minuteInterval}
                accentColor={theme.colors.brand.primary}
                themeVariant={theme.mode}
                onValueChange={(_event, date) => setDraft(date)}
              />
            </View>
            <AppButton
              fullWidth
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Done
            </AppButton>
          </View>
        </AppSheet>
      ) : null}
    </>
  );
}

export function AppDatePicker(props: DateTimeFieldProps) {
  return <AppDateTimeField mode="date" {...props} />;
}

export function AppTimePicker(props: DateTimeFieldProps) {
  return <AppDateTimeField mode="time" {...props} />;
}

const styles = StyleSheet.create({
  field: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
  center: { alignItems: "center" },
  inline: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
