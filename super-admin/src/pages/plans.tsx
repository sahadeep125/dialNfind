import { useState } from "react";
import { Link } from "react-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, ExternalLink, Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { GATEWAY_LABEL, SOURCE_LABEL, type Badge, type Invoice, type Paged, type PaymentGateway, type Plan, type SubscriptionSource } from "@/lib/types";
import { BillingOverviewTab, InvoicesTab, WebhooksTab } from "@/pages/billing-tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Pager, PageSkeleton } from "@/components/common";
import { ConfirmDialog, EmptyRow, FilterSelect, StatCard, StatusBadge, Table, TableSkeleton, Td, Th, Toolbar, useUrlState } from "@/components/admin-ui";
import { ExportButton } from "@/components/bulk";
import { ProviderPicker } from "@/components/provider-picker";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PlansPage() {
  const [f, setF] = useUrlState({ tab: "overview" });
  return (
    <>
      <PageHeader
        title="Plans and billing"
        description="Plans providers can buy on the web (Razorpay) or in the app (App Store and Google Play through RevenueCat), who is subscribed, every payment and GST invoice."
      />
      <Tabs value={f.tab} onValueChange={(tab) => setF({ tab })}>
        <TabsList className="mb-2 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <BillingOverviewTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="plans">
          <PlansTab />
        </TabsContent>
        <TabsContent value="subscribers">
          <SubscribersTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function PlansTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["plans"], queryFn: () => api<{ plans: Plan[] }>("/admin/plans") });
  const [edit, setEdit] = useState<Plan | "new" | null>(null);
  const sync = useMutation({
    mutationFn: () => api<{ created: { plan: string; billingCycle: string }[] }>("/admin/plans/sync-razorpay", { method: "POST" }),
    onSuccess: ({ created }) => {
      toast.success(created.length ? `Created ${created.length} Razorpay plan${created.length === 1 ? "" : "s"}` : "Every price is already on Razorpay");
      void qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data) return <PageSkeleton />;
  const unsynced = data.plans.some((p) => p.isActive && p.prices.some((pr) => pr.isActive && !pr.razorpayPlanId));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {unsynced && <span className="mr-auto text-sm text-warning">Some prices are not on Razorpay yet, so they cannot be bought on the web.</span>}
        <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync to Razorpay
        </Button>
        <Button onClick={() => setEdit("new")}>
          <Plus /> New plan
        </Button>
      </div>
      {data.plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans yet" text="Create a free and a paid plan to start selling subscriptions." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.plans.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    {p.name} {!p.isActive && <StatusBadge status="closed" label="Not for sale" />}
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold">
                    {p.prices.length ? formatPrice(p.prices.find((pr) => pr.billingCycle === "monthly")?.amount ?? p.price) : "Free"}
                    {p.prices.length > 0 && <span className="text-sm font-medium text-muted-foreground"> / month</span>}
                  </div>
                  {p.prices.find((pr) => pr.billingCycle === "yearly") && (
                    <div className="text-xs text-muted-foreground">{formatPrice(p.prices.find((pr) => pr.billingCycle === "yearly")!.amount)} / year</div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">{p.code}</span>
                    {p.entitlements.map((e) => (
                      <span key={e} className="rounded-md bg-accent px-1.5 py-0.5 font-mono text-[11px] text-primary">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setEdit(p)} aria-label={`Edit ${p.name}`}>
                  <Pencil />
                </Button>
              </div>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {(p.featuresJson ?? []).map((ft) => (
                  <li key={ft} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {ft}
                  </li>
                ))}
              </ul>
              {p.prices.length > 0 && (
                <ul className="mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                  {p.prices.map((pr) => (
                    <li key={pr.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="w-14 font-medium capitalize text-foreground">{pr.billingCycle}</span>
                      <span className={pr.razorpayPlanId ? "text-success" : "text-warning"}>{pr.razorpayPlanId ? "Web" : "Web not synced"}</span>
                      <span className={pr.iosProductId ? "" : "opacity-50"}>iOS {pr.iosProductId ?? "none"}</span>
                      <span className={pr.androidProductId ? "" : "opacity-50"}>Android {pr.androidProductId ?? "none"}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4 text-center text-xs text-muted-foreground">
                <div>
                  <div className="text-base font-semibold text-foreground">{p._count.subscriptions}</div>
                  subscribers
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">{p.leadAccessLimit ?? "No limit"}</div>
                  leads
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">{p.photoLimit ?? "No limit"}</div>
                  photos
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">+{Math.round(Number(p.rankingBoost) * 100)}%</div>
                  rank boost
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <PlanDialog plan={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

const amount = z.string().trim().refine((v) => v === "" || /^\d{1,7}$/.test(v), "Enter whole rupees, or leave empty");
const productId = z.string().trim().max(100, "Keep it under 100 characters");

const planSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{1,30}$/, "Lowercase letters, digits and _, e.g. pro"),
  name: z.string().trim().min(2, "Enter at least 2 characters").max(40, "Keep it under 40 characters"),
  monthly: amount,
  yearly: amount,
  iosMonthly: productId,
  iosYearly: productId,
  androidMonthly: productId,
  androidYearly: productId,
  leadAccessLimit: z.string().trim().refine((v) => v === "" || /^\d{1,6}$/.test(v), "Use a whole number, or leave empty for no limit"),
  photoLimit: z.string().trim().refine((v) => v === "" || /^\d{1,4}$/.test(v), "Use a whole number, or leave empty for no limit"),
  analyticsEnabled: z.boolean(),
  rankingBoost: z.string().trim().refine((v) => /^\d{1,2}$/.test(v) && Number(v) <= 20, "Use a whole number from 0 to 20"),
  badgeId: z.string(),
  features: z.array(z.object({ text: z.string().trim().min(1, "Write the feature or remove the line").max(80, "Keep it under 80 characters") })).max(12, "Up to 12 features"),
  isActive: z.boolean(),
});
type PlanValues = z.infer<typeof planSchema>;

const priceOf = (plan: Plan | null, cycle: "monthly" | "yearly") => plan?.prices.find((p) => p.billingCycle === cycle);

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: badges } = useQuery({ queryKey: ["badges"], queryFn: () => api<{ badges: Badge[] }>("/admin/badges") });
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    mode: "onTouched",
    defaultValues: {
      code: plan?.code ?? "",
      name: plan?.name ?? "",
      monthly: priceOf(plan, "monthly")?.amount.toString() ?? "",
      yearly: priceOf(plan, "yearly")?.amount.toString() ?? "",
      iosMonthly: priceOf(plan, "monthly")?.iosProductId ?? "",
      iosYearly: priceOf(plan, "yearly")?.iosProductId ?? "",
      androidMonthly: priceOf(plan, "monthly")?.androidProductId ?? "",
      androidYearly: priceOf(plan, "yearly")?.androidProductId ?? "",
      leadAccessLimit: plan?.leadAccessLimit?.toString() ?? "",
      photoLimit: plan?.photoLimit?.toString() ?? "",
      analyticsEnabled: plan?.analyticsEnabled ?? false,
      rankingBoost: plan ? String(Math.round(Number(plan.rankingBoost) * 100)) : "0",
      badgeId: plan?.badgeId ? String(plan.badgeId) : "none",
      features: (plan?.featuresJson ?? []).map((text) => ({ text })),
      isActive: plan?.isActive ?? true,
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "features" });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const json = {
      code: v.code,
      name: v.name,
      price: Number(v.monthly || 0),
      billingCycle: "monthly",
      leadAccessLimit: v.leadAccessLimit === "" ? null : Number(v.leadAccessLimit),
      photoLimit: v.photoLimit === "" ? null : Number(v.photoLimit),
      analyticsEnabled: v.analyticsEnabled,
      rankingBoost: Number(v.rankingBoost) / 100,
      badgeId: v.badgeId === "none" ? null : Number(v.badgeId),
      features: v.features.map((f) => f.text),
      isActive: v.isActive,
    };
    const prices = (["monthly", "yearly"] as const)
      .filter((c) => v[c] !== "")
      .map((c) => ({
        billingCycle: c,
        amount: Number(v[c]),
        iosProductId: (c === "monthly" ? v.iosMonthly : v.iosYearly) || null,
        androidProductId: (c === "monthly" ? v.androidMonthly : v.androidYearly) || null,
        isActive: true,
      }));
    try {
      const saved = plan
        ? (await api<{ plan: { id: number } }>(`/admin/plans/${plan.id}`, { method: "PATCH", json })).plan
        : (await api<{ plan: { id: number } }>("/admin/plans", { method: "POST", json })).plan;
      if (v.code !== "free") await api(`/admin/plans/${saved.id}/prices`, { method: "PUT", json: { prices } });
      toast.success(plan ? "Plan saved" : "Plan created");
      void qc.invalidateQueries({ queryKey: ["plans"] });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "New plan"}</DialogTitle>
          <DialogDescription>
            Price changes apply to new purchases; run Sync to Razorpay afterwards. Store prices are set in App Store Connect and Google Play for the product IDs below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <FormAlert message={error} />
            </div>
          )}
          <Field id="plan-name" label="Name" error={errors.name} required>
            <Input {...fieldA11y("plan-name", errors.name)} maxLength={40} {...register("name")} />
          </Field>
          <Field id="plan-code" label="Code" error={errors.code} required hint={plan ? "Fixed once created" : "free, pro or business decide what it unlocks"}>
            <Input {...fieldA11y("plan-code", errors.code, true)} maxLength={31} disabled={!!plan} className="font-mono" {...register("code")} />
          </Field>
          <Field id="plan-monthly" label="Monthly price (Rs, incl. GST)" error={errors.monthly} optional>
            <Input {...fieldA11y("plan-monthly", errors.monthly)} inputMode="numeric" maxLength={7} {...register("monthly")} />
          </Field>
          <Field id="plan-yearly" label="Yearly price (Rs, incl. GST)" error={errors.yearly} optional>
            <Input {...fieldA11y("plan-yearly", errors.yearly)} inputMode="numeric" maxLength={7} {...register("yearly")} />
          </Field>
          <Field id="plan-ios-m" label="iOS product, monthly" error={errors.iosMonthly} optional>
            <Input {...fieldA11y("plan-ios-m", errors.iosMonthly)} className="font-mono" placeholder="dnf_pro_monthly" {...register("iosMonthly")} />
          </Field>
          <Field id="plan-ios-y" label="iOS product, yearly" error={errors.iosYearly} optional>
            <Input {...fieldA11y("plan-ios-y", errors.iosYearly)} className="font-mono" placeholder="dnf_pro_yearly" {...register("iosYearly")} />
          </Field>
          <Field id="plan-and-m" label="Android product, monthly" error={errors.androidMonthly} optional>
            <Input {...fieldA11y("plan-and-m", errors.androidMonthly)} className="font-mono" placeholder="dnf_pro:monthly" {...register("androidMonthly")} />
          </Field>
          <Field id="plan-and-y" label="Android product, yearly" error={errors.androidYearly} optional>
            <Input {...fieldA11y("plan-and-y", errors.androidYearly)} className="font-mono" placeholder="dnf_pro:yearly" {...register("androidYearly")} />
          </Field>
          <Field id="plan-photos" label="Photo limit" error={errors.photoLimit} hint="Empty means no limit" optional>
            <Input {...fieldA11y("plan-photos", errors.photoLimit, true)} inputMode="numeric" maxLength={4} {...register("photoLimit")} />
          </Field>
          <Field id="plan-leads" label="Lead limit" error={errors.leadAccessLimit} hint="Empty means no limit" optional>
            <Input {...fieldA11y("plan-leads", errors.leadAccessLimit, true)} inputMode="numeric" maxLength={6} {...register("leadAccessLimit")} />
          </Field>
          <Field id="plan-boost" label="Ranking boost (%)" error={errors.rankingBoost} hint="Small nudge in search, 0 to 20">
            <Input {...fieldA11y("plan-boost", errors.rankingBoost, true)} inputMode="numeric" maxLength={2} {...register("rankingBoost")} />
          </Field>
          <Field id="plan-badge" label="Badge given">
            <Controller
              control={control}
              name="badgeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="plan-badge" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No badge</SelectItem>
                    {badges?.badges.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <div className="text-sm font-medium">Features shown on the pricing page</div>
            {fields.map((f, i) => (
              <div key={f.id}>
                <div className="flex gap-2">
                  <Input aria-label={`Feature ${i + 1}`} aria-invalid={errors.features?.[i]?.text ? true : undefined} maxLength={80} {...register(`features.${i}.text`)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label={`Remove feature ${i + 1}`}>
                    <Trash2 />
                  </Button>
                </div>
                {errors.features?.[i]?.text && (
                  <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                    {errors.features[i]?.text?.message}
                  </p>
                )}
              </div>
            ))}
            {fields.length < 12 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })}>
                <Plus /> Add feature
              </Button>
            )}
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <span className="text-sm font-medium">Includes analytics</span>
            <Controller control={control} name="analyticsEnabled" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <span className="text-sm font-medium">On sale</span>
            <Controller control={control} name="isActive" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} Save plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface Sub {
  id: number;
  status: string;
  source: SubscriptionSource;
  billingCycle: "monthly" | "yearly";
  externalId: string | null;
  externalUrl: string | null;
  amount: number;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  graceUntil: string | null;
  plan: { id: number; code: string; name: string; price: number; billingCycle: string };
  provider: { id: number; businessName: string; city: string };
}

function SubscribersTab() {
  const qc = useQueryClient();
  const [f, setF] = useState({ status: "active", source: "", page: 1 });
  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions", f],
    queryFn: () =>
      api<{ subscriptions: Sub[] } & Paged>(`/admin/subscriptions?page=${f.page}&pageSize=20${f.status ? `&status=${f.status}` : ""}${f.source ? `&source=${f.source}` : ""}`),
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api(`/admin/subscriptions/${id}`, { method: "PATCH", json: { status: "cancelled", autoRenew: false } }),
    onSuccess: () => {
      toast.success("Subscription cancelled");
      void qc.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <Toolbar>
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={f.status}
          onChange={(status) => setF({ ...f, status, page: 1 })}
          options={[
            { value: "active", label: "Active" },
            { value: "past_due", label: "Payment failed" },
            { value: "pending", label: "Checkout started" },
            { value: "expired", label: "Expired" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <FilterSelect
          label="Bought in"
          allLabel="Anywhere"
          value={f.source}
          onChange={(source) => setF({ ...f, source, page: 1 })}
          options={Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <div className="sm:ml-auto">
          <ExportButton entity="subscriptions" filters={{ status: f.status, source: f.source }} />
        </div>
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>Provider</Th>
            <Th>Plan</Th>
            <Th>Bought in</Th>
            <Th>Started</Th>
            <Th>Renews or ends</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={7} />}
          {data?.subscriptions.length === 0 && <EmptyRow cols={7} text="No subscriptions match." />}
          {data?.subscriptions.map((s) => (
            <tr key={s.id}>
              <Td>
                <Link to={`/providers/${s.provider.id}`} className="font-medium hover:text-primary">
                  {s.provider.businessName}
                </Link>
                <div className="text-xs text-muted-foreground">{s.provider.city}</div>
              </Td>
              <Td>
                <div className="font-medium">{s.plan.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(s.amount)} / {s.billingCycle === "yearly" ? "year" : "month"}
                </div>
              </Td>
              <Td>
                {SOURCE_LABEL[s.source]}
                {s.externalUrl && (
                  <a href={s.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary">
                    {s.externalId?.slice(0, 22)} <ExternalLink className="size-3" />
                  </a>
                )}
              </Td>
              <Td className="whitespace-nowrap">{formatDate(s.startDate)}</Td>
              <Td className="whitespace-nowrap">
                {s.endDate ? formatDate(s.endDate) : "No end"}
                <div className="text-xs text-muted-foreground">{s.source === "admin" ? "Does not renew" : s.autoRenew ? "Renews" : "Cancelled, ends then"}</div>
              </Td>
              <Td>
                <StatusBadge status={s.status} label={s.status === "past_due" ? "Payment failed" : undefined} />
                {s.graceUntil && s.status === "past_due" && <div className="mt-1 text-xs text-muted-foreground">Grace until {formatDate(s.graceUntil)}</div>}
              </Td>
              <Td className="text-right">
                {(s.status === "active" || s.status === "past_due") && s.source !== "app_store" && s.source !== "play_store" && (
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={cancel.isPending} onClick={() => confirm(`Cancel ${s.provider.businessName}'s ${s.plan.name} plan now? ${s.source === "razorpay" ? "Razorpay stops charging them and " : ""}they move to Free straight away.`) && cancel.mutate(s.id)}>
                    Cancel
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(page) => setF({ ...f, page })} />}
    </>
  );
}

interface Txn {
  id: number;
  type: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  invoice: Invoice | null;
  subscription: { id: number; billingCycle: string; plan: { name: string } } | null;
  status: string;
  gatewayTxnId: string | null;
  note: string | null;
  createdAt: string;
  provider: { id: number; businessName: string };
}

const TXN_TYPES: Record<string, string> = { subscription: "Plan", lead_fee: "Lead fee", sponsored_ad: "Promotion" };

function PaymentsTab() {
  const qc = useQueryClient();
  const [f, setF] = useState({ status: "", type: "", gateway: "", page: 1 });
  const [recording, setRecording] = useState(false);
  const issue = useMutation({
    mutationFn: (id: number) => api(`/admin/transactions/${id}/invoice`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Invoice issued");
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const [reversing, setReversing] = useState<{ txn: Txn; status: "refunded" | "failed" } | null>(null);
  const [reason, setReason] = useState("");
  const reverse = useMutation({
    mutationFn: () => api(`/admin/transactions/${reversing!.txn.id}`, { method: "PATCH", json: { status: reversing!.status, note: reason.trim() } }),
    onSuccess: () => {
      toast.success(reversing!.status === "refunded" ? "Marked as refunded" : "Marked as failed");
      setReversing(null);
      setReason("");
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const qs = new URLSearchParams({
    page: String(f.page),
    pageSize: "20",
    ...(f.status ? { status: f.status } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.gateway ? { gateway: f.gateway } : {}),
  });
  const { data, isLoading } = useQuery({ queryKey: ["transactions", qs.toString()], queryFn: () => api<{ transactions: Txn[]; revenue: number } & Paged>(`/admin/transactions?${qs}`) });
  return (
    <>
      {data && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Collected (matching filters)" value={formatPrice(data.revenue)} tone="success" />
          <StatCard label="Payments" value={data.total.toLocaleString("en-IN")} />
        </div>
      )}
      <Toolbar>
        <FilterSelect
          label="Type"
          allLabel="Any type"
          value={f.type}
          onChange={(type) => setF({ ...f, type, page: 1 })}
          options={Object.entries(TXN_TYPES).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={f.status}
          onChange={(status) => setF({ ...f, status, page: 1 })}
          options={["success", "pending", "failed", "refunded"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
        <FilterSelect
          label="Paid via"
          allLabel="Any method"
          value={f.gateway}
          onChange={(gateway) => setF({ ...f, gateway, page: 1 })}
          options={Object.entries(GATEWAY_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <div className="flex gap-2 sm:ml-auto">
          <ExportButton entity="transactions" filters={{ status: f.status, type: f.type, gateway: f.gateway }} />
          <Button size="sm" onClick={() => setRecording(true)}>
            <Plus /> Record payment
          </Button>
        </div>
      </Toolbar>
      <RecordPaymentDialog open={recording} onOpenChange={setRecording} />
      {reversing && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && (setReversing(null), setReason(""))}
          title={reversing.status === "refunded" ? "Mark this payment refunded?" : "Mark this payment failed?"}
          description={
            reversing.status === "refunded" && reversing.txn.gateway === "razorpay"
              ? `${formatPrice(reversing.txn.amount)} goes back to ${reversing.txn.provider.businessName} through Razorpay now, and the invoice is voided. Their plan is not changed; cancel it from Subscribers if needed.`
              : `${formatPrice(reversing.txn.amount)} from ${reversing.txn.provider.businessName} stops counting as revenue and its invoice is voided. Return the money outside DialNFind first; this only records it.`
          }
          confirmLabel={reversing.status === "refunded" ? "Mark refunded" : "Mark failed"}
          destructive
          busy={reverse.isPending || reason.trim().length < 3}
          onConfirm={() => reverse.mutate()}
        >
          <div className="space-y-2">
            <Label htmlFor="reverse-reason">Reason</Label>
            <Textarea id="reverse-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </ConfirmDialog>
      )}
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Provider</Th>
            <Th>For</Th>
            <Th>Amount</Th>
            <Th>Paid via</Th>
            <Th>Invoice</Th>
            <Th>Status</Th>
            <Th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={8} />}
          {data?.transactions.length === 0 && <EmptyRow cols={8} text="No payments match." />}
          {data?.transactions.map((t) => (
            <tr key={t.id}>
              <Td className="whitespace-nowrap">{formatDate(t.createdAt)}</Td>
              <Td>
                <Link to={`/providers/${t.provider.id}`} className="font-medium hover:text-primary">
                  {t.provider.businessName}
                </Link>
              </Td>
              <Td>
                {TXN_TYPES[t.type] ?? t.type}
                {t.subscription && <div className="text-xs text-muted-foreground">{t.subscription.plan.name}, {t.subscription.billingCycle}</div>}
              </Td>
              <Td className="font-semibold tabular-nums">{t.currency === "INR" ? formatPrice(t.amount) : `${t.currency} ${t.amount}`}</Td>
              <Td>
                {GATEWAY_LABEL[t.gateway]}
                <div className="max-w-40 truncate font-mono text-xs text-muted-foreground" title={t.gatewayTxnId ?? undefined}>
                  {t.gatewayTxnId ?? "None"}
                </div>
              </Td>
              <Td>
                {t.invoice ? (
                  <a href={t.invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs hover:text-primary">
                    {t.invoice.number}
                    {t.invoice.status === "void" && " (void)"}
                  </a>
                ) : t.gateway === "app_store" || t.gateway === "play_store" ? (
                  <span className="text-xs text-muted-foreground">Store receipt</span>
                ) : t.status === "success" ? (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={issue.isPending} onClick={() => issue.mutate(t.id)}>
                    Issue invoice
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </Td>
              <Td>
                <StatusBadge status={t.status} />
                {t.note && <div className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={t.note}>{t.note}</div>}
              </Td>
              <Td>
                {t.status === "success" && t.gateway !== "app_store" && t.gateway !== "play_store" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for payment from ${t.provider.businessName}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setReversing({ txn: t, status: "refunded" })}>{t.gateway === "razorpay" ? "Refund through Razorpay" : "Mark refunded"}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setReversing({ txn: t, status: "failed" })}>Mark failed</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(page) => setF({ ...f, page })} />}
    </>
  );
}

/** A payment received outside the app (UPI, bank transfer, cash), for example before a plan is granted. */
function RecordPaymentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<{ id: number; businessName: string; city: string } | null>(null);
  const [type, setType] = useState<"subscription" | "sponsored_ad">("subscription");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reset = () => {
    setProvider(null);
    setAmount("");
    setReference("");
    setNote("");
    setError(null);
  };
  const save = useMutation({
    mutationFn: () => api("/admin/transactions", { method: "POST", json: { providerId: provider!.id, type, amount: Number(amount), reference: reference.trim(), note: note.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Payment recorded");
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>For money received outside DialNFind. To also switch the plan, use Change plan on the provider page, which records the payment for you.</DialogDescription>
        </DialogHeader>
        <form
          id="record-payment"
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!provider) return setError("Choose the provider");
            if (!(Number(amount) > 0)) return setError("Enter the amount received");
            if (reference.trim().length < 3) return setError("Enter the UPI or bank reference");
            save.mutate();
          }}
        >
          <FormAlert message={error} />
          <div className="space-y-2">
            <Label htmlFor="pay-provider">Provider</Label>
            <ProviderPicker id="pay-provider" value={provider} onChange={(p) => (setProvider(p), setError(null))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay-type">For</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="pay-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Plan</SelectItem>
                  <SelectItem value="sponsored_ad">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (Rs)</Label>
              <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-ref">UPI or bank reference</Label>
            <Input id="pay-ref" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id="pay-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="record-payment" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
