import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const MARK = require("../../../assets/brand/kaajva-mark.png");
const LOGO = require("../../../assets/brand/kaajva-logo.png");
const LOGO_WHITE = require("../../../assets/brand/kaajva-logo-white.png");

interface Props {
  size?: number;
  /** "brand" is the tile used on app surfaces; "inverse" drops the outline on the navy splash and hero surfaces. */
  tone?: "brand" | "inverse";
}

/** The KaajVa house-and-wrench mark (logo/icon.png) on a white rounded tile, so it reads on light, dark and navy surfaces. */
export function BrandMark({ size = 40, tone = "brand" }: Props) {
  const radius = Math.round(size * 0.26);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="KaajVa"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius },
        tone === "brand" ? styles.outlined : null,
      ]}
    >
      <Image source={MARK} style={{ width: size * 0.78, height: size * 0.78 }} contentFit="contain" />
    </View>
  );
}

interface LogoProps {
  /** Height of the wordmark; the width follows the logo's aspect ratio. */
  height?: number;
  /** "white" for navy and dark surfaces, "color" for light ones. */
  tone?: "color" | "white";
}

/** The full KaajVa logo: the mark with the wordmark (logo/logo.png and logo/logo-white.png). */
export function BrandLogo({ height = 32, tone = "color" }: LogoProps) {
  const white = tone === "white";
  return (
    <Image
      source={white ? LOGO_WHITE : LOGO}
      accessibilityLabel="KaajVa"
      style={{ height, width: height * (white ? 4.37 : 4.12) }}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", backgroundColor: "#FFFFFF", justifyContent: "center" },
  outlined: { borderColor: "rgba(4, 33, 97, 0.12)", borderWidth: StyleSheet.hairlineWidth },
});
