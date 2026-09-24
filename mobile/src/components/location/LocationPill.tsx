import { useState } from "react";
import { StyleSheet } from "react-native";
import { ChevronDown, MapPin } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useLocationStore } from "@/stores/useLocationStore";
import { LocationSheet } from "./LocationSheet";

interface Props {
  tone?: "default" | "inverse";
}

/** Shows the area being searched and opens the picker. */
export function LocationPill({ tone = "default" }: Props) {
  const theme = useTheme();
  const label = useLocationStore((s) => s.location.label);
  const [open, setOpen] = useState(false);
  const color = tone === "inverse" ? "#FFFFFF" : theme.colors.text.primary;

  return (
    <>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={`Location: ${label}. Change location`}
        onPress={() => setOpen(true)}
        style={styles.pill}
        hitSlop={8}
      >
        <MapPin size={16} color={tone === "inverse" ? "#FFFFFF" : theme.colors.brand.primary} />
        <AppText variant="label" numberOfLines={1} style={[styles.text, { color }]}>
          {label}
        </AppText>
        <ChevronDown size={16} color={color} />
      </AppPressable>
      <LocationSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: "center", flexDirection: "row", gap: 4, maxWidth: 260, minHeight: 32 },
  text: { flexShrink: 1 },
});
