import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { MessageCircle, Phone, StickyNote } from "lucide-react-native";

import { AppBadge, AppIconButton, AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Lead } from "@/types/leads";
import { formatRelative } from "@/utils/format";
import { ChannelIcon } from "./ChannelIcon";
import { LeadOutcome } from "./LeadOutcome";
import { LEAD_STATUS } from "./leadStatus";

const DISPUTE_LABEL = {
  open: "Reported",
  accepted: "Report accepted",
  rejected: "Report declined",
} as const;

interface Props {
  lead: Lead;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
  /** Opens the follow-up sheet (status, note, report). */
  onManage: (lead: Lead) => void;
}

/** One lead: who, what they need, where it stands, and one tap to call back. Tap the row to follow up. */
export const LeadRow = memo(function LeadRow({ lead, onCall, onWhatsApp, onManage }: Props) {
  const theme = useTheme();
  const phone = lead.customerPhone;
  const status = LEAD_STATUS[lead.providerStatus];
  const what = [lead.service ?? "General enquiry", lead.description].filter(Boolean).join(" · ");
  const details = lead.details.map((d) => `${d.label}: ${d.value}`).join(" · ");

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${lead.customerName}, ${lead.service ?? "general enquiry"}, ${status.label}, ${formatRelative(lead.createdAt)}. Opens follow up.`}
      onPress={() => onManage(lead)}
      scale={false}
    >
      <View
        style={[
          styles.row,
          { gap: theme.spacing[3], paddingHorizontal: 14, paddingVertical: theme.spacing[3] },
        ]}
      >
        <ChannelIcon channel={lead.channel} size={36} />
        <View style={styles.main}>
          <View style={[styles.line, { gap: theme.spacing[1.5] }]}>
            <AppText variant="label" numberOfLines={1} style={styles.shrink}>
              {lead.customerName}
            </AppText>
            {lead.isGuest ? <AppText variant="meta">· guest</AppText> : null}
            <View style={styles.spacer} />
            <AppText variant="meta" numeric>
              {formatRelative(lead.createdAt)}
            </AppText>
          </View>
          <AppText variant="meta" tone="secondary" numberOfLines={2}>
            {what}
          </AppText>
          {details ? (
            <AppText variant="meta" numberOfLines={1}>
              {details}
            </AppText>
          ) : null}
          {lead.providerNote ? (
            <View style={[styles.line, { gap: 4 }]}>
              <StickyNote size={11} color={theme.colors.text.tertiary} />
              <AppText variant="meta" numberOfLines={1} style={[styles.shrink, styles.note]}>
                {lead.providerNote}
              </AppText>
            </View>
          ) : null}
          <View style={[styles.line, styles.wrap, { gap: theme.spacing[1.5], marginTop: 4 }]}>
            <AppBadge label={status.label} tone={status.tone} dot />
            {lead.disputeStatus !== "none" ? (
              <AppBadge
                label={DISPUTE_LABEL[lead.disputeStatus]}
                tone="neutral"
                appearance="outline"
              />
            ) : null}
            <LeadOutcome lead={lead} />
          </View>
        </View>
        {phone ? (
          <View style={[styles.actions, { gap: theme.spacing[2] }]}>
            <AppIconButton
              accessibilityLabel={`Call ${lead.customerName}`}
              variant="soft"
              icon={<Phone size={16} color={theme.colors.brand.primary} />}
              onPress={() => onCall(phone)}
            />
            <AppIconButton
              accessibilityLabel={`WhatsApp ${lead.customerName}`}
              variant="neutral"
              icon={<MessageCircle size={16} color={theme.colors.semantic.success} />}
              onPress={() => onWhatsApp(phone)}
            />
          </View>
        ) : null}
      </View>
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  main: { flex: 1, gap: 2, minWidth: 0 },
  line: { alignItems: "center", flexDirection: "row" },
  wrap: { flexWrap: "wrap" },
  shrink: { flexShrink: 1 },
  spacer: { flex: 1 },
  note: { fontStyle: "italic" },
  actions: { alignSelf: "center", flexDirection: "column" },
});
