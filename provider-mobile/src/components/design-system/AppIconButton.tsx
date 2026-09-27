import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  accessibilityLabel: string;
  icon: ReactNode;
  onPress?: () => void;
  variant?: "filled" | "soft" | "ghost" | "surface" | "neutral";
  /** sm is 32pt and md 38pt visually; both keep a 44pt touch area through hitSlop. */
  size?: "sm" | "md";
  disabled?: boolean;
  /** A count bubble on the top-right corner. 0 hides it; true shows a plain dot. */
  badge?: number | boolean;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button with a guaranteed 44pt touch target. */
export function AppIconButton({
  accessibilityLabel,
  icon,
  onPress,
  variant = "ghost",
  size = "md",
  disabled,
  badge,
  style,
}: Props) {
  const theme = useTheme();
  const dimension = size === "sm" ? 32 : 38;
  const background =
    variant === "filled"
      ? theme.colors.brand.primary
      : variant === "soft"
        ? theme.colors.brand.soft
        : variant === "neutral"
          ? theme.colors.background.subtle
          : variant === "surface"
            ? theme.colors.background.elevated
            : "transparent";
  const slop = (44 - dimension) / 2;
  const showBadge = badge === true || (typeof badge === "number" && badge > 0);

  return (
    <View>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        haptic
        hitSlop={slop}
        onPress={onPress}
        style={[
          styles.base,
          {
            width: dimension,
            height: dimension,
            borderRadius: theme.radius.full,
            backgroundColor: background,
            opacity: disabled ? 0.45 : 1,
          },
          variant === "surface"
            ? { borderWidth: 1, borderColor: theme.colors.border.primary }
            : null,
          style,
        ]}
      >
        {icon}
      </AppPressable>
      {showBadge ? (
        <View
          pointerEvents="none"
          style={[
            typeof badge === "number" ? styles.count : styles.dot,
            {
              backgroundColor: theme.colors.semantic.danger,
              borderColor: theme.colors.background.primary,
            },
          ]}
        >
          {typeof badge === "number" ? (
            <AppText variant="caption" tone="white" style={styles.countText}>
              {badge > 99 ? "99+" : String(badge)}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  dot: {
    borderRadius: 6,
    borderWidth: 2,
    height: 11,
    position: "absolute",
    right: 2,
    top: 2,
    width: 11,
  },
  count: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: -4,
    top: -4,
  },
  countText: { fontSize: 10, lineHeight: 12 },
});
