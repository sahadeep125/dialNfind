import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  haptic?: boolean;
  /** Shrink slightly while pressed. Off for large surfaces where it looks odd. */
  scale?: boolean;
}

/** Core press feedback: subtle scale and fade on iOS and web, ripple on Android, optional light haptic. */
export function AppPressable({
  style,
  haptic = false,
  scale = true,
  onPress,
  android_ripple,
  disabled,
  ...props
}: Props) {
  return (
    <Pressable
      disabled={disabled}
      android_ripple={android_ripple ?? { color: "rgba(0,0,0,0.08)", borderless: false }}
      onPress={(event) => {
        if (haptic && Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(event);
      }}
      style={(state) => [
        Platform.OS !== "android" && state.pressed && !disabled
          ? { opacity: 0.85, transform: scale ? [{ scale: 0.98 }] : undefined }
          : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    />
  );
}
