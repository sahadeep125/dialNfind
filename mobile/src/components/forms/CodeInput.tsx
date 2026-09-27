import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/design-system";
import { fontFamily } from "@/constants/typography";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  value: string;
  onChange: (digits: string) => void;
  length?: number;
  error?: string | null;
  autoFocus?: boolean;
  accessibilityLabel?: string;
}

/**
 * One-time code as a row of boxes. A single hidden field takes the input, so paste and the
 * keyboard's code suggestion (iOS and Android) fill every box at once.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error,
  autoFocus,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(!!autoFocus);
  const active = Math.min(value.length, length - 1);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => ref.current?.focus()} style={styles.row} accessible={false}>
        {Array.from({ length }, (_, i) => {
          const digit = value[i];
          const isActive = focused && i === active;
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  backgroundColor:
                    isActive || digit
                      ? theme.colors.background.elevated
                      : theme.colors.background.tertiary,
                  borderColor: error
                    ? theme.colors.semantic.danger
                    : isActive
                      ? theme.colors.brand.primary
                      : digit
                        ? theme.colors.border.secondary
                        : theme.colors.background.tertiary,
                  borderRadius: theme.radius.md,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              <AppText style={[styles.digit, { color: theme.colors.text.primary }]}>
                {digit ?? ""}
              </AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        accessibilityLabel={accessibilityLabel ?? `${length}-digit code`}
        aria-invalid={!!error}
        style={styles.hidden}
      />
      {error ? (
        <AppText variant="caption" tone="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: {
    alignItems: "center",
    aspectRatio: 0.86,
    borderCurve: "continuous",
    flex: 1,
    justifyContent: "center",
    maxWidth: 54,
  },
  digit: { fontFamily: fontFamily.displayBold, fontSize: 24, lineHeight: 30 },
  // Kept on screen (not display: none) so the OS still offers the code from SMS or email.
  hidden: { height: 1, opacity: 0, position: "absolute", width: 1 },
});
