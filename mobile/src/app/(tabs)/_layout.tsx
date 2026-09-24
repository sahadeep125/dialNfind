import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, House, MessageSquareText, Settings } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 6);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: { fontFamily: theme.typography.label.fontFamily, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: theme.colors.background.elevated,
          borderTopColor: theme.colors.border.primary,
          height: theme.components.tabBar.height + bottom,
          paddingBottom: bottom,
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "My reviews",
          tabBarIcon: ({ color, size }) => <MessageSquareText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
