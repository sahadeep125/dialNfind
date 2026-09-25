import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Info, XCircle } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/stores/useUIStore";

/** Renders toasts pushed with useToast(). Mounted once in the root layout, above the tab bar. */
export function ToastPortal() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  if (!toasts.length) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        { bottom: insets.bottom + theme.components.tabBar.height + theme.spacing[3] },
      ]}
    >
      {toasts.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? XCircle : Info;
        const color =
          t.tone === "success"
            ? theme.colors.semantic.success
            : t.tone === "error"
              ? theme.colors.semantic.danger
              : theme.colors.brand.primary;
        return (
          <Animated.View
            key={t.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(160)}
          >
            <AppPressable
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              onPress={() => dismiss(t.id)}
              style={[
                styles.toast,
                { backgroundColor: theme.colors.background.inverse, borderRadius: theme.radius.md },
              ]}
            >
              <Icon size={18} color={color} />
              <AppText
                variant="caption"
                style={[styles.text, { color: theme.colors.text.inverse }]}
              >
                {t.message}
              </AppText>
            </AppPressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { alignItems: "center", gap: 8, left: 16, position: "absolute", right: 16 },
  toast: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    maxWidth: 480,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: { flexShrink: 1 },
});
