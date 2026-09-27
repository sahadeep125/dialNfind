import { Children, Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppDivider } from "./AppDivider";
import { AppText } from "./AppText";

interface Props {
  title?: string;
  /** Small print under the group, e.g. what a setting does. */
  footer?: string;
  children: ReactNode;
  /** Divider inset from the left, so hairlines start after the leading icon. */
  inset?: number;
}

/** A titled surface of list rows with hairlines between them, like a grouped native list. */
export function AppListGroup({ title, footer, children, inset = 66 }: Props) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? (
        <AppText
          variant="overline"
          tone="tertiary"
          accessibilityRole="header"
          style={{ paddingHorizontal: theme.spacing[1], textTransform: "uppercase" }}
        >
          {title}
        </AppText>
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.background.elevated,
            borderColor:
              theme.mode === "dark"
                ? theme.colors.border.primary
                : theme.colors.background.elevated,
            borderRadius: theme.components.card.radius,
          },
          theme.shadow.sm,
        ]}
      >
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <AppDivider inset={inset} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <AppText variant="caption" tone="tertiary" style={{ paddingHorizontal: theme.spacing[1] }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  card: { borderCurve: "continuous", borderWidth: 1, overflow: "hidden" },
});
