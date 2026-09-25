import { memo } from "react";
import { StyleSheet } from "react-native";
import { X } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  name: string;
  onRemove: (name: string) => void;
}

/** A served locality. The whole chip is the remove button. */
export const AreaChip = memo(function AreaChip({ name, onRemove }: Props) {
  const theme = useTheme();
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`Remove ${name}`}
      haptic
      onPress={() => onRemove(name)}
      style={[
        styles.chip,
        {
          gap: theme.spacing[1.5],
          paddingLeft: theme.spacing[3],
          paddingRight: theme.spacing[2],
          backgroundColor: theme.colors.brand.soft,
        },
      ]}
    >
      <AppText variant="caption" style={{ color: theme.colors.brand.softText }} numberOfLines={1}>
        {name}
      </AppText>
      <X size={14} color={theme.colors.brand.softText} />
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: 9999,
    flexDirection: "row",
    maxWidth: "100%",
    minHeight: 36,
  },
});
