import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { AppAvatar, AppButton, AppCallout, AppInput, AppText } from "@/components/design-system";
import { useSaveReview } from "@/hooks/useSaveReview";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import type { ProviderDetail } from "@/types";
import { validateReviewText } from "@/utils/validation";
import { StarPicker } from "./StarPicker";

interface Props {
  provider: ProviderDetail;
  onSaved: () => void;
}

const MAX_LENGTH = 2000;

/** Rating and text for a new review, or the person's existing review when they already wrote one. */
export function ReviewForm({ provider: p, onSaved }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const save = useSaveReview();
  const [rating, setRating] = useState(p.myReview?.rating ?? 0);
  const [text, setText] = useState(p.myReview?.reviewText ?? "");
  const [errors, setErrors] = useState<{ rating: string | null; text: string | null }>({
    rating: null,
    text: null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const submit = (): void => {
    const next = { rating: rating ? null : "Choose a star rating", text: validateReviewText(text) };
    setErrors(next);
    setFormError(null);
    if (next.rating || next.text) return;
    save.mutate(
      { providerId: p.id, reviewId: p.myReview?.id, rating, reviewText: text },
      {
        onSuccess: () => {
          toast(p.myReview ? "Review updated" : "Thanks for your review", "success");
          onSaved();
        },
        onError: (err: Error) => {
          if (err instanceof ApiError && err.fieldErrors.reviewText)
            setErrors((e) => ({ ...e, text: err.fieldErrors.reviewText ?? null }));
          setFormError(errorMessage(err));
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[5] }}
      >
        <View style={styles.provider}>
          <AppAvatar name={p.businessName} uri={p.logoUrl} size={48} shape="rounded" />
          <View style={styles.flex}>
            <AppText variant="subheading">{p.businessName}</AppText>
            <AppText variant="caption" tone="secondary">
              {[p.primaryCategory?.name, p.city].filter(Boolean).join(" · ")}
            </AppText>
          </View>
        </View>

        {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

        <View style={{ gap: theme.spacing[2] }}>
          <StarPicker
            value={rating}
            onChange={(r) => (setRating(r), setErrors((e) => ({ ...e, rating: null })))}
          />
          {errors.rating ? (
            <AppText variant="caption" tone="danger" align="center">
              {errors.rating}
            </AppText>
          ) : null}
        </View>

        <AppInput
          label="Your review"
          required
          multiline
          value={text}
          onChangeText={(v) => (setText(v), setErrors((e) => ({ ...e, text: null })))}
          error={errors.text}
          helper={`${text.trim().length}/${MAX_LENGTH}. What did they do, and how did it go?`}
          placeholder="Share details that would help others decide"
          maxLength={MAX_LENGTH}
        />

        <AppButton size="lg" fullWidth loading={save.isPending} onPress={submit}>
          {p.myReview ? "Update review" : "Post review"}
        </AppButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  provider: { alignItems: "center", flexDirection: "row", gap: 12 },
});
