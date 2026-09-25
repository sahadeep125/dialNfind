import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Megaphone } from "lucide-react-native";

import { AppButton, AppInput, AppSheet, AppText } from "@/components/design-system";
import { AppSegmented, AppSelect } from "@/components/forms";
import { useRequestCampaign } from "@/hooks/useSponsored";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { CampaignDays, SponsoredPricing } from "@/types/billing";
import { formatPrice } from "@/utils/format";

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: { id: number; name: string }[];
  pricing: SponsoredPricing;
}

const DURATIONS: { value: CampaignDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

const MAX_BUDGET = 1_000_000;

/** Category, duration and budget for a new sponsored campaign, with the estimated reach. */
export function NewCampaignSheet({ visible, onClose, categories, pricing }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const start = useRequestCampaign();
  const [categoryId, setCategoryId] = useState<number | null>(categories[0]?.id ?? null);
  const [days, setDays] = useState<CampaignDays>(14);
  const [budget, setBudget] = useState("1500");
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const selectedCategory = categoryId ?? categories[0]?.id ?? null;
  const amount = Number(budget) || 0;
  const estContacts = Math.floor(amount / Math.max(1, pricing.costPerClick));

  const budgetProblem = (): string | null => {
    const value = budget.trim();
    if (value === "") return "Enter a budget";
    if (!/^\d+$/.test(value)) return "Use whole rupees";
    const n = Number(value);
    if (n < pricing.minBudget) return `The minimum budget is ${formatPrice(pricing.minBudget)}`;
    if (n > MAX_BUDGET) return "Keep the budget under Rs 10,00,000";
    return null;
  };

  const submit = (): void => {
    const problem = budgetProblem();
    setBudgetError(problem);
    if (problem || selectedCategory === null) return;
    start.mutate(
      { categoryId: selectedCategory, days, budget: amount },
      {
        onSuccess: ({ ticket }) => {
          toast(
            `Request sent (${ticket.reference}). Our team will contact you to arrange payment and start the campaign.`,
            "success",
          );
          onClose();
        },
        onError: (error: Error) => toast(errorMessage(error), "error"),
      },
    );
  };

  return (
    <AppSheet visible={visible} onClose={onClose} title="Request a campaign">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={{
          gap: theme.spacing[5],
          paddingHorizontal: theme.spacing[4],
          paddingBottom: theme.spacing[2],
        }}
      >
        <AppSelect
          label="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={selectedCategory}
          onChange={setCategoryId}
        />
        <View style={styles.field}>
          <AppText variant="label" tone="secondary">
            Duration
          </AppText>
          <AppSegmented
            accessibilityLabel="Campaign duration"
            options={DURATIONS}
            value={days}
            onChange={setDays}
          />
        </View>
        <AppInput
          label="Budget (Rs)"
          required
          keyboardType="number-pad"
          inputMode="numeric"
          value={budget}
          maxLength={7}
          error={budgetError}
          helper={`Minimum ${formatPrice(pricing.minBudget)}. At ${formatPrice(pricing.costPerClick)} per contact, that is up to ${estContacts.toLocaleString("en-IN")} customer contacts.`}
          onChangeText={(v) => {
            setBudget(v.replace(/\D/g, "").slice(0, 7));
            setBudgetError(null);
          }}
          onBlur={() => setBudgetError(budgetProblem())}
          returnKeyType="done"
        />
        <AppText variant="caption" tone="tertiary">
          Your campaign runs in {pricing.city}. Each customer call or message uses part of the budget. Our team sets it up once payment is arranged.
        </AppText>
        <AppButton
          fullWidth
          size="lg"
          loading={start.isPending}
          onPress={submit}
          leadingIcon={<Megaphone size={18} color={theme.components.button.primary.text} />}
        >
          Request campaign
        </AppButton>
      </ScrollView>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  field: { gap: 6 },
});
