import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Megaphone, MousePointerClick, Pause, Play, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { EmptyState, PageSkeleton } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldA11y } from "@/components/form";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Campaign {
  id: number;
  status: "active" | "paused" | "completed";
  startDate: string;
  endDate: string;
  budget: number;
  amountSpent: number;
  impressions: number;
  clicks: number;
  ctrPct: number | null;
  targetLocation: string | null;
  category: { id: number; name: string };
}

interface PromoteResponse {
  listings: Campaign[];
  categories: { id: number; name: string }[];
  pricing: { costPerClick: number; minBudget: number; city: string };
}

const DURATIONS = [7, 14, 30] as const;

export function PromotePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["sponsored"], queryFn: () => api<PromoteResponse>("/provider/sponsored") });
  const [categoryId, setCategoryId] = useState<string>("");
  const [days, setDays] = useState<(typeof DURATIONS)[number]>(14);
  const [budget, setBudget] = useState("1500");
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api<{ simulated: boolean }>("/provider/sponsored", { method: "POST", json: { categoryId: Number(categoryId || data!.categories[0].id), days, budget: Number(budget) } }),
    onSuccess: (r) => {
      toast.success(r.simulated ? "Campaign started. Payment was simulated because no gateway is connected yet." : "Campaign started");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: (c: Campaign) => api(`/provider/sponsored/${c.id}`, { method: "PATCH", json: { status: c.status === "active" ? "paused" : "active" } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["sponsored"] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !data) return <PageSkeleton />;
  const { pricing } = data;
  const estClicks = Math.floor(Number(budget || 0) / pricing.costPerClick);
  const budgetProblem = (): string | null => {
    if (budget.trim() === "") return "Enter a budget";
    if (!/^\d+$/.test(budget.trim())) return "Use whole rupees";
    const n = Number(budget);
    if (n < pricing.minBudget) return `The minimum budget is ${formatPrice(pricing.minBudget)}`;
    if (n > 1_000_000) return "Keep the budget under Rs 10,00,000";
    return null;
  };

  return (
    <>
      <PageHeader title="Promote your business" description={`Appear with a Sponsored label when customers in ${pricing.city} search your category. You pay only when a customer calls or messages you.`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {data.listings.length === 0 ? (
            <EmptyState icon={Megaphone} title="No campaigns yet" text="Start a campaign to reach more customers searching for your services." />
          ) : (
            data.listings.map((c) => {
              const ended = c.status === "completed" || new Date(c.endDate) < new Date(new Date().toDateString());
              return (
                <Panel key={c.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{c.category.name}</h3>
                        <Badge variant="secondary" className={cn(!ended && c.status === "active" && "bg-success/10 text-success")}>
                          {ended ? "Ended" : c.status === "active" ? "Running" : "Paused"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(c.startDate)} to {formatDate(c.endDate)}
                        {c.targetLocation && ` · ${c.targetLocation}`}
                      </p>
                    </div>
                    {!ended && (
                      <Button variant="outline" size="sm" onClick={() => toggle.mutate(c)} disabled={toggle.isPending}>
                        {c.status === "active" ? <Pause /> : <Play />} {c.status === "active" ? "Pause" : "Resume"}
                      </Button>
                    )}
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <Stat icon={Eye} label="Shown in search" value={c.impressions.toLocaleString("en-IN")} />
                    <Stat icon={MousePointerClick} label="Contacts" value={c.clicks.toLocaleString("en-IN")} hint={c.ctrPct !== null ? `${c.ctrPct}% of views` : undefined} />
                    <Stat icon={Wallet} label="Spent" value={formatPrice(c.amountSpent)} hint={`of ${formatPrice(c.budget)}`} />
                  </div>
                  <Progress value={(c.amountSpent / Math.max(1, c.budget)) * 100} className="mt-4 h-1.5" />
                </Panel>
              );
            })
          )}
        </div>

        <Panel title="Start a campaign" className="h-fit">
          {data.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add a service first. You can promote any category you offer.</p>
          ) : (
            <form
              className="space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const problem = budgetProblem();
                setBudgetError(problem);
                if (!problem) create.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId || String(data.categories[0].id)} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={cn("cursor-pointer rounded-lg border py-2 text-sm font-medium transition-colors", days === d ? "border-primary bg-accent text-primary" : "hover:bg-muted")}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>
              <Field
                id="budget"
                label="Budget (Rs)"
                required
                error={budgetError ?? undefined}
                hint={`Minimum ${formatPrice(pricing.minBudget)}. At ${formatPrice(pricing.costPerClick)} per contact, that is up to ${estClicks.toLocaleString("en-IN")} customer contacts.`}
              >
                <Input
                  {...fieldA11y("budget", budgetError ?? undefined, true)}
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value.replace(/\D/g, "").slice(0, 7));
                    setBudgetError(null);
                  }}
                  onBlur={() => setBudgetError(budgetProblem())}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />} Pay {formatPrice(Number(budget) || 0)} and start
              </Button>
            </form>
          )}
        </Panel>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
