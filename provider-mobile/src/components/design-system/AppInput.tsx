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
}

export const AppInput = forwardRef<TextInput, Props>(function AppInput(
  {
    label,
    helper,
    error,
    required,
    leadingIcon,
    trailingAction,
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
  const borderColor = error ? tokens.errorBorder : focused ? tokens.focusBorder : tokens.border;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" tone="secondary">
          {label}
          {required ? (
            <AppText variant="label" tone="danger">
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
            backgroundColor: editable ? tokens.background : theme.colors.background.tertiary,
            borderColor,
            borderRadius: tokens.radius,
            borderWidth: focused || error ? theme.borderWidth.focus : theme.borderWidth.default,
            minHeight: multiline ? 112 : tokens.height,
            paddingHorizontal: tokens.paddingHorizontal,
            paddingVertical: multiline ? theme.spacing[3] : 0,
          },
        ]}
      >
        {leadingIcon ? <View>{leadingIcon}</View> : null}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={tokens.placeholder}
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
  input: {
    flex: 1,
    minHeight: 24,
    paddingVertical: 0,
    // Hides the browser focus ring on web; native only accepts solid, dotted or dashed here.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
});
