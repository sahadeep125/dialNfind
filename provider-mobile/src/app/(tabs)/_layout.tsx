import { Platform } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, Menu, MessageSquareText, PhoneIncoming } from "lucide-react-native";

import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const session = useSession();
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 6);

  if (!token) return <Redirect href="/login" />;
  if (session.data && !session.data.state.provider) return <Redirect href="/start" />;

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
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          tabBarIcon: ({ color, size }) => <PhoneIncoming size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "Reviews",
          tabBarIcon: ({ color, size }) => <MessageSquareText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
