import { useState } from "react";
import { View } from "react-native";

import { AppButton, AppInput, AppSheet, AppText } from "@/components/design-system";
import { useReportLead } from "@/hooks/useLeads";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { Lead } from "@/types/leads";

interface Props {
  lead: Lead | null;
  onClose: () => void;
}

/** Report a spam, fake or wrong-number contact. If the team agrees, it stops counting and any promotion charge is refunded. */
export function ReportLeadSheet({ lead, onClose }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const report = useReportLead();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    setReason("");
    setError(null);
    onClose();
  };

  const submit = (): void => {
    if (!lead) return;
    if (reason.trim().length < 10) {
      setError("Tell us what was wrong, at least 10 characters");
      return;
    }
    report.mutate(
      { leadId: lead.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast("Thanks. Our team will look at this contact.", "success");
          close();
        },
        onError: (e: Error) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <AppSheet visible={!!lead} onClose={close} title="Report this contact">
      <View style={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}>
        <AppText tone="secondary">
          For spam, fake or wrong-number contacts. If our team agrees, it no longer counts in your
          numbers and any promotion charge goes back to your budget.
        </AppText>
        <AppInput
          label="What was wrong with it?"
          value={reason}
          onChangeText={(v) => {
            setReason(v);
            setError(null);
          }}
          error={error}
          multiline
          numberOfLines={3}
          maxLength={500}
          textAlignVertical="top"
        />
        <AppButton fullWidth loading={report.isPending} onPress={submit}>
          Send report
        </AppButton>
      </View>
    </AppSheet>
  );
}
