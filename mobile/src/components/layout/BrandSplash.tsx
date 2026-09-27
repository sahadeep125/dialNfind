import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { AppBrandSurface, AppText } from "@/components/design-system";
import { BrandMark } from "./BrandMark";

interface Props {
  onFinish: () => void;
}

const SPLASH_MS = 1400;

/** Branded launch screen shown after the native splash, then it hands over to onboarding or Home. */
export function BrandSplash({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.82);
  const pulse = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.back(1.4)) });
    if (!reduceMotion) {
      pulse.value = withDelay(
        300,
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1),
      );
    }
    progress.value = withTiming(1, {
      duration: reduceMotion ? 500 : SPLASH_MS - 100,
      easing: Easing.inOut(Easing.quad),
    });
    const timer = setTimeout(onFinish, reduceMotion ? 500 : SPLASH_MS);
    return () => clearTimeout(timer);
  }, [onFinish, reduceMotion, scale, pulse, progress]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.7 }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <AppBrandSurface style={styles.fill}>
      <View style={styles.center} accessibilityLabel="DialNFind is loading">
        <View style={styles.markWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.mark, markStyle]}>
            <BrandMark size={96} tone="inverse" />
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.copy}>
          <AppText variant="hero" tone="white" align="center">
            DialNFind
          </AppText>
          <AppText variant="bodyLarge" tone="whiteMuted" align="center">
            Trusted local services, one call away
          </AppText>
        </Animated.View>
      </View>
      <Animated.View
        entering={FadeIn.delay(350).duration(400)}
        style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.bar, barStyle]} />
        </View>
        <AppText variant="micro" tone="whiteMuted" align="center">
          Verified pros · Real reviews · No booking fees
        </AppText>
      </Animated.View>
    </AppBrandSurface>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", flex: 1, gap: 28, justifyContent: "center", padding: 24 },
  markWrap: { alignItems: "center", height: 132, justifyContent: "center", width: 132 },
  ring: {
    borderColor: "#FFFFFF",
    borderRadius: 40,
    borderWidth: 2,
    height: 110,
    position: "absolute",
    width: 110,
  },
  mark: { borderRadius: 28, boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)" },
  copy: { gap: 8 },
  footer: { alignItems: "center", gap: 14, paddingHorizontal: 48 },
  track: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 2,
    height: 3,
    maxWidth: 160,
    overflow: "hidden",
    width: "100%",
  },
  bar: { backgroundColor: "#FFFFFF", borderRadius: 2, height: 3 },
});
