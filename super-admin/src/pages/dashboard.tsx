import { Link } from "react-router";
import { ArrowRight, BadgeCheck, CreditCard, KeyRound, LifeBuoy, Megaphone, MessageSquareWarning, PhoneIncoming, Star, Store, Users } from "lucide-react";
import { useAuth, type Module } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { useOverview } from "@/layouts/app-layout";
import { PageHeader, Panel } from "@/components/page-header";
import { StatCard } from "@/components/admin-ui";
import { TrendChart } from "@/components/charts";
import { PageSkeleton } from "@/components/common";

export function DashboardPage() {
  const { user, can } = useAuth();
  const { data } = useOverview();
  if (!data) return <PageSkeleton />;

  const queues: { label: string; count: number; to: string; module: Module; icon: typeof Store; text: string }[] = [
    { label: "Listings to approve", count: data.pendingProviders, to: "/providers?status=pending", module: "providers", icon: Store, text: "New businesses waiting to go live" },
    { label: "Documents to check", count: data.pendingVerifications, to: "/verifications", module: "verifications", icon: BadgeCheck, text: "Verification uploads from providers" },
    { label: "Claims to review", count: data.pendingClaims, to: "/claims", module: "providers", icon: KeyRound, text: "Owners asking to take over a listing" },
    { label: "Open reports", count: data.openFlags, to: "/reviews?tab=reports", module: "reviews", icon: MessageSquareWarning, text: "Reviews and listings flagged by users" },
    { label: "Active tickets", count: data.openTickets, to: "/support", module: "support", icon: LifeBuoy, text: "Support requests waiting on the team" },
  ];
  const visible = queues.filter((q) => can(q.module));
  const hour = new Date().getHours();

  return (
    <>
      <PageHeader title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${user?.name.split(" ")[0]}`} description="Here is what needs attention on DialNFind today." />

      {visible.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {visible.map((q) => (
            <Link key={q.label} to={q.to} className="group flex flex-col rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40">
              <div className="flex items-center justify-between">
                <q.icon className="size-5 text-primary" />
                <span className={q.count ? "rounded-full bg-warning-soft px-2 text-sm font-bold text-[oklch(0.45_0.1_60)]" : "text-sm font-semibold text-muted-foreground"}>{q.count}</span>
              </div>
              <div className="mt-3 text-sm font-semibold">{q.label}</div>
              <div className="mt-0.5 flex-1 text-xs text-muted-foreground">{q.text}</div>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary opacity-80 group-hover:opacity-100">
                Open <ArrowRight className="size-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live providers" value={data.activeProviders.toLocaleString("en-IN")} hint={`${data.providers.toLocaleString("en-IN")} listings in total`} icon={Store} to={can("providers") ? "/providers" : undefined} />
        <StatCard label="Customers" value={data.customers.toLocaleString("en-IN")} hint={`${data.users.toLocaleString("en-IN")} accounts in total`} icon={Users} to={can("users") ? "/users" : undefined} />
        <StatCard label="Leads, last 30 days" value={data.leads30.toLocaleString("en-IN")} hint="Calls and WhatsApp taps" icon={PhoneIncoming} to={can("leads") ? "/leads" : undefined} />
        <StatCard label="Reviews, last 30 days" value={data.reviews30.toLocaleString("en-IN")} icon={Star} to={can("reviews") ? "/reviews" : undefined} />
        <StatCard label="Revenue, last 30 days" value={formatPrice(data.revenue30)} icon={CreditCard} tone="success" to={can("plans") ? "/plans?tab=payments" : undefined} />
        <StatCard label="Paid subscriptions" value={data.activeSubscriptions} icon={CreditCard} to={can("plans") ? "/plans?tab=subscribers" : undefined} />
        <StatCard label="Running promotions" value={data.activeSponsored} icon={Megaphone} to={can("promotions") ? "/promotions" : undefined} />
        <StatCard label="Active tickets" value={data.openTickets} icon={LifeBuoy} tone={data.openTickets ? "warning" : "default"} to={can("support") ? "/support" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Leads" description="Calls and WhatsApp taps across all providers, last 14 days">
          <TrendChart id="leads" data={data.leadSeries} />
        </Panel>
        <Panel title="New accounts" description="Customer and provider sign-ups, last 14 days">
          <TrendChart id="signups" data={data.signupSeries} color="var(--chart-2)" />
        </Panel>
      </div>
    </>
  );
}
