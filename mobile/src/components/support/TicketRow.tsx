import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Ticket } from "@/types/support";
import { formatRelative } from "@/utils/format";

import { TicketStatusBadge } from "./TicketStatusBadge";

interface Props {
  ticket: Ticket;
  onOpen: (id: number) => void;
}

export const TicketRow = memo(function TicketRow({ ticket, onOpen }: Props) {
  const theme = useTheme();
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${ticket.subject}, ${ticket.reference}`}
      scale={false}
      onPress={() => onOpen(ticket.id)}
      style={[
        styles.row,
        {
          gap: theme.spacing[3],
          padding: theme.spacing[4],
          backgroundColor: theme.components.card.background,
          borderColor: theme.components.card.border,
          borderRadius: theme.components.card.radius,
        },
      ]}
    >
      <View style={[styles.body, { gap: theme.spacing[1] }]}>
        <AppText variant="label" numberOfLines={2}>
          {ticket.subject}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {ticket.reference} · updated {formatRelative(ticket.lastActivityAt).toLowerCase()}
        </AppText>
        <TicketStatusBadge status={ticket.status} />
      </View>
      <ChevronRight size={18} color={theme.colors.text.tertiary} />
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "center", borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  body: { flex: 1 },
});
