import { CheckCircle2, CircleHelp, XCircle } from "lucide-react-native";

import { AppBadge } from "@/components/design-system";
import { StarRating } from "@/components/reviews/StarRating";
import { useTheme } from "@/hooks/useTheme";
import type { Lead } from "@/types/leads";

interface Props {
  lead: Lead;
}

/** What happened after the tap: the customer's review, or whether they said you responded. */
export function LeadOutcome({ lead }: Props) {
  const theme = useTheme();
  if (lead.reviewRating) return <StarRating rating={lead.reviewRating} size={13} />;
  if (lead.customerReportedResponse === true)
    return (
      <AppBadge
        tone="success"
        label="Responded"
        icon={<CheckCircle2 size={12} color={theme.colors.semantic.success} />}
      />
    );
  if (lead.customerReportedResponse === false)
    return (
      <AppBadge
        tone="danger"
        label="Missed"
        icon={<XCircle size={12} color={theme.colors.semantic.danger} />}
      />
    );
  return (
    <AppBadge
      tone="neutral"
      label="Awaiting feedback"
      icon={<CircleHelp size={12} color={theme.colors.text.secondary} />}
    />
  );
}
