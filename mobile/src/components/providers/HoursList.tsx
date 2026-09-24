import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderDetail } from "@/types";

interface Props {
  hours: ProviderDetail["hours"];
  is24x7: boolean;
}

export function HoursList({ hours, is24x7 }: Props) {
  const theme = useTheme();
  if (is24x7) return <AppText tone="secondary">Open 24 hours, 7 days a week</AppText>;
  return (
    <View style={styles.list}>
      {hours.map((h) => (
        <View
          key={h.dayOfWeek}
          style={[
            styles.row,
            h.isToday && {
              backgroundColor: theme.colors.brand.soft,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <AppText variant={h.isToday ? "label" : "body"} tone={h.isToday ? "brand" : "secondary"}>
            {h.day}
            {h.isToday ? " (today)" : ""}
          </AppText>
          <AppText
            variant={h.isToday ? "label" : "body"}
            tone={h.label === "Closed" ? "tertiary" : "primary"}
          >
            {h.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
