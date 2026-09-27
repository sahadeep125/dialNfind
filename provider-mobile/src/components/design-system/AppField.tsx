import type { ReactNode } from "react";
import { View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppText } from "./AppText";

interface Props {
  label?: string;
  helper?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}

/** Label above, helper or error below. Every form control (input, select, date, time) wears this. */
export function AppField({ label, helper, error, required, children }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[1.5] }}>
      {label ? (
        <AppText
          variant="caption"
          tone="secondary"
          style={{ fontFamily: theme.typography.label.fontFamily }}
        >
          {label}
          {required ? (
            <AppText variant="caption" tone="danger">
              {" "}
              *
            </AppText>
          ) : null}
        </AppText>
      ) : null}
      {children}
      {error ? (
        <AppText variant="meta" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="meta">{helper}</AppText>
      ) : null}
    </View>
  );
}
