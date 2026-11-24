import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { StatCard } from "@/components/admin-ui";
import { BarList, TrendChart } from "@/components/charts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type Series = { date: string; value: number }[];
interface Analytics {
  days: number;
  totals: { signups: number; providers: number; leads: number; reviews: number; tickets: number };
  series: { signups: Series; providers: Series; leads: Series; reviews: Series; tickets: Series };
  leadsByChannel: { channel: string; count: number }[];
  topCategories: { name: string; count: number }[];
  topCities: { city: string; count: number }[];
  topProviders: { id: number; businessName: string; city: string; leads: number }[];
}
type Metric = keyof Analytics["totals"];
interface MetricDetails {
  metric: Metric;
  days: number;
  total: number;
  previous: number;
  breakdowns: { title: string; items: { label: string; value: number }[] }[];
  recent: { id: number; title: string; subtitle: string; at: string; to: string | null }[];
}

const METRICS: { key: Metric; label: string; description: string; color?: string; recentTitle: string }[] = [
  { key: "signups", label: "New accounts", description: "People who created an account", color: "var(--chart-2)", recentTitle: "Latest accounts" },
  { key: "providers", label: "New listings", description: "Businesses added to the directory", recentTitle: "Latest listings" },
  { key: "leads", label: "Leads", description: "Customer calls and WhatsApp taps", recentTitle: "Latest leads" },
  { key: "reviews", label: "Reviews", description: "Ratings customers left", color: "var(--chart-3)", recentTitle: "Latest reviews" },
  { key: "tickets", label: "Tickets", description: "Support requests opened", color: "var(--chart-5)", recentTitle: "Latest tickets" },
];

const RANGE_LABEL: Record<string, string> = { "1": "today", "7": "the last 7 days", "30": "the last 30 days", "90": "the last 90 days" };
const PREVIOUS_LABEL: Record<string, string> = { "1": "yesterday", "7": "the 7 days before", "30": "the 30 days before", "90": "the 90 days before" };

interface SearchInsights {
  totalSearches: number;
  avgResults: number;
  topQueries: { query: string; count: number; avgResults: number }[];
  zeroResultQueries: { query: string; count: number }[];
}

export function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const { data } = useQuery({ queryKey: ["analytics", days], queryFn: () => api<Analytics>(`/admin/analytics?days=${days}`) });
  const { data: search } = useQuery({ queryKey: ["search-insights", days], queryFn: () => api<SearchInsights>(`/admin/search-insights?days=${days}`) });
  const [open, setOpen] = useState<Metric | null>(null);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Growth and demand across the marketplace."
        actions={
          <Tabs value={days} onValueChange={setDays}>
            <TabsList>
              <TabsTrigger value="1">Today</TabsTrigger>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      {!data ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {METRICS.map((m) => (
              <StatCard
                key={m.key}
                label={m.label}
                value={data.totals[m.key].toLocaleString("en-IN")}
                hint="View details"
                active={open === m.key}
                onClick={() => setOpen(m.key)}
              />
            ))}
          </div>
          {days !== "1" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Leads" description="Customer calls and WhatsApp taps">
                <TrendChart id="a-leads" data={data.series.leads} />
              </Panel>
              <Panel title="New listings" description="Businesses added to the directory">
                <TrendChart id="a-providers" data={data.series.providers} color="var(--chart-4)" />
              </Panel>
              <Panel title="New accounts">
                <TrendChart id="a-signups" data={data.series.signups} color="var(--chart-2)" />
              </Panel>
              <Panel title="Reviews">
                <TrendChart id="a-reviews" data={data.series.reviews} color="var(--chart-3)" />
              </Panel>
            </div>
          )}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel title="Leads by category">
              <BarList items={data.topCategories.map((c) => ({ label: c.name, value: c.count }))} />
            </Panel>
            <Panel title="Leads by city">
              <BarList items={data.topCities.map((c) => ({ label: c.city, value: c.count }))} />
            </Panel>
            <Panel title="How customers reach out">
              <BarList items={data.leadsByChannel.map((c) => ({ label: c.channel === "call" ? "Phone call" : "WhatsApp", value: c.count }))} />
            </Panel>
          </div>
          <Panel title="Most contacted providers" className="mt-6">
            <BarList items={data.topProviders.map((p) => ({ label: `${p.businessName}, ${p.city}`, value: p.leads }))} />
          </Panel>
        </>
      )}
      {search && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Top searches" description={`${search.totalSearches.toLocaleString("en-IN")} searches, ${search.avgResults.toFixed(1)} results on average`}>
            <BarList items={search.topQueries.map((q) => ({ label: q.query, value: q.count }))} />
          </Panel>
          <Panel title="Searches with no results" description="Demand you are not serving yet. Consider new categories or recruiting providers.">
            <BarList items={search.zeroResultQueries.map((q) => ({ label: q.query, value: q.count }))} />
          </Panel>
        </div>
      )}
      <MetricSheet metric={open} days={days} series={open && data ? data.series[open] : undefined} onClose={() => setOpen(null)} />
    </>
  );
}

function MetricSheet({ metric, days, series, onClose }: { metric: Metric | null; days: string; series?: Series; onClose: () => void }) {
  const meta = METRICS.find((m) => m.key === metric);
  const { data, isError } = useQuery({
    queryKey: ["analytics-details", metric, days],
    queryFn: () => api<MetricDetails>(`/admin/analytics/details?metric=${metric}&days=${days}`),
    enabled: !!metric,
  });
  const fmt = (v: number) => v.toLocaleString("en-IN");
  const change = data && data.previous > 0 ? ((data.total - data.previous) / data.previous) * 100 : null;
  const up = data ? data.total >= data.previous : true;

  return (
    <Sheet open={!!metric} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b p-5 pr-12">
          <SheetTitle className="font-display text-lg">{meta?.label}</SheetTitle>
          <SheetDescription>
            {meta?.description}, {RANGE_LABEL[days]}.
          </SheetDescription>
        </SheetHeader>
        {isError ? (
          <p className="p-5 text-sm text-muted-foreground">Could not load the details. Try again in a moment.</p>
        ) : !data || data.metric !== metric ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 p-5">
            <div>
              <div className="font-display text-3xl font-bold tracking-tight">{fmt(data.total)}</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {data.total !== data.previous && (
                  <span className={cn("inline-flex items-center font-medium", up ? "text-success" : "text-destructive")}>
                    {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    {change === null ? "New" : `${Math.abs(change).toFixed(0)}%`}
                  </span>
                )}
                <span>
                  {fmt(data.previous)} {PREVIOUS_LABEL[days]}
                </span>
              </div>
            </div>
            {series && series.length > 1 && <TrendChart id={`d-${metric}`} data={series} color={meta?.color} height={160} format={fmt} />}
            {data.breakdowns.map((b) => (
              <section key={b.title}>
                <h3 className="mb-3 text-sm font-semibold">{b.title}</h3>
                <BarList items={b.items} format={fmt} />
              </section>
            ))}
            <section>
              <h3 className="mb-2 text-sm font-semibold">{meta?.recentTitle}</h3>
              {data.recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this period.</p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {data.recent.map((r) => {
                    const row = (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{r.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-muted-foreground">{formatRelative(r.at)}</div>
                        </div>
                        {r.to && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                      </div>
                    );
                    return (
                      <li key={r.id}>
                        {r.to ? (
                          <Link to={r.to} onClick={onClose} className="block hover:bg-muted/50">
                            {row}
                          </Link>
                        ) : (
                          row
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
