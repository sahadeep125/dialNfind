import { useState } from "react";
import { StyleSheet, View } from "react-native";
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
  const color = tone === "inverse" ? theme.colors.contrast.onInk : theme.colors.text.primary;

  return (
    <>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={`Location: ${label}. Change location`}
        onPress={() => setOpen(true)}
        style={styles.pill}
        hitSlop={8}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MapPin
            size={16}
            color={tone === "inverse" ? theme.colors.brand.accent : theme.colors.brand.primary}
            strokeWidth={2.4}
          />
          <AppText
            variant={tone === "inverse" ? "subheading" : "label"}
            numberOfLines={1}
            style={[styles.text, { color }]}
          >
            {label}
          </AppText>
          <ChevronDown size={16} color={color} strokeWidth={2.4} />
        </View>
      </AppPressable>
      <LocationSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 32 },
  text: { maxWidth: 260 },
});
