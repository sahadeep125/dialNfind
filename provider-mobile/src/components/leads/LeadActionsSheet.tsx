import { useState } from "react";
import { View } from "react-native";
import { Flag } from "lucide-react-native";

import { AppButton, AppInput, AppSheet, AppText } from "@/components/design-system";
import { AppSegmented } from "@/components/forms";
import { useUpdateLead } from "@/hooks/useLeads";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { Lead, LeadStatus } from "@/types/leads";
import { LEAD_STATUS_OPTIONS } from "./leadStatus";

interface Props {
  lead: Lead | null;
  onClose: () => void;
  /** Opens the report sheet for this lead, when it can still be reported. */
  onReport?: (lead: Lead) => void;
}

/** Track a lead: mark where the job stands and keep a private note. */
export function LeadActionsSheet({ lead, onClose, onReport }: Props) {
  return (
    <AppSheet visible={!!lead} onClose={onClose} title={lead ? `Follow up: ${lead.customerName}` : "Follow up"}>
      {/* Keyed by lead so the form starts from that lead's saved status and note. */}
      {lead ? <LeadForm key={lead.id} lead={lead} onClose={onClose} onReport={onReport} /> : null}
    </AppSheet>
  );
}

function LeadForm({ lead, onClose, onReport }: { lead: Lead; onClose: () => void; onReport?: (lead: Lead) => void }) {
  const theme = useTheme();
  const toast = useToast();
  const update = useUpdateLead();
  const [status, setStatus] = useState<LeadStatus>(lead.providerStatus);
  const [note, setNote] = useState(lead.providerNote ?? "");

  const save = (): void => {
    update.mutate(
      { leadId: lead.id, status, note: note.trim() || null },
      {
        onSuccess: () => {
          toast("Lead updated", "success");
          onClose();
        },
        onError: (e: Error) => toast(errorMessage(e), "error"),
      },
    );
  };

  return (
    <View style={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}>
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label">Status</AppText>
        <AppSegmented options={LEAD_STATUS_OPTIONS} value={status} onChange={setStatus} accessibilityLabel="Lead status" />
      </View>
      <AppInput
        label="Private note"
        helper="Only you see this: a quote, what you agreed or when to call back."
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={4}
        maxLength={1000}
        textAlignVertical="top"
        placeholder="e.g. Quoted Rs 1,200. Visiting Monday 11 am."
      />
      <AppButton fullWidth loading={update.isPending} onPress={save}>
        Save
      </AppButton>
      {onReport ? (
        <AppButton
          variant="ghost"
          fullWidth
          leadingIcon={<Flag size={16} color={theme.colors.text.secondary} />}
          onPress={() => {
            onClose();
            onReport(lead);
          }}
        >
          Report spam or wrong number
        </AppButton>
      ) : null}
    </View>
  );
}
