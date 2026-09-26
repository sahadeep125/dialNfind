import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Bell, UserRound } from "lucide-react-native";

import { AppAvatar, AppIconButton, AppPressable, AppText } from "@/components/design-system";
import { LocationPill } from "@/components/location";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import { greeting } from "@/utils/format";

/** Greeting, the location being searched and, top right, notifications and the profile button (sign in for guests). */
export function HomeHeader() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(" ")[0];
  const unread = useNotifications().data?.unread ?? 0;

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <AppText variant="caption" tone="secondary">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </AppText>
        <LocationPill />
      </View>
      {user ? (
        <>
          <View>
            <AppIconButton
              accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
              variant="surface"
              icon={<Bell size={22} color={theme.colors.text.primary} />}
              onPress={() => router.push("/notifications")}
            />
            {unread ? (
              <View
                pointerEvents="none"
                style={[styles.badge, { backgroundColor: theme.colors.semantic.danger, borderColor: theme.colors.background.primary }]}
              >
                <AppText variant="caption" style={styles.badgeText}>
                  {unread > 9 ? "9+" : unread}
                </AppText>
              </View>
            ) : null}
          </View>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            onPress={() => router.push("/profile")}
            hitSlop={6}
          >
            <AppAvatar name={user.name} uri={user.profilePhotoUrl} size={42} />
          </AppPressable>
        </>
      ) : (
        <AppIconButton
          accessibilityLabel="Sign in"
          variant="surface"
          icon={<UserRound size={22} color={theme.colors.text.primary} />}
          onPress={() => router.push("/login")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  main: { flex: 1, gap: 2 },
  badge: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -4,
    top: -4,
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, lineHeight: 13 },
});
