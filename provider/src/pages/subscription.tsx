import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Check, Crown, Download, ExternalLink, FileText, Loader2, Receipt, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { GST_STATES, GSTIN_PATTERN } from "@/lib/gst";
import { openCheckout } from "@/lib/razorpay";
import type { BillingCycle, BillingResponse, PlanCode, PlanForSale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { Field, fieldA11y } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const POPULAR: PlanCode = "business";
const SOURCE_LABEL = { admin: "Set up by the DialNFind team", razorpay: "Paid online", app_store: "Bought in the App Store", play_store: "Bought on Google Play" } as const;
const STATUS_BADGE = {
  active: { label: "Active", variant: "success" },
  past_due: { label: "Payment failed", variant: "destructive" },
  pending: { label: "Waiting for payment", variant: "warning" },
  expired: { label: "Ended", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "muted" },
} as const;
const GATEWAY_LABEL = { manual: "Paid to our team", razorpay: "Online", app_store: "App Store", play_store: "Google Play" } as const;

export function SubscriptionPage() {
  const qc = useQueryClient();
  const { refresh, user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["billing"], queryFn: () => api<BillingResponse>("/provider/billing") });
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [confirm, setConfirm] = useState<{ kind: "cancel" } | { kind: "switch"; plan: PlanForSale } | null>(null);

  // Plan changes show up everywhere: the auth context carries the plan every page gates on.
  const afterChange = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["billing"] }), qc.invalidateQueries({ queryKey: ["dashboard"] }), refresh()]);
  };

  const checkout = useMutation({
    mutationFn: async (plan: PlanForSale) => {
      const session = await api<{ subscriptionId: string; keyId: string; name: string; description: string; prefill: Record<string, string>; notes: Record<string, string> }>(
        "/provider/billing/razorpay/checkout",
        { method: "POST", json: { planCode: plan.code, billingCycle: cycle } },
      );
      const result = await openCheckout({
        key: session.keyId,
        subscription_id: session.subscriptionId,
        name: session.name,
        description: session.description,
        prefill: session.prefill,
        notes: session.notes,
        theme: { color: "#3d4bd6" },
      });
      if (!result) return null;
      await api("/provider/billing/razorpay/verify", { method: "POST", json: result });
      return plan;
    },
    onSuccess: async (plan) => {
      if (!plan) return;
      await afterChange();
      toast.success(`Welcome to ${plan.name}. Your invoice is below and on its way to ${user?.email}.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const change = useMutation({
    mutationFn: (plan: PlanForSale) => api("/provider/billing/change-plan", { method: "POST", json: { planCode: plan.code, billingCycle: cycle } }),
    onSuccess: async (_d, plan) => {
      setConfirm(null);
      await afterChange();
      toast.success(`You are now on ${plan.name}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: () => api("/provider/billing/cancel", { method: "POST" }),
    onSuccess: async () => {
      setConfirm(null);
      await afterChange();
      toast.success("Your plan will not renew. It keeps working until the end of the paid period.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const resume = useMutation({
    mutationFn: () => api("/provider/billing/resume", { method: "POST" }),
    onSuccess: async () => {
      await afterChange();
      toast.success("Your plan will renew as usual");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !data) return <PageSkeleton />;
  const { state } = data;
  const sub = state.subscription;
  const storeManaged = data.managedIn === "app_store" || data.managedIn === "play_store";
  const busy = checkout.isPending || change.isPending;

  const choose = (plan: PlanForSale) => {
    if (data.managedIn === "web") setConfirm({ kind: "switch", plan });
    else checkout.mutate(plan);
  };

  return (
    <>
      <PageHeader
        title="Plan and billing"
        description="Every plan keeps your listing free to find. Paid plans unlock every lead, analytics, a WhatsApp button and a partner badge. Prices include 18% GST."
      />

      <CurrentPlan
        data={data}
        onCancel={() => setConfirm({ kind: "cancel" })}
        onResume={() => resume.mutate()}
        resuming={resume.isPending}
      />

      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Choose a plan</h2>
          {!data.web.enabled && <p className="text-sm text-muted-foreground">Online payments are being set up. Contact support to upgrade in the meantime.</p>}
        </div>
        <div className="inline-flex rounded-xl bg-muted p-1" role="radiogroup" aria-label="Billing cycle">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cycle === c}
              onClick={() => setCycle(c)}
              className={cn("h-8 cursor-pointer rounded-lg px-3 text-sm font-medium", cycle === c ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {c === "monthly" ? "Monthly" : "Yearly"}
              {c === "yearly" && <span className="ml-1.5 text-xs text-success">2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.plans.map((p) => {
          const price = p.prices.find((pr) => pr.billingCycle === cycle);
          const isCurrent = state.plan.code === p.code && (p.code === "free" || sub?.billingCycle === cycle);
          const featured = p.code === POPULAR;
          let action: React.ReactNode;
          if (p.code === "free") {
            action = state.plan.code === "free" ? <Button className="mt-6 w-full" variant="outline" disabled>Current plan</Button> : null;
          } else if (isCurrent) {
            action = <Button className="mt-6 w-full" variant="outline" disabled>Current plan</Button>;
          } else if (storeManaged) {
            action = (
              <Button className="mt-6 w-full" variant="outline" disabled>
                <Smartphone /> Change in the app
              </Button>
            );
          } else if (!data.web.enabled || !price?.availableOnWeb) {
            action = (
              <Button asChild className="mt-6 w-full" variant={featured ? "default" : "outline"}>
                <Link to="/support">Contact us to upgrade</Link>
              </Button>
            );
          } else {
            const pending = busy && (checkout.variables?.code === p.code || change.variables?.code === p.code);
            action = (
              <Button className="mt-6 w-full" variant={featured ? "default" : "outline"} disabled={busy} onClick={() => choose(p)}>
                {pending && <Loader2 className="animate-spin" />}
                {data.managedIn === "web" ? `Switch to ${p.name}` : `Get ${p.name}`}
              </Button>
            );
          }
          return (
            <div
              key={p.id}
              className={cn("relative flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]", featured && "border-primary ring-1 ring-primary", isCurrent && "bg-accent/40")}
            >
              {featured && <Badge className="absolute -top-2.5 left-6">Most popular</Badge>}
              {isCurrent && !featured && <Badge variant="success" className="absolute -top-2.5 left-6">Your plan</Badge>}
              <div className="flex items-center gap-2 font-semibold">
                {p.code !== "free" && <Crown className="size-4 text-primary" />}
                {p.name}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{price ? formatPrice(price.amount) : "Free"}</span>
                {price && <span className="text-sm text-muted-foreground">/ {cycle === "yearly" ? "year" : "month"}</span>}
              </div>
              {price && cycle === "yearly" && <div className="text-xs text-muted-foreground">{formatPrice(Math.round(price.amount / 12))} a month, billed yearly</div>}
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {(p.featuresJson ?? []).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              {action}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Plans renew automatically by card or UPI Autopay until you cancel. Cancel any time; you keep the plan until the end of the period you paid for.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
        <Invoices data={data} />
        <BillingDetails data={data} />
      </div>
      <Payments data={data} />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm?.kind === "cancel" ? (
            <>
              <DialogHeader>
                <DialogTitle>Cancel {state.plan.name}?</DialogTitle>
                <DialogDescription>
                  Your plan stays active until {sub?.endDate ? formatDate(sub.endDate) : "the end of this period"} and will not renew. After that you move to Free: 10 leads a month
                  with details, no analytics and no WhatsApp button.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Keep {state.plan.name}
                </Button>
                <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                  {cancel.isPending && <Loader2 className="animate-spin" />} Cancel plan
                </Button>
              </DialogFooter>
            </>
          ) : confirm?.kind === "switch" ? (
            <>
              <DialogHeader>
                <DialogTitle>Switch to {confirm.plan.name}?</DialogTitle>
                <DialogDescription>
                  The change applies now. Razorpay charges the new price of {formatPrice(confirm.plan.prices.find((p) => p.billingCycle === cycle)?.amount)} per{" "}
                  {cycle === "yearly" ? "year" : "month"} from your next renewal, using the payment method on your current plan.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Not now
                </Button>
                <Button onClick={() => change.mutate(confirm.plan)} disabled={change.isPending}>
                  {change.isPending && <Loader2 className="animate-spin" />} Switch plan
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CurrentPlan({ data, onCancel, onResume, resuming }: { data: BillingResponse; onCancel: () => void; onResume: () => void; resuming: boolean }) {
  const { state } = data;
  const sub = state.subscription;
  const { leads, photos } = state.limits;
  const status = sub ? STATUS_BADGE[sub.status] : null;
  return (
    <Panel>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <Crown className="size-6" />
          </span>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold">{state.plan.name}</span>
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
              {sub?.cancelAtPeriodEnd && sub.status === "active" && <Badge variant="warning">Does not renew</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {sub
                ? [
                    SOURCE_LABEL[sub.source],
                    sub.billingCycle === "yearly" ? "billed yearly" : "billed monthly",
                    sub.endDate && `${sub.cancelAtPeriodEnd || sub.source === "admin" ? "ends" : "renews"} on ${formatDate(sub.endDate)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Free forever. Upgrade any time."}
            </p>
            {sub?.status === "past_due" && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                The last renewal payment failed. {sub.graceUntil ? `Your plan keeps working until ${formatDate(sub.graceUntil)} while it is retried.` : ""}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">Leads this month: </span>
                <span className="font-medium">
                  {leads.limit === null ? `${leads.used} (unlimited)` : leads.used > leads.limit ? `${leads.used}, first ${leads.limit} in full` : `${leads.used} of ${leads.limit}`}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Photos: </span>
                <span className="font-medium">{photos.limit === null ? `${photos.used} (unlimited)` : `${photos.used} of ${photos.limit}`}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {data.managedIn === "web" && !sub?.cancelAtPeriodEnd && (
            <Button variant="outline" onClick={onCancel}>
              Cancel plan
            </Button>
          )}
          {data.managedIn === "web" && sub?.cancelAtPeriodEnd && (
            <Button onClick={onResume} disabled={resuming}>
              {resuming && <Loader2 className="animate-spin" />} Keep my plan
            </Button>
          )}
          {data.manageUrl && (
            <Button asChild variant="outline">
              <a href={data.manageUrl} target="_blank" rel="noopener noreferrer">
                Manage in {data.managedIn === "app_store" ? "App Store" : "Google Play"} <ExternalLink />
              </a>
            </Button>
          )}
          {data.managedIn === "support" && (
            <Button asChild variant="outline">
              <Link to="/support">Contact support</Link>
            </Button>
          )}
        </div>
      </div>
      {(data.managedIn === "app_store" || data.managedIn === "play_store") && (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          This plan is billed by {data.managedIn === "app_store" ? "Apple" : "Google"}. Change or cancel it from the DialNFind Business app or your store subscriptions; the
          receipt comes from the store.
        </p>
      )}
    </Panel>
  );
}

function Invoices({ data }: { data: BillingResponse }) {
  return (
    <Panel title="Invoices" description="GST tax invoices for payments made online or to our team.">
      {data.invoices.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" /> No invoices yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-3 font-medium">Invoice</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 text-right font-medium">Amount</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.invoices.map((i) => (
                <tr key={i.id}>
                  <td className="py-3 font-mono text-xs">
                    {i.number}
                    {i.status === "void" && <Badge variant="muted" className="ml-2">Void</Badge>}
                  </td>
                  <td className="py-3">{formatDate(i.issuedAt)}</td>
                  <td className="py-3 text-right tabular-nums">
                    <div className="font-medium">{formatPrice(i.total)}</div>
                    <div className="text-xs text-muted-foreground">incl. {formatPrice(i.tax)} GST</div>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <a href={i.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download /> PDF
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Payments({ data }: { data: BillingResponse }) {
  return (
    <Panel title="Payment history" className="mt-6">
      {data.transactions.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt className="size-4" /> No payments yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Paid via</th>
                <th className="pb-3 font-medium">Invoice</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="py-3">{formatDate(t.createdAt)}</td>
                  <td className="py-3">
                    {t.type === "subscription" ? "Plan payment" : t.type === "sponsored_ad" ? "Sponsored campaign" : "Lead fee"}
                    {t.status !== "success" && (
                      <Badge variant={t.status === "refunded" ? "muted" : "destructive"} className="ml-2 capitalize">
                        {t.status}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 text-muted-foreground">{GATEWAY_LABEL[t.gateway]}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">
                    {t.invoiceNumber ?? (t.gateway === "app_store" || t.gateway === "play_store" ? "Store receipt" : "-")}
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums">
                    {t.currency === "INR" ? formatPrice(t.amount) : `${t.currency} ${t.amount.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const profileSchema = z
  .object({
    billingName: z.string().trim().min(2, "Enter the name for invoices").max(150),
    billingAddress: z.string().trim().min(5, "Enter the billing address").max(300),
    billingStateCode: z.string().min(1, "Choose a state"),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || GSTIN_PATTERN.test(v), "Enter a valid 15-character GSTIN, or leave it empty"),
  })
  .refine((v) => !v.gstin || v.gstin.slice(0, 2) === v.billingStateCode, { path: ["gstin"], message: "The first two digits must match the state" });
type ProfileForm = z.infer<typeof profileSchema>;

function BillingDetails({ data }: { data: BillingResponse }) {
  const qc = useQueryClient();
  const initial = (): ProfileForm => ({
    billingName: data.billingProfile.billingName ?? "",
    billingAddress: data.billingProfile.billingAddress ?? "",
    billingStateCode: data.billingProfile.billingStateCode ?? "",
    gstin: data.billingProfile.gstin ?? "",
  });
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: initial() });
  const { errors, isDirty } = form.formState;
  useEffect(() => form.reset(initial()), [data.billingProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (v: ProfileForm) => api("/provider/billing/profile", { method: "PUT", json: { ...v, gstin: v.gstin || null } }),
    onSuccess: () => {
      toast.success("Billing details saved. New invoices use them.");
      void qc.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Panel title="Billing details" description="Printed on your invoices. Add a GSTIN to claim input tax credit." className="h-fit">
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <Field id="billingName" label="Name on invoice" required error={errors.billingName}>
          <Input {...fieldA11y("billingName", errors.billingName)} {...form.register("billingName")} />
        </Field>
        <Field id="billingAddress" label="Billing address" required error={errors.billingAddress}>
          <Textarea rows={2} {...fieldA11y("billingAddress", errors.billingAddress)} {...form.register("billingAddress")} />
        </Field>
        <Field id="billingStateCode" label="State" required error={errors.billingStateCode}>
          <Select value={form.watch("billingStateCode")} onValueChange={(v) => form.setValue("billingStateCode", v, { shouldDirty: true, shouldValidate: true })}>
            <SelectTrigger id="billingStateCode" className="w-full" aria-invalid={!!errors.billingStateCode || undefined}>
              <SelectValue placeholder="Choose a state" />
            </SelectTrigger>
            <SelectContent>
              {GST_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="gstin" label="GSTIN" optional error={errors.gstin} hint="15 characters, e.g. 19ABCDE1234F1Z5">
          <Input {...fieldA11y("gstin", errors.gstin, true)} className="uppercase" maxLength={15} {...form.register("gstin")} />
        </Field>
        <Button type="submit" variant="outline" className="w-full" disabled={!isDirty || save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />} Save billing details
        </Button>
      </form>
    </Panel>
  );
}
