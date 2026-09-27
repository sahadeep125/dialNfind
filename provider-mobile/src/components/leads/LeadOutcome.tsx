import { CheckCircle2, XCircle } from "lucide-react-native";

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
  if (lead.reviewRating) return <StarRating rating={lead.reviewRating} size={11} />;
  if (lead.customerReportedResponse === true)
    return (
      <AppBadge
        tone="success"
        appearance="outline"
        label="Customer says you responded"
        icon={<CheckCircle2 size={11} color={theme.colors.semantic.success} />}
      />
    );
  if (lead.customerReportedResponse === false)
    return (
      <AppBadge
        tone="danger"
        appearance="outline"
        label="Customer says missed"
        icon={<XCircle size={11} color={theme.colors.semantic.danger} />}
      />
    );
  return null;
}
