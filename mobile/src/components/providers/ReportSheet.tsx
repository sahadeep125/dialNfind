import { useState } from "react";
import { View } from "react-native";

import { AppButton, AppInput, AppSheet, AppText } from "@/components/design-system";
import { useReport, type ReportTarget } from "@/hooks/useReport";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";

interface Props {
  target: ReportTarget | null;
  onClose: () => void;
}

const COPY = {
  provider: {
    title: "Report this listing",
    text: "Wrong number, closed business, fake listing or something else wrong? Our team checks every report.",
    label: "What is wrong with this listing?",
  },
  review: {
    title: "Report this review",
    text: "For fake, abusive or off-topic reviews. Our team checks it against the review guidelines.",
    label: "What is wrong with this review?",
  },
} as const;

/** Sends a listing or review report to the DialNFind team. */
export function ReportSheet({ target, onClose }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const report = useReport();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[target?.kind ?? "provider"];

  const close = (): void => {
    setReason("");
    setError(null);
    onClose();
  };

  const submit = (): void => {
    if (!target) return;
    if (reason.trim().length < 5) {
      setError("Tell us what is wrong, at least 5 characters");
      return;
    }
    report.mutate(
      { target, reason },
      {
        onSuccess: () => {
          toast("Thanks. Our team will look into it.", "success");
          close();
        },
        onError: (e: Error) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <AppSheet visible={!!target} onClose={close} title={copy.title}>
      <View style={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}>
        <AppText tone="secondary">{copy.text}</AppText>
        <AppInput
          label={copy.label}
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
