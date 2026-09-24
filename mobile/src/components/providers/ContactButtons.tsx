import { StyleSheet, View } from "react-native";
import { MessageCircle, Phone } from "lucide-react-native";

import { AppButton, type ButtonSize } from "@/components/design-system";
import { useContactProvider } from "@/hooks/useContactProvider";
import type { ProviderCard } from "@/types";

interface Props {
  provider: Pick<
    ProviderCard,
    "id" | "businessName" | "phone" | "whatsappNumber" | "acceptsCalls" | "acceptsWhatsapp"
  >;
  source?: "search" | "category_browse" | "profile";
  size?: ButtonSize;
}

/** Call and WhatsApp buttons. Only the channels the provider accepts are shown. */
export function ContactButtons({ provider, source = "search", size = "md" }: Props) {
  const contact = useContactProvider();
  return (
    <View style={styles.row}>
      {provider.acceptsCalls ? (
        <AppButton
          size={size}
          style={styles.flex}
          leadingIcon={<Phone size={16} color="#FFFFFF" />}
          onPress={() => void contact(provider, "call", source)}
          accessibilityLabel={`Call ${provider.businessName}`}
        >
          Call
        </AppButton>
      ) : null}
      {provider.acceptsWhatsapp ? (
        <AppButton
          size={size}
          variant="success"
          style={styles.flex}
          leadingIcon={<MessageCircle size={16} color="#FFFFFF" />}
          onPress={() => void contact(provider, "whatsapp", source)}
          accessibilityLabel={`WhatsApp ${provider.businessName}`}
        >
          WhatsApp
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
