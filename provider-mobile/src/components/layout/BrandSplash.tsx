import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/design-system";
import { palette } from "@/constants/colors";
import { BrandMark } from "./BrandMark";

interface Props {
  onFinish: () => void;
}

const SPLASH_MS = 1200;

/** Deep indigo backdrop with a soft light behind the mark. Starts on the native splash color, so the handover is seamless. */
function Backdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="splash-bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.indigo900} />
          <Stop offset="1" stopColor="#0C1638" />
        </LinearGradient>
        <RadialGradient id="splash-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={palette.indigo500} stopOpacity="0.55" />
          <Stop offset="1" stopColor={palette.indigo500} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#splash-bg)" />
      <Circle cx="50%" cy="42%" r="220" fill="url(#splash-glow)" />
    </Svg>
  );
}

/** Branded launch screen shown after the native splash, then it hands over to Home. */
export function BrandSplash({ onFinish }: Props) {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(reduceMotion ? 1 : 0.9);
  const progress = useSharedValue(0);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  useEffect(() => {
    const total = reduceMotion ? 500 : SPLASH_MS;
    scale.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) });
    progress.value = withTiming(1, { duration: total - 100, easing: Easing.inOut(Easing.quad) });
    const timer = setTimeout(onFinish, total);
    return () => clearTimeout(timer);
  }, [onFinish, reduceMotion, scale, progress]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.fill} accessibilityLabel="DialNFind Business is loading">
      <Backdrop />
      <View style={styles.center}>
        <Animated.View style={markStyle}>
          <BrandMark size={76} tone="inverse" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.copy}>
          <AppText variant="display" tone="white" align="center">
            DialNFind
          </AppText>
          <View style={styles.pill}>
            <AppText variant="overline" style={styles.pillText}>
              FOR BUSINESS
            </AppText>
          </View>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(380).duration(400)}>
          <AppText variant="body" align="center" style={styles.tagline}>
            Leads, reviews and growth in one place
          </AppText>
        </Animated.View>
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, barStyle]} />
        </View>
        <AppText variant="meta" align="center" style={styles.version}>
          Version {version}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: palette.indigo900, flex: 1 },
  center: { alignItems: "center", flex: 1, gap: 18, justifyContent: "center", padding: 24 },
  copy: { alignItems: "center", gap: 10 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { color: "#C9D7FC", letterSpacing: 1.6 },
  tagline: { color: "rgba(255,255,255,0.7)" },
  footer: { alignItems: "center", gap: 12, paddingHorizontal: 64 },
  track: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 2,
    height: 3,
    overflow: "hidden",
    width: 120,
  },
  bar: { backgroundColor: "#FFFFFF", borderRadius: 2, height: 3 },
  version: { color: "rgba(255,255,255,0.45)" },
});
