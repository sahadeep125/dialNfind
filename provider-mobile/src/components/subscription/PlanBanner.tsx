import { router } from "expo-router";

import { AppButton, AppCallout } from "@/components/design-system";
import { usePlan } from "@/hooks/useSubscription";
import { formatDate } from "@/utils/format";

/**
 * The plan banner on the dashboard: an upgrade prompt on Free, and a warning when a renewal
 * failed or a plan is about to end. Paid plans in good standing show nothing.
 */
export function PlanBanner() {
  const plan = usePlan();
  const sub = plan.subscription;
  const { leads } = plan.limits;
  const open = () => router.push("/subscription");

  if (sub?.status === "past_due") {
    const store = sub.source === "app_store" || sub.source === "play_store";
    return (
      <AppCallout
        tone="danger"
        title="Your last payment did not go through"
        action={
          <AppButton size="sm" variant="secondary" onPress={open}>
            Fix payment
          </AppButton>
        }
      >
        {`${plan.plan.name} keeps working ${sub.graceUntil ? `until ${formatDate(sub.graceUntil)}` : "for a few days"} while we retry. ${store ? "Update your payment method in the store." : "Check the card or UPI mandate on your plan."}`}
      </AppCallout>
    );
  }
  if (sub?.cancelAtPeriodEnd && sub.endDate) {
    return (
      <AppCallout
        tone="warning"
        title={`${plan.plan.name} ends on ${formatDate(sub.endDate)}`}
        action={
          <AppButton size="sm" variant="secondary" onPress={open}>
            {`Keep ${plan.plan.name}`}
          </AppButton>
        }
      >
        After that you move to Free: 10 leads a month, no analytics and no WhatsApp button.
      </AppCallout>
    );
  }
  if (plan.plan.code !== "free") return null;

  const over = leads.limit !== null && leads.used >= leads.limit;
  const usage = leads.limit !== null ? `${Math.min(leads.used, leads.limit)} of ${leads.limit} leads used this month. ` : "";
  return (
    <AppCallout
      tone={over ? "warning" : "info"}
      title={over ? `You have used all ${leads.limit} free leads this month` : "You are on the Free plan"}
      action={
        <AppButton size="sm" onPress={() => router.push("/paywall")}>
          Upgrade to Pro
        </AppButton>
      }
    >
      {usage +
        (over
          ? "New leads still arrive, but their details stay hidden until you upgrade."
          : "Pro unlocks unlimited leads, analytics, a WhatsApp button and a Pro Partner badge.")}
    </AppCallout>
  );
}
