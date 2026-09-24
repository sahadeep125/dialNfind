import { Children, Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppDivider, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title?: string;
  children: ReactNode;
}

/** A titled card of settings rows with hairlines between them. */
export function SettingsGroup({ title, children }: Props) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? (
        <AppText variant="overline" tone="tertiary" style={{ paddingHorizontal: theme.spacing[1] }}>
          {title}
        </AppText>
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.background.elevated,
            borderColor: theme.colors.border.primary,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <AppDivider inset={62} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  card: { borderWidth: 1, overflow: "hidden" },
});
