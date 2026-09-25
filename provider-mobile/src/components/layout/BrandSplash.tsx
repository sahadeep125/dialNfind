import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
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

const SPLASH_MS = 1100;

/** Branded launch screen shown after the native splash, then it hands over to Home. */
export function BrandSplash({ onFinish }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.86);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    const timer = setTimeout(onFinish, reduceMotion ? 500 : SPLASH_MS);
    return () => clearTimeout(timer);
  }, [onFinish, reduceMotion, scale]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.fill} accessibilityLabel="DialNFind is loading">
      <Animated.View style={markStyle}>
        <BrandMark size={92} tone="inverse" />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(180).duration(400)} style={styles.copy}>
        <AppText variant="title" tone="white" align="center">
          DialNFind
        </AppText>
        <AppText tone="white" align="center" style={styles.tagline}>
          Run your business, win more customers
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    alignItems: "center",
    backgroundColor: palette.indigo500,
    flex: 1,
    gap: 20,
    justifyContent: "center",
    padding: 24,
  },
  copy: { gap: 6 },
  tagline: { opacity: 0.85 },
});
