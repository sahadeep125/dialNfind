import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import {
  AppAvatar,
  AppButton,
  AppCallout,
  AppCard,
  AppInput,
  AppText,
} from "@/components/design-system";
import { MAX_FORM_WIDTH } from "@/constants/spacing";
import { useLayout } from "@/hooks/useLayout";
import { useSaveReview } from "@/hooks/useSaveReview";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import type { ProviderDetail } from "@/types";
import { validateReviewText } from "@/utils/validation";
import { useAppConfig } from "@/hooks/useAppConfig";
import { ReviewPhotosField } from "./ReviewPhotosField";
import { StarPicker } from "./StarPicker";

interface Props {
  provider: ProviderDetail;
  onSaved: () => void;
}

const MAX_LENGTH = 2000;

/** Rating and text for a new review, or the person's existing review when they already wrote one. */
export function ReviewForm({ provider: p, onSaved }: Props) {
  const theme = useTheme();
  const { gutter } = useLayout();
  const toast = useToast();
  const save = useSaveReview();
  const config = useAppConfig();
  const [rating, setRating] = useState(p.myReview?.rating ?? 0);
  const [text, setText] = useState(p.myReview?.reviewText ?? "");
  const [photos, setPhotos] = useState<string[]>(p.myReview?.photos ?? []);
  const [errors, setErrors] = useState<{ rating: string | null; text: string | null }>({
    rating: null,
    text: null,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const ratingLocked = p.myReview?.ratingLocked ?? false;

  const submit = (): void => {
    const next = {
      rating: rating ? null : "Choose a star rating",
      text: validateReviewText(text, config.data?.min_review_length),
    };
    setErrors(next);
    setFormError(null);
    if (next.rating || next.text) return;
    save.mutate(
      { providerId: p.id, reviewId: p.myReview?.id, rating, reviewText: text, photos },
      {
        onSuccess: (review) => {
          if (review.status === "pending" && p.myReview?.status !== "pending")
            toast("Thanks! Your review will show once our team has checked it", "success");
          else toast(p.myReview ? "Review updated" : "Thanks for your review", "success");
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
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: gutter,
            paddingTop: theme.spacing[2],
            paddingBottom: theme.spacing[8],
            gap: theme.spacing[5],
          },
        ]}
      >
        <AppCard padding={theme.spacing[5]}>
          <View style={{ gap: theme.spacing[5] }}>
            <View style={styles.provider}>
              <AppAvatar name={p.businessName} uri={p.logoUrl} size={52} shape="rounded" />
              <View style={styles.flex}>
                <AppText variant="subheading">{p.businessName}</AppText>
                <AppText variant="caption" tone="secondary">
                  {[p.primaryCategory?.name, p.city].filter(Boolean).join(" · ")}
                </AppText>
              </View>
            </View>
            <View style={{ gap: theme.spacing[2] }}>
              <AppText variant="labelSmall" tone="secondary" align="center">
                How was your experience?
              </AppText>
              <StarPicker
                value={rating}
                disabled={ratingLocked}
                onChange={(r) => (setRating(r), setErrors((e) => ({ ...e, rating: null })))}
              />
              {errors.rating ? (
                <AppText variant="caption" tone="danger" align="center">
                  {errors.rating}
                </AppText>
              ) : null}
            </View>
          </View>
        </AppCard>

        {p.myReview?.status === "pending" ? (
          <AppCallout>
            Our team is checking this review. It shows on the profile once approved.
          </AppCallout>
        ) : ratingLocked ? (
          <AppCallout>
            Stars can only be changed in the first week. If you edit the text, our team checks it
            again before it shows.
          </AppCallout>
        ) : null}

        {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

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

        <ReviewPhotosField photos={photos} onChange={setPhotos} />

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
  content: { alignSelf: "center", maxWidth: MAX_FORM_WIDTH + 120, width: "100%" },
});
