import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppButton, AppInput, AppText } from "@/components/design-system";
import { useReplyToReview } from "@/hooks/useReviews";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { ProviderReview } from "@/types/reviews";

const MAX_LENGTH = 1000;

interface Props {
  review: ProviderReview;
  onDone: () => void;
}

/** Reply editor for one review. Mount it with key={review.id} so each review starts fresh. */
export function ReplyForm({ review, onDone }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const mutation = useReplyToReview();
  const [text, setText] = useState(review.providerReply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const editing = !!review.providerReply;

  const save = (reply: string | null): void => {
    mutation.mutate(
      { reviewId: review.id, reply },
      {
        onSuccess: () => {
          toast(reply ? "Reply published" : "Reply removed", "success");
          onDone();
        },
        onError: (e: Error) => toast(errorMessage(e), "error"),
      },
    );
  };

  const publish = (): void => {
    const t = text.trim();
    const problem =
      t.length < 2
        ? "Write a reply of at least 2 characters"
        : t.length > MAX_LENGTH
          ? "Keep the reply under 1,000 characters"
          : null;
    setError(problem);
    if (!problem) save(t);
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: theme.spacing[4],
        paddingTop: theme.spacing[2],
        gap: theme.spacing[3],
      }}
    >
      {review.reviewText ? (
        <AppText tone="secondary" numberOfLines={4}>
          {review.reviewText}
        </AppText>
      ) : null}

      {confirmRemove ? (
        <View style={{ gap: theme.spacing[3] }}>
          <AppText>Remove your reply? Customers will no longer see it on your listing.</AppText>
          <View style={[styles.buttons, { gap: theme.spacing[2] }]}>
            <AppButton
              variant="secondary"
              onPress={() => setConfirmRemove(false)}
              style={styles.button}
            >
              Keep reply
            </AppButton>
            <AppButton
              variant="destructive"
              loading={mutation.isPending}
              onPress={() => save(null)}
              style={styles.button}
            >
              Remove
            </AppButton>
          </View>
        </View>
      ) : (
        <>
          <AppInput
            label="Your reply"
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (error) setError(null);
            }}
            multiline
            maxLength={MAX_LENGTH}
            autoFocus
            placeholder="Thank the customer and address any concern, politely and briefly."
            error={error}
            helper={error ? undefined : `${text.length} / 1,000`}
          />
          <View style={[styles.buttons, { gap: theme.spacing[2] }]}>
            {editing ? (
              <AppButton
                variant="ghost"
                onPress={() => setConfirmRemove(true)}
                disabled={mutation.isPending}
                style={styles.button}
              >
                Remove reply
              </AppButton>
            ) : (
              <AppButton variant="secondary" onPress={onDone} style={styles.button}>
                Cancel
              </AppButton>
            )}
            <AppButton loading={mutation.isPending} onPress={publish} style={styles.button}>
              Publish reply
            </AppButton>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: "row", flexWrap: "wrap" },
  button: { flexBasis: 120, flexGrow: 1 },
});
