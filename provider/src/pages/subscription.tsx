import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Plan {
  id: number;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  leadAccessLimit: number | null;
  analyticsEnabled: boolean;
  featuresJson: string[] | null;
}

interface SubscriptionResponse {
  current: { id: number; planId: number; startDate: string; endDate: string | null; autoRenew: boolean; plan: Plan } | null;
  plans: Plan[];
  transactions: { id: number; type: string; amount: number; status: string; gatewayTxnId: string | null; createdAt: string }[];
}

export function SubscriptionPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["subscription"], queryFn: () => api<SubscriptionResponse>("/provider/subscription") });

  const checkout = useMutation({
    mutationFn: (planId: number) => api<{ simulated: boolean }>("/provider/subscription/checkout", { method: "POST", json: { planId } }),
    onSuccess: (res) => {
      toast.success(res.simulated ? "Plan changed. Payment was simulated because no gateway is connected yet." : "Plan changed");
      void qc.invalidateQueries();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const cancel = useMutation({
    mutationFn: () => api("/provider/subscription/cancel", { method: "POST" }),
    onSuccess: () => {
      toast.success("Auto-renew turned off. Your plan stays active until the end date.");
      void qc.invalidateQueries();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading || !data) return <PageSkeleton />;
  const current = data.current;
  const popular = "Pro";

  return (
    <>
      <PageHeader title="Plan and billing" description="Every plan keeps your listing free to find. Paid plans add reach, analytics and a partner badge." />

      {current && (
        <Panel className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
                <CreditCard className="size-6" />
              </span>
              <div>
                <div className="text-lg font-semibold">{current.plan.name} plan</div>
                <p className="text-sm text-muted-foreground">
                  {current.endDate ? `${current.autoRenew ? "Renews" : "Ends"} on ${formatDate(current.endDate)}` : "No renewal needed"}
                </p>
              </div>
            </div>
            {current.endDate && current.autoRenew && (
              <Button variant="outline" onClick={() => confirm("Turn off auto-renew?") && cancel.mutate()} disabled={cancel.isPending}>
                Turn off auto-renew
              </Button>
            )}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((p) => {
          const isCurrent = current?.plan.id === p.id;
          const featured = p.name === popular;
          return (
            <div key={p.id} className={cn("relative flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]", featured && "border-primary ring-1 ring-primary")}>
              {featured && <Badge className="absolute -top-2.5 left-6">Most popular</Badge>}
              <div className="font-semibold">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price ? formatPrice(p.price) : "Free"}</span>
                {p.price > 0 && <span className="text-sm text-muted-foreground">/ {p.billingCycle === "yearly" ? "year" : "month"}</span>}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {(p.featuresJson ?? []).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant={featured ? "default" : "outline"} disabled={isCurrent || checkout.isPending} onClick={() => checkout.mutate(p.id)}>
                {checkout.isPending && checkout.variables === p.id && <Loader2 className="animate-spin" />}
                {isCurrent ? "Current plan" : current && p.price < current.plan.price ? `Switch to ${p.name}` : `Upgrade to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <Panel title="Billing history" className="mt-6">
        {data.transactions.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="size-4" /> No payments yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="py-3">{formatDate(t.createdAt)}</td>
                    <td className="py-3 capitalize">
                      {t.type.replace("_", " ")}
                      {t.status !== "success" && <span className="ml-2 text-xs text-destructive">{t.status}</span>}
                    </td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">{t.gatewayTxnId ?? "-"}</td>
                    <td className="py-3 text-right font-medium tabular-nums">{formatPrice(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
