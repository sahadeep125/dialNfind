import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { MessageCircle, Phone } from "lucide-react-native";

import { AppButton, AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Lead } from "@/types/leads";
import { formatRelative } from "@/utils/format";
import { ChannelIcon } from "./ChannelIcon";
import { LeadOutcome } from "./LeadOutcome";

const SOURCE_LABEL: Record<string, string> = {
  search: "Search results",
  profile: "Your profile",
  category_browse: "Category page",
  ai_match: "Smart match",
};

interface Props {
  lead: Lead;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
}

export const LeadRow = memo(function LeadRow({ lead, onCall, onWhatsApp }: Props) {
  const theme = useTheme();
  const phone = lead.customerPhone;
  const details = lead.details.map((d) => `${d.label}: ${d.value}`).join(" · ");
  return (
    <AppCard padding={theme.spacing[4]}>
      <View style={[styles.top, { gap: theme.spacing[3] }]}>
        <ChannelIcon channel={lead.channel} />
        <View style={styles.main}>
          <View style={[styles.nameRow, { gap: theme.spacing[2] }]}>
            <AppText variant="label" numberOfLines={1} style={styles.shrink}>
              {lead.customerName}
            </AppText>
            {lead.isGuest ? (
              <AppText variant="caption" tone="tertiary">
                not signed in
              </AppText>
            ) : null}
          </View>
          <AppText variant="caption" tone="secondary">
            {lead.channel === "call" ? "Call" : "WhatsApp"} · {formatRelative(lead.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={[{ gap: theme.spacing[1], marginTop: theme.spacing[3] }]}>
        <AppText variant="body" tone={lead.service ? "primary" : "secondary"}>
          {lead.service ?? "General enquiry"}
        </AppText>
        {lead.description ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {lead.description}
          </AppText>
        ) : null}
        {details ? (
          <AppText variant="caption" tone="secondary">
            {details}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.footer, { gap: theme.spacing[2], marginTop: theme.spacing[3] }]}>
        <AppText variant="caption" tone="tertiary" style={styles.shrink} numberOfLines={1}>
          From {SOURCE_LABEL[lead.source] ?? lead.source}
        </AppText>
        <LeadOutcome lead={lead} />
      </View>

      {phone ? (
        <View style={[styles.actions, { gap: theme.spacing[2], marginTop: theme.spacing[3] }]}>
          <AppButton
            variant="soft"
            size="sm"
            leadingIcon={<Phone size={16} color={theme.colors.brand.softText} />}
            onPress={() => onCall(phone)}
            style={styles.action}
          >
            Call back
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            leadingIcon={<MessageCircle size={16} color={theme.colors.semantic.success} />}
            onPress={() => onWhatsApp(phone)}
            style={styles.action}
          >
            WhatsApp
          </AppButton>
        </View>
      ) : null}
    </AppCard>
  );
});

const styles = StyleSheet.create({
  top: { alignItems: "center", flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: "center", flexDirection: "row" },
  shrink: { flexShrink: 1 },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actions: { flexDirection: "row", flexWrap: "wrap" },
  action: { flexGrow: 1 },
});
