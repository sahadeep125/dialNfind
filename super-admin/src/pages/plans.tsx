import { useState } from "react";
import { Link } from "react-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import type { Badge, Paged, Plan } from "@/lib/types";
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
  const [f, setF] = useUrlState({ tab: "plans" });
  return (
    <>
      <PageHeader title="Plans and billing" description="Subscription plans providers can buy, who is subscribed and every payment." />
      <Tabs value={f.tab} onValueChange={(tab) => setF({ tab })}>
        <TabsList className="mb-2">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
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
  const { data } = useQuery({ queryKey: ["plans"], queryFn: () => api<{ plans: Plan[] }>("/admin/plans") });
  const [edit, setEdit] = useState<Plan | "new" | null>(null);
  if (!data) return <PageSkeleton />;
  return (
    <>
      <div className="mb-4 flex justify-end">
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
                    {formatPrice(p.price)}
                    <span className="text-sm font-medium text-muted-foreground"> / {p.billingCycle === "yearly" ? "year" : "month"}</span>
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
              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center text-xs text-muted-foreground">
                <div>
                  <div className="text-base font-semibold text-foreground">{p._count.subscriptions}</div>
                  subscribers
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">{p.leadAccessLimit ?? "No limit"}</div>
                  leads
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

const planSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(40, "Keep it under 40 characters"),
  price: z.string().trim().refine((v) => /^\d{1,7}$/.test(v), "Enter whole rupees, 0 for a free plan"),
  billingCycle: z.enum(["monthly", "yearly"]),
  leadAccessLimit: z.string().trim().refine((v) => v === "" || /^\d{1,6}$/.test(v), "Use a whole number, or leave empty for no limit"),
  analyticsEnabled: z.boolean(),
  rankingBoost: z.string().trim().refine((v) => /^\d{1,2}$/.test(v) && Number(v) <= 20, "Use a whole number from 0 to 20"),
  badgeId: z.string(),
  features: z.array(z.object({ text: z.string().trim().min(1, "Write the feature or remove the line").max(80, "Keep it under 80 characters") })).max(12, "Up to 12 features"),
  isActive: z.boolean(),
});
type PlanValues = z.infer<typeof planSchema>;

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: badges } = useQuery({ queryKey: ["badges"], queryFn: () => api<{ badges: Badge[] }>("/admin/badges") });
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    mode: "onTouched",
    defaultValues: {
      name: plan?.name ?? "",
      price: plan ? String(Math.round(Number(plan.price))) : "",
      billingCycle: plan?.billingCycle ?? "monthly",
      leadAccessLimit: plan?.leadAccessLimit?.toString() ?? "",
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
      name: v.name,
      price: Number(v.price),
      billingCycle: v.billingCycle,
      leadAccessLimit: v.leadAccessLimit === "" ? null : Number(v.leadAccessLimit),
      analyticsEnabled: v.analyticsEnabled,
      rankingBoost: Number(v.rankingBoost) / 100,
      badgeId: v.badgeId === "none" ? null : Number(v.badgeId),
      features: v.features.map((f) => f.text),
      isActive: v.isActive,
    };
    try {
      if (plan) await api(`/admin/plans/${plan.id}`, { method: "PATCH", json });
      else await api("/admin/plans", { method: "POST", json });
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
          <DialogDescription>Price changes apply to new purchases. Existing subscribers keep what they paid for until renewal.</DialogDescription>
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
          <Field id="plan-price" label="Price (Rs)" error={errors.price} required>
            <Input {...fieldA11y("plan-price", errors.price)} inputMode="numeric" maxLength={7} {...register("price")} />
          </Field>
          <Field id="plan-cycle" label="Billed">
            <Controller
              control={control}
              name="billingCycle"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="plan-cycle" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Every month</SelectItem>
                    <SelectItem value="yearly">Every year</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
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
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  plan: { id: number; name: string; price: number; billingCycle: string };
  provider: { id: number; businessName: string; city: string };
}

function SubscribersTab() {
  const qc = useQueryClient();
  const [f, setF] = useState({ status: "active", page: 1 });
  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions", f],
    queryFn: () => api<{ subscriptions: Sub[] } & Paged>(`/admin/subscriptions?page=${f.page}&pageSize=20${f.status ? `&status=${f.status}` : ""}`),
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
          onChange={(status) => setF({ status, page: 1 })}
          options={[
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <div className="sm:ml-auto">
          <ExportButton entity="subscriptions" filters={{ status: f.status }} />
        </div>
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>Provider</Th>
            <Th>Plan</Th>
            <Th>Started</Th>
            <Th>Ends</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={6} />}
          {data?.subscriptions.length === 0 && <EmptyRow cols={6} text="No subscriptions match." />}
          {data?.subscriptions.map((s) => (
            <tr key={s.id}>
              <Td>
                <Link to={`/providers/${s.provider.id}`} className="font-medium hover:text-primary">
                  {s.provider.businessName}
                </Link>
                <div className="text-xs text-muted-foreground">{s.provider.city}</div>
              </Td>
              <Td>
                {s.plan.name} <span className="text-muted-foreground">{formatPrice(s.plan.price)}</span>
              </Td>
              <Td className="whitespace-nowrap">{formatDate(s.startDate)}</Td>
              <Td className="whitespace-nowrap">{s.endDate ? formatDate(s.endDate) : "No end"}</Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
              <Td className="text-right">
                {s.status === "active" && (
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={cancel.isPending} onClick={() => confirm(`Cancel ${s.provider.businessName}'s ${s.plan.name} plan now?`) && cancel.mutate(s.id)}>
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
  amount: number;
  status: string;
  gatewayTxnId: string | null;
  note: string | null;
  createdAt: string;
  provider: { id: number; businessName: string };
}

const TXN_TYPES: Record<string, string> = { subscription: "Plan", lead_fee: "Lead fee", sponsored_ad: "Promotion" };

function PaymentsTab() {
  const qc = useQueryClient();
  const [f, setF] = useState({ status: "", type: "", page: 1 });
  const [recording, setRecording] = useState(false);
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
  const qs = new URLSearchParams({ page: String(f.page), pageSize: "20", ...(f.status ? { status: f.status } : {}), ...(f.type ? { type: f.type } : {}) });
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
        <div className="flex gap-2 sm:ml-auto">
          <ExportButton entity="transactions" filters={{ status: f.status, type: f.type }} />
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
          description={`${formatPrice(reversing.txn.amount)} from ${reversing.txn.provider.businessName} stops counting as revenue. Return the money outside DialNFind first; this only records it.`}
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
            <Th>Reference</Th>
            <Th>Status</Th>
            <Th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={7} />}
          {data?.transactions.length === 0 && <EmptyRow cols={7} text="No payments match." />}
          {data?.transactions.map((t) => (
            <tr key={t.id}>
              <Td className="whitespace-nowrap">{formatDate(t.createdAt)}</Td>
              <Td>
                <Link to={`/providers/${t.provider.id}`} className="font-medium hover:text-primary">
                  {t.provider.businessName}
                </Link>
              </Td>
              <Td>{TXN_TYPES[t.type] ?? t.type}</Td>
              <Td className="font-semibold tabular-nums">{formatPrice(t.amount)}</Td>
              <Td className="font-mono text-xs text-muted-foreground">{t.gatewayTxnId ?? "None"}</Td>
              <Td>
                <StatusBadge status={t.status} />
                {t.note && <div className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={t.note}>{t.note}</div>}
              </Td>
              <Td>
                {t.status === "success" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for payment from ${t.provider.businessName}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setReversing({ txn: t, status: "refunded" })}>Mark refunded</DropdownMenuItem>
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
