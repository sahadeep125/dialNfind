import { forwardRef, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppField } from "./AppField";
import { AppText } from "./AppText";

interface Props extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string | null;
  required?: boolean;
  leadingIcon?: ReactNode;
  /** Fixed text before the value, e.g. "+91" or "₹". */
  prefix?: string;
  trailingAction?: { icon: ReactNode; onPress: () => void; accessibilityLabel: string };
  /** sm is the 36pt search-bar size with a subtle fill. */
  size?: "sm" | "md";
}

export const AppInput = forwardRef<TextInput, Props>(function AppInput(
  {
    label,
    helper,
    error,
    required,
    leadingIcon,
    prefix,
    trailingAction,
    multiline,
    style,
    onFocus,
    onBlur,
    editable = true,
    size = "md",
    ...props
  },
  ref,
) {
  const theme = useTheme();
  const tokens = theme.components.input;
  const [focused, setFocused] = useState(false);
  const small = size === "sm";
  const borderColor = error
    ? tokens.errorBorder
    : focused
      ? tokens.focusBorder
      : small
        ? theme.colors.background.subtle
        : tokens.border;

  return (
    <AppField label={label} helper={helper} error={error} required={required}>
      <View
        style={[
          styles.field,
          {
            alignItems: multiline ? "flex-start" : "center",
            backgroundColor: !editable
              ? theme.colors.background.tertiary
              : small && !focused
                ? theme.colors.background.subtle
                : tokens.background,
            borderColor,
            borderRadius: small ? theme.radius.md : tokens.radius,
            borderWidth: focused || error ? theme.borderWidth.focus : theme.borderWidth.default,
            minHeight: multiline ? 96 : small ? tokens.heightSm : tokens.height,
            paddingHorizontal: tokens.paddingHorizontal,
            paddingVertical: multiline ? theme.spacing[2.5] : 0,
            gap: theme.spacing[2],
          },
        ]}
      >
        {leadingIcon ? <View>{leadingIcon}</View> : null}
        {prefix ? (
          <AppText tone="secondary" weight="medium">
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={tokens.placeholder}
          accessibilityLabel={label}
          aria-invalid={!!error}
          maxFontSizeMultiplier={1.5}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
          style={[
            theme.typography.body,
            styles.input,
            { color: theme.colors.text.primary, textAlignVertical: multiline ? "top" : "center" },
            style,
          ]}
        />
        {trailingAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trailingAction.accessibilityLabel}
            hitSlop={12}
            onPress={trailingAction.onPress}
          >
            {trailingAction.icon}
          </Pressable>
        ) : null}
      </View>
    </AppField>
  );
});

const styles = StyleSheet.create({
  field: { borderCurve: "continuous", flexDirection: "row" },
  input: {
    flex: 1,
    minHeight: 22,
    paddingVertical: 0,
    // Hides the browser focus ring on web; native only accepts solid, dotted or dashed here.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
});
