import { StyleSheet, View } from "react-native";
import { MessageCircle, Phone } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import type { LeadChannel } from "@/types/leads";

interface Props {
  channel: LeadChannel;
  size?: number;
}

/** Round badge showing whether a customer tapped Call or WhatsApp. */
export function ChannelIcon({ channel, size = 36 }: Props) {
  const theme = useTheme();
  const isCall = channel === "call";
  const Icon = isCall ? Phone : MessageCircle;
  return (
    <View
      accessibilityLabel={isCall ? "Call" : "WhatsApp"}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isCall ? theme.colors.brand.soft : theme.colors.semantic.successSoft,
        },
      ]}
    >
      <Icon
        size={Math.round(size * 0.45)}
        color={isCall ? theme.colors.brand.primary : theme.colors.semantic.success}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
});
