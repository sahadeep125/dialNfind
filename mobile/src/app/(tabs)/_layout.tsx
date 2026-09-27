import { Platform, StyleSheet, View, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, House, MessageSquareText, Settings, type LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";

/** Tab icon with a soft pill behind it when its tab is active. */
function TabIcon({
  icon: Icon,
  color,
  focused,
}: {
  icon: LucideIcon;
  color: ColorValue;
  focused: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, focused && { backgroundColor: theme.colors.brand.soft }]}>
      <Icon
        size={22}
        color={color as string}
        strokeWidth={focused ? 2.3 : 1.9}
        fill={focused && Icon === Heart ? (color as string) : "transparent"}
      />
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 8);

  const icon = (Icon: LucideIcon) =>
    function renderIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
      return <TabIcon icon={Icon} color={color} focused={focused} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: {
          fontFamily: theme.typography.labelSmall.fontFamily,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background.secondary,
          borderTopColor: theme.colors.border.primary,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: theme.components.tabBar.height + bottom,
          paddingBottom: bottom,
          paddingTop: 8,
          ...(theme.mode === "light" ? { boxShadow: "0 -4px 20px rgba(15, 24, 40, 0.05)" } : null),
        },
        sceneStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon(House) }} />
      <Tabs.Screen name="favorites" options={{ title: "Favorites", tabBarIcon: icon(Heart) }} />
      <Tabs.Screen
        name="reviews"
        options={{ title: "My reviews", tabBarIcon: icon(MessageSquareText) }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon(Settings) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: "center", borderRadius: 14, height: 30, justifyContent: "center", width: 54 },
});
