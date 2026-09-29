import { router } from "expo-router";

import { AppText } from "@/components/design-system";
import type { ReviewEligibility } from "@/types";
import { formatDateTime } from "@/utils/format";

/** What someone who may not review a business yet can do about it, or null when there is nothing to say. */
export function reviewBlockedMessage(eligibility: ReviewEligibility): string | null {
  switch (eligibility.reason) {
    case "verify_email":
      return "Confirm your email address to write a review.";
    case "too_soon":
      return `You can review them ${eligibility.availableAt ? `from ${formatDateTime(eligibility.availableAt)}` : "soon"}. Already heard back? Tell us they responded in Recent contacts.`;
    case "no_contact":
      return "Reviews come from customers who contacted this business on DialNFind. Call or WhatsApp them from this page to review them later.";
    default:
      return null;
  }
}

/** In place of "Write a review" when the person may not review yet. */
export function ReviewNotAllowed({ eligibility }: { eligibility: ReviewEligibility }) {
  const message = reviewBlockedMessage(eligibility);
  if (!message) return null;
  const target = { too_soon: "/contacts", verify_email: "/verify-email" } as const;
  const href =
    eligibility.reason === "too_soon" || eligibility.reason === "verify_email"
      ? target[eligibility.reason]
      : null;
  return (
    <AppText
      variant="caption"
      tone="secondary"
      accessibilityRole={href ? "link" : "text"}
      onPress={href ? () => router.push(href) : undefined}
    >
      {message}
    </AppText>
  );
}
