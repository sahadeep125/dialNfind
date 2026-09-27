import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppDivider } from "./AppDivider";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  title?: string;
  /** One line under the title, for context such as "Last 30 days". */
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  /** A short note under the surface, e.g. what a setting does. */
  footer?: string;
  children: ReactNode;
  /**
   * rows: children are rows on one surface with hairlines between them (the default).
   * plain: children render as-is under the header, with no surface, for cards, grids and charts.
   */
  kind?: "rows" | "plain";
  /** Where the hairline starts. Defaults past a leading icon tile. Use 0 for full-width rules. */
  dividerInset?: number;
  style?: StyleProp<ViewStyle>;
}

/** A titled group. Screens are a stack of these, so every screen reads with the same rhythm. */
export function AppSection({
  title,
  subtitle,
  action,
  footer,
  children,
  kind = "rows",
  dividerInset,
  style,
}: Props) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter((c) => isValidElement(c) || typeof c === "string");
  const inset = dividerInset ?? 14 + theme.layout.iconTile + theme.spacing[3];

  return (
    <View style={[{ gap: theme.layout.groupGap }, style]}>
      {title || action ? (
        <View style={[styles.header, { paddingHorizontal: theme.spacing[1] }]}>
          <View style={styles.titles}>
            {title ? (
              <AppText variant="section" accessibilityRole="header" numberOfLines={1}>
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="meta" numberOfLines={1}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {action ? (
            <AppPressable accessibilityRole="link" hitSlop={12} onPress={action.onPress}>
              <AppText
                variant="caption"
                tone="brand"
                style={{ fontFamily: theme.typography.label.fontFamily }}
              >
                {action.label}
              </AppText>
            </AppPressable>
          ) : null}
        </View>
      ) : null}
      {kind === "plain" ? (
        children
      ) : (
        <View
          style={[
            styles.surface,
            {
              backgroundColor: theme.colors.background.elevated,
              borderColor: theme.colors.border.primary,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          {rows.map((row, i) => (
            <Fragment key={i}>
              {i > 0 ? <AppDivider inset={inset} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      )}
      {footer ? (
        <AppText variant="meta" style={{ paddingHorizontal: theme.spacing[1] }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  titles: { flex: 1, gap: 1, minWidth: 0 },
  surface: { borderCurve: "continuous", borderWidth: 1, overflow: "hidden" },
});
