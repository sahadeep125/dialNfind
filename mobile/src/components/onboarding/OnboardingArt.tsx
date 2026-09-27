import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  AirVent,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Wrench,
  Zap,
} from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { CATEGORY_STYLES } from "@/constants/categories";
import { useTheme } from "@/hooks/useTheme";

export type ArtKind = "find" | "compare" | "contact" | "location";

/** The scenes are drawn on a fixed canvas, then scaled to fit the space the slide gives them. */
const CANVAS = { width: 300, height: 290 };

interface Props {
  kind: ArtKind;
  /** The box the art must fit inside. */
  width: number;
  height: number;
}

/** Illustrations for the onboarding slides, built from the app's own UI pieces. */
export function OnboardingArt({ kind, width, height }: Props) {
  const scale = Math.min(width / CANVAS.width, height / CANVAS.height, 1.5);
  const Scene = {
    find: FindScene,
    compare: CompareScene,
    contact: ContactScene,
    location: LocationScene,
  }[kind];
  return (
    <View
      style={{ width, height, alignItems: "center", justifyContent: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[CANVAS, { transform: [{ scale }] }]}>
        <Scene />
      </View>
    </View>
  );
}

function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: theme.colors.background.elevated, borderRadius: theme.radius.lg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Stars({ count = 5, size = 11 }: { count?: number; size?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          color={i < count ? theme.colors.star : theme.colors.border.secondary}
          fill={i < count ? theme.colors.star : theme.colors.border.secondary}
        />
      ))}
    </View>
  );
}

function Logo({
  letters,
  bg,
  fg,
  size = 36,
}: {
  letters: string;
  bg: string;
  fg: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.logo,
        { backgroundColor: bg, width: size, height: size, borderRadius: size * 0.3 },
      ]}
    >
      <AppText variant="labelSmall" style={{ color: fg }}>
        {letters}
      </AppText>
    </View>
  );
}

function MiniProvider({
  name,
  meta,
  rating,
  letters,
  tone,
}: {
  name: string;
  meta: string;
  rating: string;
  letters: string;
  tone: { bg: string; fg: string };
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { gap: 10 }]}>
      <Logo letters={letters} bg={tone.bg} fg={tone.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={[styles.row, { gap: 4 }]}>
          <AppText variant="labelSmall" numberOfLines={1}>
            {name}
          </AppText>
          <BadgeCheck size={13} color={theme.colors.brand.primary} />
        </View>
        <View style={[styles.row, { gap: 6 }]}>
          <Star size={11} color={theme.colors.star} fill={theme.colors.star} />
          <AppText variant="micro">{rating}</AppText>
          <AppText variant="micro" tone="tertiary">
            {meta}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function FindScene() {
  const theme = useTheme();
  const tones = [
    { icon: AirVent, style: CATEGORY_STYLES["home-appliances"] },
    { icon: Zap, style: CATEGORY_STYLES.electricians },
    { icon: Wrench, style: CATEGORY_STYLES.plumbing },
  ];
  return (
    <>
      <Surface style={[styles.pill, { top: 18, left: 10, right: 10 }]}>
        <Search size={16} color={theme.colors.brand.primary} strokeWidth={2.4} />
        <AppText variant="caption" tone="secondary">
          AC repair near me
        </AppText>
      </Surface>
      <View style={[styles.row, { position: "absolute", top: 86, left: 10, right: 10, gap: 10 }]}>
        {tones.map(({ icon: Icon, style }, i) => {
          const tone = style
            ? style[theme.mode]
            : { bg: theme.colors.brand.soft, fg: theme.colors.brand.primary };
          return (
            <Surface key={i} style={styles.tile}>
              <View style={[styles.tileIcon, { backgroundColor: tone.bg }]}>
                <Icon size={20} color={tone.fg} strokeWidth={2} />
              </View>
              <View
                style={[
                  styles.bar,
                  { width: 44, backgroundColor: theme.colors.background.tertiary },
                ]}
              />
            </Surface>
          );
        })}
      </View>
      <Surface style={{ position: "absolute", top: 186, left: 26, right: 26, padding: 14 }}>
        <MiniProvider
          name="CoolCare Appliances"
          meta="· 1.2 km"
          rating="4.8"
          letters="CA"
          tone={
            CATEGORY_STYLES["home-appliances"]?.[theme.mode] ?? {
              bg: theme.colors.brand.soft,
              fg: theme.colors.brand.primary,
            }
          }
        />
      </Surface>
      <View
        style={[
          styles.floatPin,
          { backgroundColor: theme.colors.brand.accent, top: 160, right: 6 },
        ]}
      >
        <MapPin size={18} color="#FFFFFF" strokeWidth={2.4} />
      </View>
    </>
  );
}

function CompareScene() {
  const theme = useTheme();
  const bars = [0.78, 0.16, 0.04, 0.01, 0.01];
  return (
    <>
      <Surface style={{ position: "absolute", top: 14, left: 10, right: 40, padding: 16, gap: 12 }}>
        <View style={[styles.row, { gap: 14 }]}>
          <View style={{ alignItems: "center", gap: 2 }}>
            <AppText variant="display">4.8</AppText>
            <Stars size={10} />
            <AppText variant="micro" tone="tertiary">
              214 reviews
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {bars.map((pct, i) => (
              <View key={i} style={[styles.row, { gap: 6 }]}>
                <AppText variant="micro" tone="tertiary" style={{ width: 8 }}>
                  {5 - i}
                </AppText>
                <View style={[styles.track, { backgroundColor: theme.colors.background.tertiary }]}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${pct * 100}%`, backgroundColor: theme.colors.star },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </Surface>
      <Surface style={{ position: "absolute", top: 150, left: 40, right: 10, padding: 14, gap: 8 }}>
        <View style={[styles.row, { gap: 8 }]}>
          <Logo
            letters="RS"
            bg={theme.colors.brand.soft}
            fg={theme.colors.brand.softText}
            size={28}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="labelSmall">Rahul S.</AppText>
            <Stars size={10} />
          </View>
          <View style={[styles.row, { gap: 3 }]}>
            <ShieldCheck size={12} color={theme.colors.semantic.success} />
            <AppText variant="micro" tone="success">
              Contacted
            </AppText>
          </View>
        </View>
        <View
          style={[styles.bar, { width: "100%", backgroundColor: theme.colors.background.tertiary }]}
        />
        <View
          style={[styles.bar, { width: "72%", backgroundColor: theme.colors.background.tertiary }]}
        />
      </Surface>
    </>
  );
}

function ContactScene() {
  const theme = useTheme();
  const tone = CATEGORY_STYLES.electricians?.[theme.mode] ?? {
    bg: theme.colors.brand.soft,
    fg: theme.colors.brand.primary,
  };
  return (
    <>
      <Surface style={{ position: "absolute", top: 40, left: 10, right: 10, padding: 16, gap: 14 }}>
        <MiniProvider
          name="Sharma Electricals"
          meta="· Open now"
          rating="4.7"
          letters="SE"
          tone={tone}
        />
        <View style={[styles.row, { gap: 10 }]}>
          <View style={[styles.cta, { backgroundColor: theme.colors.brand.primary }]}>
            <Phone size={15} color="#FFFFFF" strokeWidth={2.4} />
            <AppText variant="labelSmall" tone="white">
              Call
            </AppText>
          </View>
          <View style={[styles.cta, { backgroundColor: theme.colors.semantic.success }]}>
            <MessageCircle size={15} color="#FFFFFF" strokeWidth={2.4} />
            <AppText variant="labelSmall" tone="white">
              WhatsApp
            </AppText>
          </View>
        </View>
      </Surface>
      <Surface style={[styles.bubble, { top: 176, right: 18 }]}>
        <AppText variant="caption">Can you come today at 5?</AppText>
      </Surface>
      <View
        style={[
          styles.bubble,
          styles.replyBubble,
          { top: 222, left: 18, backgroundColor: theme.colors.brand.primary },
        ]}
      >
        <AppText variant="caption" tone="white">
          Yes, I can be there by 5
        </AppText>
      </View>
    </>
  );
}

function LocationScene() {
  const theme = useTheme();
  const rings = [220, 160, 100];
  const dots = [
    { top: 46, left: 70, tone: CATEGORY_STYLES.plumbing, letters: "AP" },
    { top: 78, left: 210, tone: CATEGORY_STYLES.cleaning, letters: "SC" },
    { top: 196, left: 56, tone: CATEGORY_STYLES.painting, letters: "RP" },
    { top: 206, left: 196, tone: CATEGORY_STYLES.electricians, letters: "BE" },
  ];
  return (
    <>
      {rings.map((d) => (
        <View
          key={d}
          style={[
            styles.ring,
            {
              width: d,
              height: d,
              borderRadius: d / 2,
              left: CANVAS.width / 2 - d / 2,
              top: CANVAS.height / 2 - d / 2,
            },
          ]}
        />
      ))}
      {dots.map((d) => {
        const tone = d.tone?.[theme.mode] ?? {
          bg: theme.colors.brand.soft,
          fg: theme.colors.brand.primary,
        };
        return (
          <View
            key={d.letters}
            style={[
              styles.dotAvatar,
              { top: d.top, left: d.left, backgroundColor: theme.colors.background.elevated },
            ]}
          >
            <Logo letters={d.letters} bg={tone.bg} fg={tone.fg} size={32} />
          </View>
        );
      })}
      <View
        style={[
          styles.centerPin,
          {
            backgroundColor: theme.colors.brand.primary,
            left: CANVAS.width / 2 - 30,
            top: CANVAS.height / 2 - 30,
          },
        ]}
      >
        <MapPin size={28} color="#FFFFFF" strokeWidth={2.2} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  surface: { borderCurve: "continuous", boxShadow: "0 12px 32px rgba(0, 0, 0, 0.28)" },
  pill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    position: "absolute",
  },
  tile: { alignItems: "center", flex: 1, gap: 10, paddingVertical: 16 },
  tileIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  bar: { borderRadius: 4, height: 7 },
  logo: { alignItems: "center", justifyContent: "center" },
  floatPin: {
    alignItems: "center",
    borderRadius: 20,
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
    height: 40,
    justifyContent: "center",
    position: "absolute",
    width: 40,
  },
  track: { borderRadius: 3, flex: 1, height: 6, overflow: "hidden" },
  fill: { borderRadius: 3, height: 6 },
  cta: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: 40,
    justifyContent: "center",
  },
  bubble: {
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
  },
  replyBubble: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderRadius: 18,
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.28)",
  },
  ring: { borderColor: "rgba(255, 255, 255, 0.16)", borderWidth: 1.5, position: "absolute" },
  dotAvatar: {
    borderRadius: 14,
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
    padding: 4,
    position: "absolute",
  },
  centerPin: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 30,
    borderWidth: 4,
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.35)",
    height: 60,
    justifyContent: "center",
    position: "absolute",
    width: 60,
  },
});
