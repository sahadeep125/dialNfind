import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Bell, UserRound } from "lucide-react-native";

import { AppAvatar, AppIconButton, AppPressable, AppText } from "@/components/design-system";
import { LocationPill } from "@/components/location";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Top row of the Home header, on the brand surface: the area being searched on the left, then
 * notifications and the profile button (sign in for guests) on the right.
 */
export function HomeHeader() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const unread = useNotifications().data?.unread ?? 0;

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <AppText variant="overline" tone="whiteMuted" style={styles.overline}>
          Your location
        </AppText>
        <LocationPill tone="inverse" />
      </View>
      {user ? (
        <>
          <View>
            <AppIconButton
              accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
              variant="inverse"
              icon={<Bell size={21} color={theme.colors.contrast.onInk} strokeWidth={2} />}
              onPress={() => router.push("/notifications")}
            />
            {unread ? (
              <View
                pointerEvents="none"
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.semantic.danger,
                    borderColor: theme.colors.brand.ink,
                  },
                ]}
              >
                <AppText variant="micro" tone="white" style={styles.badgeText}>
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
            <AppAvatar
              name={user.name}
              uri={user.profilePhotoUrl}
              size={44}
              ringColor="rgba(255, 255, 255, 0.35)"
            />
          </AppPressable>
        </>
      ) : (
        <AppIconButton
          accessibilityLabel="Sign in"
          variant="inverse"
          icon={<UserRound size={21} color={theme.colors.contrast.onInk} strokeWidth={2} />}
          onPress={() => router.push("/login")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  main: { flex: 1, gap: 2 },
  overline: { textTransform: "uppercase" },
  badge: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -3,
    top: -3,
  },
  badgeText: { fontSize: 10, lineHeight: 13 },
});
