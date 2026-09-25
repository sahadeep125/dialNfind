import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertTriangle, Check, Crown, Lock, Sparkles } from "lucide-react";
import { UPGRADE_EVENT, type UpgradeDetail } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { FEATURE_COPY, planFor, usePlan } from "@/lib/plan";
import type { Entitlement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SOURCE_LABEL = { admin: "set up by our team", razorpay: "paid online", app_store: "App Store", play_store: "Google Play" } as const;

/**
 * The plan banner at the top of the dashboard: an upgrade prompt on Free, and a warning when a
 * payment failed or a plan is about to end. Paid plans in good standing show nothing.
 */
export function PlanBanner() {
  const plan = usePlan();
  const sub = plan.subscription;
  const { leads } = plan.limits;

  if (sub?.status === "past_due") {
    return (
      <Banner tone="danger" icon={AlertTriangle} title="Your last payment did not go through" action={<BannerLink to="/subscription">Update payment</BannerLink>}>
        {plan.plan.name} keeps working {sub.graceUntil ? `until ${formatDate(sub.graceUntil)}` : "for a few days"} while we retry.{" "}
        {sub.source === "app_store" || sub.source === "play_store" ? "Update your payment method in the store." : "Check the card or UPI mandate on your plan."}
      </Banner>
    );
  }
  if (sub && sub.cancelAtPeriodEnd && sub.endDate) {
    return (
      <Banner tone="warning" icon={AlertTriangle} title={`${plan.plan.name} ends on ${formatDate(sub.endDate)}`} action={<BannerLink to="/subscription">Keep {plan.plan.name}</BannerLink>}>
        After that you move to Free: 10 leads a month, no analytics and no WhatsApp button.
      </Banner>
    );
  }
  if (plan.plan.code !== "free") return null;

  const over = leads.limit !== null && leads.used >= leads.limit;
  return (
    <Banner
      tone={over ? "warning" : "brand"}
      icon={Sparkles}
      title={over ? `You have used all ${leads.limit} free leads this month` : "You are on the Free plan"}
      action={<BannerLink to="/subscription">Upgrade to Pro</BannerLink>}
    >
      {leads.limit !== null && (
        <span className="mr-1 font-medium text-foreground">
          {Math.min(leads.used, leads.limit)} of {leads.limit} leads used this month.
        </span>
      )}
      {over ? "New leads still arrive, but their details stay hidden until you upgrade." : "Pro unlocks unlimited leads, analytics, a WhatsApp button and a Pro Partner badge."}
    </Banner>
  );
}

function Banner({
  tone,
  icon: Icon,
  title,
  action,
  children,
}: {
  tone: "brand" | "warning" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    brand: "border-primary/30 bg-accent/60 [&_svg]:text-primary",
    warning: "border-warning/40 bg-warning/10 [&_svg]:text-warning",
    danger: "border-destructive/40 bg-destructive/10 [&_svg]:text-destructive",
  };
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", tones[tone])}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div>
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground">{children}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

const BannerLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Button asChild size="sm">
    <Link to={to}>{children}</Link>
  </Button>
);

/** The current plan as a small chip for the header. */
export function PlanChip() {
  const plan = usePlan();
  const paid = plan.plan.code !== "free";
  return (
    <Link
      to="/subscription"
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold sm:inline-flex",
        paid ? "border-primary/30 bg-accent text-primary" : "text-muted-foreground hover:text-foreground",
      )}
      title={plan.subscription ? `${plan.plan.name}, ${SOURCE_LABEL[plan.subscription.source]}` : "Free plan"}
    >
      {paid ? <Crown className="size-3.5" /> : null}
      {plan.plan.name}
      {!paid && <span className="text-primary">· Upgrade</span>}
    </Link>
  );
}

/**
 * Shows its children only when the plan has the entitlement; otherwise a locked card explaining
 * what the upgrade unlocks. Servers enforce the same rules, so this is about the explanation.
 */
export function FeatureGate({ feature, children, className }: { feature: keyof typeof FEATURE_COPY; children: React.ReactNode; className?: string }) {
  const plan = usePlan();
  const copy = FEATURE_COPY[feature];
  if (plan.entitlements.includes(copy.entitlement)) return <>{children}</>;
  return <LockedCard feature={feature} className={className} />;
}

export function LockedCard({ feature, className, compact }: { feature: keyof typeof FEATURE_COPY; className?: string; compact?: boolean }) {
  const copy = FEATURE_COPY[feature];
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card p-6 text-center", compact ? "gap-2" : "gap-3 py-10", className)}>
      <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
        <Lock className="size-5" />
      </span>
      <div className="font-semibold">{copy.title}</div>
      {!compact && <p className="max-w-sm text-sm text-muted-foreground">{copy.text}</p>}
      <Button asChild size="sm" className="mt-1">
        <Link to="/subscription">Upgrade to {planFor(copy.entitlement)}</Link>
      </Button>
    </div>
  );
}

/** Opens when any request answers 402 upgrade_required, wherever the provider is in the app. */
export function UpgradeDialog() {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<UpgradeDetail | null>(null);
  useEffect(() => {
    const onUpgrade = (e: Event) => setDetail((e as CustomEvent<UpgradeDetail>).detail);
    window.addEventListener(UPGRADE_EVENT, onUpgrade);
    return () => window.removeEventListener(UPGRADE_EVENT, onUpgrade);
  }, []);
  const copy = detail ? FEATURE_COPY[detail.feature] : null;
  const planName = planFor((detail?.entitlement ?? "provider_pro") as Entitlement);
  return (
    <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <Crown className="size-5" />
          </span>
          <DialogTitle>{copy?.title ?? `Upgrade to ${planName}`}</DialogTitle>
          <DialogDescription>{detail?.message}</DialogDescription>
        </DialogHeader>
        {copy && (
          <p className="flex gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-success" /> {copy.text}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetail(null)}>
            Not now
          </Button>
          <Button
            onClick={() => {
              setDetail(null);
              navigate("/subscription");
            }}
          >
            See {planName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
