import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Headset } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { TicketMessage } from "@/types/support";
import { formatRelative } from "@/utils/format";

import { AttachmentList } from "./AttachmentList";

interface Props {
  message: TicketMessage;
}

/** One message in a support conversation. Staff replies sit on the left with a brand tint. */
export const MessageBubble = memo(function MessageBubble({ message: m }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: m.fromStaff ? "flex-start" : "flex-end",
          backgroundColor: m.fromStaff ? theme.colors.brand.soft : theme.components.card.background,
          borderColor: m.fromStaff ? theme.colors.brand.soft : theme.components.card.border,
          borderRadius: theme.radius.lg,
          borderBottomLeftRadius: m.fromStaff ? theme.radius.xs : theme.radius.lg,
          borderBottomRightRadius: m.fromStaff ? theme.radius.lg : theme.radius.xs,
          paddingHorizontal: theme.spacing[3],
          paddingVertical: theme.spacing[2.5],
          gap: theme.spacing[1],
        },
      ]}
    >
      <View style={[styles.head, { gap: theme.spacing[2] }]}>
        {m.fromStaff ? (
          <View style={[styles.avatar, { backgroundColor: theme.colors.brand.primary }]}>
            <Headset size={11} color={theme.components.button.primary.text} />
          </View>
        ) : null}
        <AppText variant="caption" weight="semibold" numberOfLines={1} style={styles.flex}>
          {m.fromStaff ? m.authorName : "You"}
        </AppText>
        <AppText variant="meta">{formatRelative(m.createdAt)}</AppText>
      </View>
      <AppText selectable>{m.body}</AppText>
      {m.attachments.length > 0 ? <AttachmentList urls={m.attachments} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: { borderWidth: 1, maxWidth: "88%", minWidth: "50%" },
  head: { alignItems: "center", flexDirection: "row" },
  avatar: {
    alignItems: "center",
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  flex: { flexShrink: 1, flexGrow: 1 },
});
