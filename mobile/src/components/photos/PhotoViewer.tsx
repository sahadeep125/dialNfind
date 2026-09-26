import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { X } from "lucide-react-native";

import { AppIconButton, AppText } from "@/components/design-system";

export interface ViewerPhoto {
  uri: string;
  caption?: string | null;
}

interface Props {
  photos: ViewerPhoto[];
  /** Index of the photo to open on, or null when the viewer is closed. */
  index: number | null;
  onClose: () => void;
}

const MAX_SCALE = 4;

/** One photo that zooms with a pinch or a double tap, pans while zoomed, and closes with a swipe down. */
function ZoomablePhoto({
  photo,
  width,
  height,
  onZoomChange,
  onClose,
}: {
  photo: ViewerPhoto;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
  onClose: () => void;
}) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    saved.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    scheduleOnRN(onZoomChange, false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, saved.value * e.scale));
    })
    .onEnd(() => {
      saved.value = scale.value;
      if (scale.value <= 1.02) reset();
      else scheduleOnRN(onZoomChange, true);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (saved.value > 1) {
        reset();
      } else {
        scale.value = withTiming(2.5);
        saved.value = 2.5;
        scheduleOnRN(onZoomChange, true);
      }
    });

  // Zoomed: move the photo around. Not zoomed: a downward swipe closes the viewer.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      if (saved.value > 1) {
        x.value = startX.value + e.translationX;
        y.value = startY.value + e.translationY;
      } else if (e.translationY > 0) {
        y.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (saved.value > 1) return;
      if (e.translationY > 120 || e.velocityY > 900) scheduleOnRN(onClose);
      else y.value = withTiming(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[{ width, height }, styles.center]}>
        <Animated.View style={[{ width, height }, style]}>
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel={photo.caption ?? "Photo"}
            transition={150}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Full-screen photos: swipe between them, pinch or double tap to zoom, swipe down or tap X to close. */
export function PhotoViewer({ photos, index, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const [openedAt, setOpenedAt] = useState<number | null>(null);

  // Start on the tapped photo each time the viewer opens.
  if (index !== openedAt) {
    setOpenedAt(index);
    if (index !== null) {
      setCurrent(index);
      setZoomed(false);
    }
  }

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width)),
    [width],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ViewerPhoto>) => (
      <ZoomablePhoto photo={item} width={width} height={height} onZoomChange={setZoomed} onClose={onClose} />
    ),
    [width, height, onClose],
  );

  const photo = photos[current];

  return (
    <Modal visible={index !== null} animationType="fade" transparent={false} onRequestClose={onClose} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={styles.root}>
        {index !== null ? (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(p, i) => `${p.uri}-${i}`}
            renderItem={renderItem}
            onMomentumScrollEnd={onScroll}
            showsHorizontalScrollIndicator={false}
          />
        ) : null}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <AppText variant="label" style={styles.light} accessibilityLiveRegion="polite">
            {photos.length > 1 ? `${current + 1} of ${photos.length}` : ""}
          </AppText>
          <AppIconButton accessibilityLabel="Close photos" variant="surface" icon={<X size={22} color="#111827" />} onPress={onClose} />
        </View>
        {photo?.caption ? (
          <View style={[styles.caption, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
            <AppText style={styles.light}>{photo.caption}</AppText>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#000000", flex: 1 },
  center: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  top: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
  },
  caption: { backgroundColor: "rgba(0,0,0,0.55)", bottom: 0, left: 0, paddingHorizontal: 16, paddingTop: 12, position: "absolute", right: 0 },
  light: { color: "#FFFFFF" },
});
