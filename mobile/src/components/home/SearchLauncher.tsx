import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { Search } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

/** Looks like a search field; opens the search screen where typing happens. */
export function SearchLauncher() {
  const theme = useTheme();
  const tokens = theme.components.input;
  return (
    <AppPressable
      accessibilityRole="search"
      accessibilityLabel="Search for a service or business"
      onPress={() => router.push("/search")}
      scale={false}
      style={[
        styles.field,
        {
          height: tokens.height + 4,
          borderRadius: tokens.radius,
          backgroundColor: tokens.background,
          borderColor: tokens.border,
        },
        theme.shadow.card,
      ]}
    >
      <Search size={20} color={theme.colors.brand.primary} />
      <AppText tone="tertiary" numberOfLines={1} style={styles.text}>
        Search electricians, AC repair, tutors...
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  text: { flex: 1 },
});
