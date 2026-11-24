import { Building2, UserRound } from "lucide-react-native";

import { AppBadge } from "@/components/design-system";
import type { ProviderCard } from "@/types";

/**
 * Tells customers who they are hiring: an individual professional (a person, orange) or a business
 * (a building, blue). The website uses the same icons, words and colours.
 */
export function AccountTypeBadge({ type }: { type: ProviderCard["businessType"] }) {
  return type === "individual" ? (
    <AppBadge icon={UserRound} label="Individual professional" tone="accent" />
  ) : (
    <AppBadge icon={Building2} label="Business" tone="brand" />
  );
}
