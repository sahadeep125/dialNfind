import { useState } from "react";
import { View } from "react-native";

import { AppButton, AppInput, AppSheet, AppText } from "@/components/design-system";
import { useReportReview } from "@/hooks/useReviews";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { ProviderReview } from "@/types/reviews";

interface Props {
  review: ProviderReview | null;
  onClose: () => void;
}

/** Report a fake, abusive or wrong-business review. The team checks it against the review guidelines. */
export function ReportReviewSheet({ review, onClose }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const report = useReportReview();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    setReason("");
    setError(null);
    onClose();
  };

  const submit = (): void => {
    if (!review) return;
    if (reason.trim().length < 10) {
      setError("Tell us what is wrong, at least 10 characters");
      return;
    }
    report.mutate(
      { reviewId: review.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast("Thanks. Our team will check this review.", "success");
          close();
        },
        onError: (e: Error) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <AppSheet visible={!!review} onClose={close} title="Report this review">
      <View style={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}>
        <AppText tone="secondary">
          For fake, abusive or wrong-business reviews. Our team checks it against the review
          guidelines and removes it if it breaks them.
        </AppText>
        <AppInput
          label="What is wrong with this review?"
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
