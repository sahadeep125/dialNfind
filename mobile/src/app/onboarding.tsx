import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { ArrowRight, Crosshair } from "lucide-react-native";

import {
  AppBrandSurface,
  AppButton,
  AppPageDots,
  AppPressable,
  AppText,
} from "@/components/design-system";
import { BrandMark, FocusStatusBar } from "@/components/layout";
import { markOnboarded } from "@/components/layout/OnboardingGate";
import { OnboardingArt, type ArtKind } from "@/components/onboarding/OnboardingArt";
import { MAX_FORM_WIDTH } from "@/constants/spacing";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { track } from "@/services/analytics";
import { errorMessage } from "@/services/api";
import { getCurrentLocation } from "@/services/location";
import { useLocationStore } from "@/stores/useLocationStore";

interface Slide {
  kind: ArtKind;
  eyebrow: string;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    kind: "find",
    eyebrow: "Discover",
    title: "Trusted pros, right around the corner",
    text: "Electricians, AC repair, plumbers, tutors and more, listed by how close they are to you.",
  },
  {
    kind: "compare",
    eyebrow: "Compare",
    title: "Choose with real reviews",
    text: "Ratings from people who actually contacted the provider, plus verified badges you can trust.",
  },
  {
    kind: "contact",
    eyebrow: "Connect",
    title: "Call or WhatsApp them directly",
    text: "Talk to the provider yourself and agree on the price. No middlemen, no booking fees.",
  },
  {
    kind: "location",
    eyebrow: "Almost there",
    title: "Set your area",
    text: "We use your location only to show providers near you. You can change the area any time.",
  },
];

const LAST = SLIDES.length - 1;

/** First-launch introduction: three short slides, then an optional location step. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width, sizeClass } = useLayout();
  const setLocation = useLocationStore((s) => s.setLocation);
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [art, setArt] = useState({ width: 0, height: 0 });
  const [locating, setLocating] = useState(false);
  // Big tablets show the art and the words side by side instead of stacked.
  const split = sizeClass === "expanded";

  const finish = useCallback(() => {
    track("onboarding_completed", { app: "customer" });
    markOnboarded();
    router.replace("/");
  }, []);

  const goTo = (next: number): void => {
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const locate = async (): Promise<void> => {
    setLocating(true);
    try {
      setLocation(await getCurrentLocation());
      finish();
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    } finally {
      setLocating(false);
    }
  };

  const onArtLayout = (e: LayoutChangeEvent): void => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== art.width || h !== art.height) setArt({ width: w, height: h });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (art.width) setIndex(Math.round(e.nativeEvent.contentOffset.x / art.width));
  };

  const renderArt = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={{ width: art.width, height: art.height, padding: theme.spacing[6] }}>
      <OnboardingArt
        kind={item.kind}
        width={art.width - theme.spacing[6] * 2}
        height={art.height - theme.spacing[6] * 2}
      />
    </View>
  );

  const slide = SLIDES[index] ?? SLIDES[0]!;
  const isLast = index === LAST;

  const panel = (
    <View
      style={[
        styles.panel,
        split ? styles.panelSplit : styles.panelStacked,
        {
          backgroundColor: theme.colors.background.secondary,
          paddingBottom: insets.bottom + theme.spacing[6],
          paddingTop: split ? insets.top + theme.spacing[6] : theme.spacing[8],
          paddingHorizontal: split ? theme.spacing[12] : theme.spacing[6],
          borderTopLeftRadius: split ? 0 : theme.radius["3xl"],
          borderTopRightRadius: split ? 0 : theme.radius["3xl"],
        },
      ]}
    >
      <View style={styles.panelInner}>
        <Animated.View
          key={index}
          entering={FadeInDown.duration(theme.motion.base)}
          style={styles.copy}
        >
          <AppText variant="overline" tone="brand" style={styles.eyebrow}>
            {slide.eyebrow}
          </AppText>
          <AppText variant={split ? "hero" : "title"} accessibilityRole="header">
            {slide.title}
          </AppText>
          <AppText variant="bodyLarge" tone="secondary">
            {slide.text}
          </AppText>
        </Animated.View>

        <View>
          {isLast ? (
            <Animated.View
              entering={FadeIn.duration(theme.motion.base)}
              style={{ gap: theme.spacing[2] }}
            >
              <AppButton
                size="lg"
                fullWidth
                icon={Crosshair}
                loading={locating}
                onPress={() => void locate()}
              >
                Use my current location
              </AppButton>
              <AppButton size="lg" variant="ghost" fullWidth onPress={finish}>
                I will choose my area later
              </AppButton>
            </Animated.View>
          ) : (
            <View style={styles.nextRow}>
              <AppPageDots count={SLIDES.length} index={index} />
              <AppButton size="lg" trailingIcon={ArrowRight} onPress={() => goTo(index + 1)}>
                {index === LAST - 1 ? "Get started" : "Next"}
              </AppButton>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.fill,
        split && styles.row,
        { backgroundColor: theme.colors.background.secondary },
      ]}
    >
      <FocusStatusBar style="light" />
      <AppBrandSurface style={split ? styles.fill : styles.hero}>
        <View
          style={[
            styles.topBar,
            { paddingTop: insets.top + theme.spacing[2], paddingHorizontal: theme.spacing[5] },
          ]}
        >
          <View style={styles.brand}>
            <BrandMark size={30} tone="inverse" />
            <AppText variant="subheading" tone="white">
              DialNFind
            </AppText>
          </View>
          {!isLast ? (
            <AppPressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => goTo(LAST)}
              style={styles.skip}
            >
              <AppText variant="labelSmall" tone="white">
                Skip
              </AppText>
            </AppPressable>
          ) : null}
        </View>
        <View style={styles.fill} onLayout={onArtLayout}>
          {art.width ? (
            <FlatList
              ref={listRef}
              data={SLIDES}
              horizontal
              pagingEnabled
              bounces={false}
              keyExtractor={(s) => s.kind}
              renderItem={renderArt}
              extraData={art}
              getItemLayout={(_, i) => ({ length: art.width, offset: art.width * i, index: i })}
              onMomentumScrollEnd={onScrollEnd}
              showsHorizontalScrollIndicator={false}
            />
          ) : null}
        </View>
      </AppBrandSurface>
      <View style={split ? { width: Math.min(560, width * 0.46) } : null}>{panel}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: "row" },
  hero: { flex: 1.15 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  brand: { alignItems: "center", flexDirection: "row", gap: 10 },
  skip: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  panel: { borderCurve: "continuous" },
  panelStacked: { marginTop: -28 },
  panelSplit: { flex: 1, justifyContent: "center" },
  panelInner: { alignSelf: "center", gap: 32, maxWidth: MAX_FORM_WIDTH, width: "100%" },
  copy: { gap: 10, minHeight: 168 },
  eyebrow: { textTransform: "uppercase" },
  nextRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
