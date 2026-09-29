import { View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import { AppCallout, AppSkeleton } from "@/components/design-system";
import { ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { ReviewForm, reviewBlockedMessage } from "@/components/reviews";
import { useProvider } from "@/hooks/useProvider";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";

export default function WriteReviewScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const signedIn = useAuthStore((s) => !!s.token);
  const { data: p, isLoading, isError, error, refetch } = useProvider(slug);

  if (!signedIn) return <Redirect href="/login" />;

  const done = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace(`/provider/${slug}`);
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title={p?.myReview ? "Edit your review" : "Write a review"} />
      {isLoading ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
          <AppSkeleton height={180} shape="block" />
          <AppSkeleton height={140} shape="block" />
        </View>
      ) : isError || !p ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !p.myReview && p.reviewEligibility && !p.reviewEligibility.canReview ? (
        // Opened from a link or an old notification by someone who may not review this business yet.
        <View style={{ padding: theme.spacing[4] }}>
          <AppCallout>
            {reviewBlockedMessage(p.reviewEligibility) ?? "You cannot review this business."}
          </AppCallout>
        </View>
      ) : (
        <ReviewForm key={p.myReview?.id ?? "new"} provider={p} onSaved={done} />
      )}
    </Screen>
  );
}
