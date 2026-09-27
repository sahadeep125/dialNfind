import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Search, SlidersHorizontal } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

/** Looks like a search field; opens the search screen where typing happens. Sits on the brand header. */
export function SearchLauncher() {
  const theme = useTheme();
  return (
    <AppPressable
      accessibilityRole="search"
      accessibilityLabel="Search for a service or business"
      onPress={() => router.push("/search")}
      scale={false}
      style={[
        styles.field,
        {
          height: theme.components.input.height + 6,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.background.elevated,
          // Dark surfaces need an edge to read against the ink header.
          borderColor:
            theme.mode === "dark"
              ? theme.colors.border.secondary
              : theme.colors.background.elevated,
        },
      ]}
    >
      <Search size={20} color={theme.colors.brand.primary} strokeWidth={2.4} />
      <AppText tone="tertiary" numberOfLines={1} style={styles.text}>
        Search electricians, AC repair, tutors...
      </AppText>
      <View
        style={[
          styles.filter,
          { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.sm },
        ]}
      >
        <SlidersHorizontal size={17} color={theme.colors.brand.primary} strokeWidth={2.2} />
      </View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: "center",
    borderCurve: "continuous",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingLeft: 18,
    paddingRight: 8,
  },
  text: { flex: 1 },
  filter: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
});
