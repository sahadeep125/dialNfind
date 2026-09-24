import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { StatCard } from "@/components/admin-ui";
import { BarList, TrendChart } from "@/components/charts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Series = { date: string; value: number }[];
interface Analytics {
  days: number;
  totals: { signups: number; providers: number; leads: number; reviews: number; tickets: number; revenue: number };
  series: { signups: Series; providers: Series; leads: Series; reviews: Series; tickets: Series; revenue: Series };
  leadsByChannel: { channel: string; count: number }[];
  topCategories: { name: string; count: number }[];
  topCities: { city: string; count: number }[];
  topProviders: { id: number; businessName: string; city: string; leads: number }[];
}
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

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Growth, demand and revenue across the marketplace."
        actions={
          <Tabs value={days} onValueChange={setDays}>
            <TabsList>
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
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="New accounts" value={data.totals.signups.toLocaleString("en-IN")} />
            <StatCard label="New listings" value={data.totals.providers.toLocaleString("en-IN")} />
            <StatCard label="Leads" value={data.totals.leads.toLocaleString("en-IN")} />
            <StatCard label="Reviews" value={data.totals.reviews.toLocaleString("en-IN")} />
            <StatCard label="Tickets" value={data.totals.tickets.toLocaleString("en-IN")} />
            <StatCard label="Revenue" value={formatPrice(data.totals.revenue)} tone="success" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Leads" description="Customer calls and WhatsApp taps">
              <TrendChart id="a-leads" data={data.series.leads} />
            </Panel>
            <Panel title="Revenue" description="Successful payments from plans and promotions">
              <TrendChart id="a-rev" data={data.series.revenue} color="var(--chart-4)" format={(v) => formatPrice(v)} />
            </Panel>
            <Panel title="New accounts">
              <TrendChart id="a-signups" data={data.series.signups} color="var(--chart-2)" />
            </Panel>
            <Panel title="Reviews">
              <TrendChart id="a-reviews" data={data.series.reviews} color="var(--chart-3)" />
            </Panel>
          </div>
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
    </>
  );
}
