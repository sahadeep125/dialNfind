import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { UserRound } from "lucide-react-native";

import { AppAvatar, AppIconButton, AppPressable, AppText } from "@/components/design-system";
import { LocationPill } from "@/components/location";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import { greeting } from "@/utils/format";

/** Greeting, the location being searched and, top right, the profile button (sign in for guests). */
export function HomeHeader() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(" ")[0];

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
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          onPress={() => router.push("/profile")}
          hitSlop={6}
        >
          <AppAvatar name={user.name} uri={user.profilePhotoUrl} size={42} />
        </AppPressable>
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
});
