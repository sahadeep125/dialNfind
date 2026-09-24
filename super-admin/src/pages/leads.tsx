import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Paged } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Pager } from "@/components/common";
import { EmptyRow, FilterSelect, humanize, Table, TableSkeleton, Td, Th, Toolbar, useUrlState } from "@/components/admin-ui";
import { ProviderPicker } from "@/components/provider-picker";

interface LeadRow {
  id: number;
  channel: "call" | "whatsapp";
  source: string;
  description: string | null;
  customerReportedResponse: boolean | null;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
  provider: { id: number; businessName: string; city: string };
  category: { name: string } | null;
  subcategory: { name: string } | null;
}

export function LeadsPage() {
  const [f, setF] = useUrlState({ channel: "", days: "30", providerId: "", providerName: "", page: "1" });
  const params = new URLSearchParams({ pageSize: "25", page: f.page });
  if (f.channel) params.set("channel", f.channel);
  if (f.days) params.set("days", f.days);
  if (f.providerId) params.set("providerId", f.providerId);
  const { data, isLoading } = useQuery({ queryKey: ["admin-leads", params.toString()], queryFn: () => api<{ leads: LeadRow[] } & Paged>(`/admin/leads?${params}`) });

  return (
    <>
      <PageHeader title="Leads" description="Every call and WhatsApp tap customers made to a provider. Guests are counted too." />
      <Toolbar>
        <FilterSelect
          label="Period"
          allLabel="All time"
          value={f.days}
          onChange={(days) => setF({ days, page: "1" })}
          options={[
            { value: "1", label: "Today" },
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ]}
        />
        <FilterSelect
          label="Channel"
          allLabel="Calls and WhatsApp"
          value={f.channel}
          onChange={(channel) => setF({ channel, page: "1" })}
          options={[
            { value: "call", label: "Calls" },
            { value: "whatsapp", label: "WhatsApp" },
          ]}
        />
        <div className="w-full sm:w-72">
          <ProviderPicker
            id="lead-provider"
            placeholder="Filter by provider"
            value={f.providerId ? { id: Number(f.providerId), businessName: f.providerName, city: "" } : null}
            onChange={(p) => setF({ providerId: p ? String(p.id) : "", providerName: p?.businessName ?? "", page: "1" })}
          />
        </div>
        {data && <span className="text-sm text-muted-foreground sm:ml-auto">{data.total.toLocaleString("en-IN")} leads</span>}
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Channel</Th>
            <Th>Provider</Th>
            <Th>Customer</Th>
            <Th>Service</Th>
            <Th>Source</Th>
            <Th>Got a response</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={7} />}
          {data?.leads.length === 0 && <EmptyRow cols={7} text="No leads in this period." />}
          {data?.leads.map((l) => (
            <tr key={l.id} className="hover:bg-muted/40">
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(l.createdAt)}</Td>
              <Td>
                <span className="inline-flex items-center gap-1.5">
                  {l.channel === "call" ? <Phone className="size-3.5 text-primary" /> : <MessageCircle className="size-3.5 text-success" />}
                  {l.channel === "call" ? "Call" : "WhatsApp"}
                </span>
              </Td>
              <Td>
                <Link to={`/providers/${l.provider.id}`} className="font-medium hover:text-primary">
                  {l.provider.businessName}
                </Link>
                <div className="text-xs text-muted-foreground">{l.provider.city}</div>
              </Td>
              <Td>{l.user ? <span className="block max-w-44 truncate">{l.user.name}</span> : <span className="text-muted-foreground">Guest</span>}</Td>
              <Td className="text-muted-foreground">{l.subcategory?.name ?? l.category?.name ?? "Not recorded"}</Td>
              <Td className="text-muted-foreground">{humanize(l.source)}</Td>
              <Td className="text-muted-foreground">{l.customerReportedResponse === null ? "Not asked" : l.customerReportedResponse ? "Yes" : "No"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => setF({ page: String(p) })} />}
    </>
  );
}
