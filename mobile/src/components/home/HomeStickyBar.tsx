import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { Search } from "lucide-react-native";

import { AppIconButton } from "@/components/design-system";
import { LocationPill } from "@/components/location";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  scrollY: SharedValue<number>;
  /** Scroll offset where the brand header has gone; the bar is fully shown from here. */
  threshold: number;
  pad: number;
  /** Whether the bar is showing, so it only takes touches then. */
  visible: boolean;
}

/** Compact bar that takes over from the brand header once it scrolls away: location and search. */
export function HomeStickyBar({ scrollY, threshold, pad, visible }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const animated = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [threshold - 48, threshold], [0, 1], "clamp");
    return { opacity: progress, transform: [{ translateY: (progress - 1) * 12 }] };
  });

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={[
        styles.bar,
        {
          paddingTop: insets.top + theme.spacing[1],
          paddingBottom: theme.spacing[2],
          paddingHorizontal: pad,
          backgroundColor: theme.colors.background.elevated,
          borderBottomColor: theme.colors.border.primary,
        },
        theme.shadow.sm,
        animated,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.main}>
          <LocationPill />
        </View>
        <AppIconButton
          accessibilityLabel="Search for a service or business"
          variant="surface"
          icon={<Search size={20} color={theme.colors.brand.primary} strokeWidth={2.4} />}
          onPress={() => router.push("/search")}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  row: { alignItems: "center", flexDirection: "row", gap: 10 },
  main: { flex: 1 },
});
