import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { ErrorState } from "@/components/layout";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";

/** Sends people to sign in, to set up their business, or to the dashboard. */
export default function Gate() {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const session = useSession();

  if (!token) return <Redirect href="/login" />;
  if (session.data && !session.data.user.emailVerifiedAt) return <Redirect href="/verify-email" />;
  if (session.data) return <Redirect href={session.data.state.provider ? "/(tabs)" : "/start"} />;
  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background.primary }]}>
      {session.isError ? (
        <ErrorState error={session.error} onRetry={() => void session.refetch()} />
      ) : (
        <ActivityIndicator color={theme.colors.brand.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
});
