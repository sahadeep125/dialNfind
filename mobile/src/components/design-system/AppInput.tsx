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
import { AppText } from "./AppText";

interface Props extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string | null;
  required?: boolean;
  leadingIcon?: ReactNode;
  trailingAction?: { icon: ReactNode; onPress: () => void; accessibilityLabel: string };
  /** "filled" sits on the canvas or a card; "outlined" is for use on a filled surface. */
  appearance?: "filled" | "outlined";
}

/** Text field: a quiet filled well that lifts to a white surface with a brand edge while focused. */
export const AppInput = forwardRef<TextInput, Props>(function AppInput(
  {
    label,
    helper,
    error,
    required,
    leadingIcon,
    trailingAction,
    appearance = "filled",
    multiline,
    style,
    onFocus,
    onBlur,
    editable = true,
    ...props
  },
  ref,
) {
  const theme = useTheme();
  const tokens = theme.components.input;
  const [focused, setFocused] = useState(false);
  const outlined = appearance === "outlined";
  const borderColor = error
    ? tokens.errorBorder
    : focused
      ? tokens.focusBorder
      : outlined
        ? theme.colors.border.secondary
        : tokens.border;
  const backgroundColor = !editable
    ? theme.colors.background.tertiary
    : focused || outlined
      ? tokens.focusBackground
      : tokens.background;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="labelSmall" tone="secondary">
          {label}
          {required ? (
            <AppText variant="labelSmall" tone="danger">
              {" "}
              *
            </AppText>
          ) : null}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          {
            alignItems: multiline ? "flex-start" : "center",
            backgroundColor,
            borderColor,
            borderRadius: tokens.radius,
            borderWidth: focused || error ? theme.borderWidth.focus : theme.borderWidth.default,
            minHeight: multiline ? 120 : tokens.height,
            paddingHorizontal: tokens.paddingHorizontal,
            paddingVertical: multiline ? theme.spacing[3] : 0,
            opacity: editable ? 1 : 0.75,
          },
          focused && theme.mode === "light" ? styles.focusRing : null,
        ]}
      >
        {leadingIcon ? <View style={multiline ? styles.topIcon : null}>{leadingIcon}</View> : null}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={tokens.placeholder}
          selectionColor={theme.colors.brand.primary}
          accessibilityLabel={label}
          aria-invalid={!!error}
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
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="tertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: { borderCurve: "continuous", flexDirection: "row", gap: 10 },
  focusRing: { boxShadow: "0 0 0 4px rgba(53, 94, 221, 0.12)" },
  topIcon: { paddingTop: 2 },
  input: {
    flex: 1,
    minHeight: 24,
    paddingVertical: 0,
    // Hides the browser focus ring on web; native only accepts solid, dotted or dashed here.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
});
