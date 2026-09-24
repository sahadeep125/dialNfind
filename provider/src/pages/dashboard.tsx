import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Circle, Eye, MessageCircle, Phone, Star, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/format";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/page-header";

interface Dashboard {
  provider: { businessName: string; avgRating: number; totalReviews: number; profileCompletenessPct: number; verificationStatus: string; responseSignal: number | null; favorites: number; city: string; status: string };
  totals: { leads: number; calls: number; whatsapp: number; views: number; impressions: number; leadsChangePct: number | null; viewsChangePct: number | null; conversionPct: number | null; unrepliedReviews: number };
  ranking: { position: number; outOf: number };
  series: { date: string; calls: number; whatsapp: number; views: number; impressions: number }[];
  checklist: ChecklistItem[];
  recentLeads: { id: number; channel: "call" | "whatsapp"; createdAt: string; customerName: string; service: string | null }[];
  recentReviews: { id: number; rating: number; reviewText: string | null; providerReply: string | null; createdAt: string; author: string }[];
  subscription: { planName: string; endDate: string | null } | null;
}

const CHECKLIST_LINKS: Record<string, string> = {
  description: "/profile",
  logo: "/profile",
  cover: "/profile",
  services: "/services",
  hours: "/hours",
  areas: "/areas",
  portfolio: "/portfolio",
  experience: "/profile",
  whatsapp: "/profile",
  address: "/profile",
  contact: "/profile",
  verification: "/verification",
};

export function DashboardPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", days], queryFn: () => api<Dashboard>(`/provider/dashboard?days=${days}`) });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { totals, provider } = data;
  const todo = data.checklist.filter((c) => !c.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-deep">Good to see you</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is how {provider.businessName} is doing.</p>
        </div>
        <div className="inline-flex rounded-xl bg-muted p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn("h-8 cursor-pointer rounded-lg px-3 text-sm font-medium", days === d ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {provider.status === "pending" && (
        <div className="rounded-2xl border border-warning/50 bg-warning-soft p-4 text-sm">Your listing is waiting for approval. It will appear in search once our team has checked it.</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Total leads" value={totals.leads} change={totals.leadsChangePct} icon={Phone} tone="primary" hint={`${totals.calls} calls, ${totals.whatsapp} WhatsApp`} />
        <Kpi label="Profile views" value={totals.views} change={totals.viewsChangePct} icon={Eye} tone="teal" hint={`${totals.impressions.toLocaleString("en-IN")} search impressions`} />
        <Kpi label="View to lead rate" value={totals.conversionPct !== null ? `${totals.conversionPct}%` : "-"} icon={MessageCircle} tone="green" hint="Visitors who tapped Call or WhatsApp" />
        <Kpi label="Rating" value={provider.totalReviews ? provider.avgRating.toFixed(1) : "-"} icon={Star} tone="amber" hint={`${provider.totalReviews} reviews`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Panel title="Leads and profile views" description={`Last ${days} days`}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series.map((s) => ({ ...s, leads: s.calls + s.whatsapp }))} margin={{ left: -20, right: -12, top: 8 }}>
                <defs>
                  <linearGradient id="g-leads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8) + "/" + d.slice(5, 7)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis yAxisId="views" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="leads" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--chart-1)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} labelFormatter={(d) => formatDate(String(d))} />
                <Area yAxisId="views" type="monotone" dataKey="views" name="Profile views" stroke="var(--chart-2)" strokeWidth={2} fill="url(#g-views)" />
                <Area yAxisId="leads" type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#g-leads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-chart-1" /> Leads
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-chart-2" /> Profile views
            </span>
          </div>
        </Panel>

        <div className="space-y-6">
          <div className="rounded-2xl bg-brand-deep p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Trophy className="size-4 text-warning" /> Ranking in {provider.city}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold">#{data.ranking.position}</span>
              <span className="text-white/70">of {data.ranking.outOf} in your main category</span>
            </div>
            <p className="mt-3 text-xs text-white/60">Ranking uses your rating, reviews, verification, profile completeness and how often customers say you responded.</p>
          </div>
          <Panel title="Profile strength">
            <div className="flex items-center gap-3">
              <Progress value={provider.profileCompletenessPct} className="h-2.5" indicatorClassName={provider.profileCompletenessPct >= 80 ? "bg-success" : "bg-primary"} />
              <span className="text-sm font-semibold">{provider.profileCompletenessPct}%</span>
            </div>
            <ul className="mt-4 space-y-2">
              {(todo.length ? todo.slice(0, 4) : data.checklist.slice(0, 3)).map((c) => (
                <li key={c.key}>
                  <Link to={CHECKLIST_LINKS[c.key] ?? "/profile"} className="flex items-center gap-2 text-sm hover:text-primary">
                    {c.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent leads"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/leads">
                View all <ArrowRight />
              </Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {data.recentLeads.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={cn("flex size-9 items-center justify-center rounded-full", l.channel === "call" ? "bg-accent text-primary" : "bg-success-soft text-success")}>
                  {l.channel === "call" ? <Phone className="size-4" /> : <MessageCircle className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{l.customerName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {l.channel === "call" ? "Tapped Call" : "Opened WhatsApp"}
                    {l.service ? ` · ${l.service}` : ""}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{formatRelative(l.createdAt)}</span>
              </li>
            ))}
            {data.recentLeads.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No leads yet. Complete your profile to rank higher.</li>}
          </ul>
        </Panel>
        <Panel
          title="Latest reviews"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/reviews">
                {totals.unrepliedReviews > 0 && <Badge variant="warning">{totals.unrepliedReviews} need a reply</Badge>} View all <ArrowRight />
              </Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {data.recentReviews.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.author}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    <Star className="size-3.5 fill-warning text-warning" /> {r.rating}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.reviewText}</p>
                {!r.providerReply && (
                  <Link to="/reviews" className="mt-1 inline-block text-xs font-semibold text-primary">
                    Reply
                  </Link>
                )}
              </li>
            ))}
            {data.recentReviews.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No reviews yet.</li>}
          </ul>
        </Panel>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
        <div>
          <div className="font-semibold">{data.subscription ? `${data.subscription.planName} plan` : "Free plan"}</div>
          <div className="text-sm text-muted-foreground">
            {data.subscription?.endDate ? `Renews on ${formatDate(data.subscription.endDate)}` : "Upgrade for unlimited leads and profile analytics."}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/subscription">Manage plan</Link>
        </Button>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  change,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  change?: number | null;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  tone: "primary" | "teal" | "green" | "amber";
}) {
  const tones = { primary: "bg-accent text-primary", teal: "bg-[oklch(0.95_0.035_190)] text-[oklch(0.5_0.1_195)]", green: "bg-success-soft text-success", amber: "bg-warning-soft text-[oklch(0.6_0.13_70)]" };
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("hidden size-9 shrink-0 sm:flex items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-2xl sm:text-3xl font-bold text-brand-deep">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</span>
        {change !== undefined && change !== null && (
          <span className={cn("inline-flex items-center text-xs font-semibold", change >= 0 ? "text-success" : "text-destructive")}>
            {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
