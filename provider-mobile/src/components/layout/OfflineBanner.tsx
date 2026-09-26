import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { WifiOff } from "lucide-react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

// React Query pauses requests while offline and refetches when the connection is back.
onlineManager.setEventListener((setOnline) =>
  // An unknown state (null, or no state yet) counts as online so the app never blocks on a guess.
  NetInfo.addEventListener((state) => setOnline(state?.isConnected !== false && state?.isInternetReachable !== false)),
);

/** A strip at the top of the screen while the device has no connection. */
export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  if (online) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { paddingTop: insets.top + theme.spacing[1], backgroundColor: theme.colors.semantic.warningSoft }]}
    >
      <View style={[styles.row, { gap: theme.spacing[2], paddingBottom: theme.spacing[1.5] }]}>
        <WifiOff size={14} color={theme.colors.semantic.warningText} />
        <AppText variant="caption" style={[styles.text, { color: theme.colors.semantic.warningText }]}>
          You are offline. Changes will not save until you reconnect.
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { left: 0, position: "absolute", right: 0, top: 0 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "center", paddingHorizontal: 16 },
  text: { flexShrink: 1 },
});
