import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface Props {
  size?: number;
  /** "brand" is the gradient tile used on light surfaces; "inverse" is a white tile for the splash. */
  tone?: "brand" | "inverse";
}

/** The DialNFind mark, the same drawing as the website logo: a location pin holding a phone handset. */
export function BrandMark({ size = 40, tone = "brand" }: Props) {
  const inverse = tone === "inverse";
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="DialNFind">
      <Defs>
        <LinearGradient id="dnf-mark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5A78F2" />
          <Stop offset="1" stopColor="#3345C2" />
        </LinearGradient>
      </Defs>
      <Rect width={40} height={40} rx={11} fill={inverse ? "#FFFFFF" : "url(#dnf-mark)"} />
      <Path
        d="M20 8.5c-5.1 0-9 3.9-9 8.9 0 6.2 7.4 13 8.2 13.7.5.4 1.1.4 1.6 0 .8-.7 8.2-7.5 8.2-13.7 0-5-3.9-8.9-9-8.9Z"
        fill={inverse ? "#355EDD" : "#FFFFFF"}
      />
      <Path
        d="M17.3 13.6c.3-.3.8-.3 1 .1l1 1.6c.2.3.1.7-.1 1l-.6.5c.4.9 1.1 1.6 2 2l.5-.6c.3-.3.7-.3 1-.1l1.6 1c.4.2.4.7.1 1l-.8.8c-.5.5-1.3.6-1.9.3-1.9-.9-3.4-2.4-4.3-4.3-.3-.6-.2-1.4.3-1.9l.2-.4Z"
        fill={inverse ? "#FFFFFF" : "#355EDD"}
      />
    </Svg>
  );
}
