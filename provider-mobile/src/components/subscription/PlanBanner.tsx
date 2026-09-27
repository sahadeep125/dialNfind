import { router } from "expo-router";

import { AppNotice } from "@/components/design-system";
import { usePlan } from "@/hooks/useSubscription";
import { formatDate } from "@/utils/format";

/**
 * One-line plan notice: an upgrade prompt on Free, and a warning when a renewal failed or a plan
 * is about to end. Paid plans in good standing show nothing. Returns null when there is nothing to say.
 */
export function PlanBanner() {
  const plan = usePlan();
  const sub = plan.subscription;
  const { leads } = plan.limits;
  const open = () => router.push("/subscription");

  if (sub?.status === "past_due") {
    const store = sub.source === "app_store" || sub.source === "play_store";
    return (
      <AppNotice
        tone="danger"
        title="Payment did not go through"
        text={`${plan.plan.name} keeps working ${sub.graceUntil ? `until ${formatDate(sub.graceUntil)}` : "for a few days"}. ${store ? "Update your payment method in the store." : "Check your card or UPI mandate."}`}
        actionLabel="Fix"
        onPress={open}
      />
    );
  }
  if (sub?.cancelAtPeriodEnd && sub.endDate) {
    return (
      <AppNotice
        tone="warning"
        title={`${plan.plan.name} ends on ${formatDate(sub.endDate)}`}
        text="Then you move to Free: 10 leads a month and no analytics."
        actionLabel="Keep"
        onPress={open}
      />
    );
  }
  if (plan.plan.code !== "free") return null;

  const over = leads.limit !== null && leads.used >= leads.limit;
  const usage =
    leads.limit !== null
      ? `${Math.min(leads.used, leads.limit)} of ${leads.limit} free leads used this month`
      : "Free plan";
  return (
    <AppNotice
      tone={over ? "warning" : "upgrade"}
      title={over ? "New lead details are hidden" : usage}
      text={
        over
          ? `You used all ${leads.limit} free leads this month.`
          : "Pro unlocks unlimited leads and analytics."
      }
      actionLabel="Upgrade"
      onPress={() => router.push("/paywall")}
    />
  );
}

/** True when PlanBanner would render something, so screens can pick one notice to show. */
export function usePlanNeedsNotice(): boolean {
  const plan = usePlan();
  const sub = plan.subscription;
  return (
    sub?.status === "past_due" ||
    (!!sub?.cancelAtPeriodEnd && !!sub.endDate) ||
    plan.plan.code === "free"
  );
}
