import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** A labelled on/off setting. The whole row is the accessible switch. */
export function AppSwitchRow({ label, description, value, onValueChange, disabled }: Props) {
  const theme = useTheme();
  return (
    <View
      style={styles.row}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border.secondary, true: theme.colors.brand.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.colors.border.secondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 48 },
  text: { flex: 1, gap: 2 },
});
