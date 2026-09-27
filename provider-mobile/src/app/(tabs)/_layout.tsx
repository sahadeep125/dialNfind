import { Platform, StyleSheet } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, LayoutGrid, MessageSquareText, PhoneIncoming } from "lucide-react-native";

import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const session = useSession();
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 4);

  if (!token) return <Redirect href="/login" />;
  if (session.data && !session.data.state.provider) return <Redirect href="/start" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: {
          fontFamily: theme.typography.caption.fontFamily,
          fontSize: 10.5,
          marginTop: 1,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarStyle: {
          backgroundColor: theme.colors.background.elevated,
          borderTopColor: theme.colors.border.primary,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: theme.components.tabBar.height + bottom,
          paddingBottom: bottom,
          paddingTop: 4,
        },
        sceneStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.3 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          tabBarIcon: ({ color, focused }) => (
            <PhoneIncoming size={22} color={color} strokeWidth={focused ? 2.3 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "Reviews",
          tabBarIcon: ({ color, focused }) => (
            <MessageSquareText size={22} color={color} strokeWidth={focused ? 2.3 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <LayoutGrid size={22} color={color} strokeWidth={focused ? 2.3 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
