import type { ReactNode } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Optional icon tile on the left, matching AppListItem. */
  leading?: ReactNode;
  /** Adds row padding so it sits inside an AppSection like an AppListItem. */
  inset?: boolean;
}

/** A labelled on/off setting. The whole row is the accessible switch. */
export function AppSwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  leading,
  inset = false,
}: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.spacing[3],
          minHeight: theme.layout.rowMinHeight,
          paddingHorizontal: inset ? 14 : 0,
          paddingVertical: inset ? theme.layout.rowPaddingVertical - 2 : 0,
        },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
    >
      {leading ? (
        <View
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.background.subtle,
              borderRadius: theme.radius.sm + 2,
              height: theme.layout.iconTile,
              width: theme.layout.iconTile,
            },
          ]}
        >
          {leading}
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        {description ? (
          <AppText variant="meta" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border.secondary, true: theme.colors.semantic.success }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.colors.border.secondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  tile: { alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 1 },
});
