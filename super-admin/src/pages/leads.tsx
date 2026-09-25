import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Paged } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Pager } from "@/components/common";
import { ConfirmDialog, EmptyRow, FilterSelect, humanize, StatusBadge, Table, TableSkeleton, Td, Th, Toolbar, useUrlState } from "@/components/admin-ui";
import { ExportButton } from "@/components/bulk";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  disputeStatus: "none" | "open" | "accepted" | "rejected";
  disputeReason: string | null;
  disputedAt: string | null;
  sponsoredCharge: number | null;
}

const DISPUTE_LABEL = { open: "Reported", accepted: "Report accepted", rejected: "Report rejected" } as const;

export function LeadsPage() {
  const qc = useQueryClient();
  const [f, setF] = useUrlState({ tab: "all", channel: "", days: "30", providerId: "", providerName: "", page: "1" });
  const disputes = f.tab === "disputes";
  const filters = disputes ? { dispute: "open", page: f.page } : { channel: f.channel, days: f.days, providerId: f.providerId, page: f.page };
  const params = new URLSearchParams({ pageSize: "25", ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery({ queryKey: ["admin-leads", params.toString()], queryFn: () => api<{ leads: LeadRow[]; openDisputes: number } & Paged>(`/admin/leads?${params}`) });
  const [deciding, setDeciding] = useState<{ lead: LeadRow; decision: "accepted" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: () => api<{ refund: number }>(`/admin/leads/${deciding!.lead.id}/dispute`, { method: "PATCH", json: { decision: deciding!.decision, note: note.trim() || undefined } }),
    onSuccess: ({ refund }) => {
      toast.success(deciding!.decision === "accepted" ? `Report accepted${refund ? `, Rs ${refund} refunded to the promotion` : ""}` : "Report rejected");
      setDeciding(null);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every call and WhatsApp tap customers made to a provider. Guests are counted too."
        actions={!disputes && <ExportButton entity="leads" filters={{ channel: f.channel, days: f.days, providerId: f.providerId }} />}
      />
      <Tabs value={f.tab} onValueChange={(tab) => setF({ tab, page: "1" })} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All leads</TabsTrigger>
          <TabsTrigger value="disputes">Reported by providers{data?.openDisputes ? ` (${data.openDisputes})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>
      {disputes ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Providers can report a contact as spam, fake or a wrong number within 30 days. Accepting a report takes the contact out of their numbers and refunds any promotion charge.
          </p>
          <Table>
            <thead>
              <tr>
                <Th>Contact</Th>
                <Th>Provider</Th>
                <Th>Customer</Th>
                <Th>Provider says</Th>
                <Th className="w-48" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton cols={5} />}
              {data?.leads.length === 0 && <EmptyRow cols={5} text="No reports waiting." />}
              {data?.leads.map((l) => (
                <tr key={l.id} className="align-top hover:bg-muted/40">
                  <Td className="whitespace-nowrap">
                    {l.channel === "call" ? "Call" : "WhatsApp"}
                    <div className="text-xs text-muted-foreground">{formatDate(l.createdAt)}</div>
                    {l.sponsoredCharge ? <div className="text-xs text-muted-foreground">Promotion charge Rs {l.sponsoredCharge}</div> : null}
                  </Td>
                  <Td>
                    <Link to={`/providers/${l.provider.id}`} className="font-medium hover:text-primary">
                      {l.provider.businessName}
                    </Link>
                  </Td>
                  <Td>{l.user ? <Link to={`/users/${l.user.id}`} className="hover:text-primary">{l.user.name}</Link> : <span className="text-muted-foreground">Guest</span>}</Td>
                  <Td className="max-w-sm whitespace-pre-line text-sm">{l.disputeReason}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setDeciding({ lead: l, decision: "accepted" })}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeciding({ lead: l, decision: "rejected" })}>
                        Reject
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => setF({ page: String(p) })} />}
          {deciding && (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && (setDeciding(null), setNote(""))}
              title={deciding.decision === "accepted" ? "Accept this report?" : "Reject this report?"}
              description={
                deciding.decision === "accepted"
                  ? `The contact stops counting for ${deciding.lead.provider.businessName}${deciding.lead.sponsoredCharge ? ` and Rs ${deciding.lead.sponsoredCharge} goes back to their promotion` : ""}.`
                  : "The contact keeps counting. The provider is told the report was not accepted."
              }
              confirmLabel={deciding.decision === "accepted" ? "Accept report" : "Reject report"}
              busy={decide.isPending}
              onConfirm={() => decide.mutate()}
            >
              <div className="space-y-2">
                <Label htmlFor="dispute-note">Note to the provider {deciding.decision === "accepted" && <span className="font-normal text-muted-foreground">(optional)</span>}</Label>
                <Textarea id="dispute-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </ConfirmDialog>
          )}
        </>
      ) : (
        <>
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
              <Td>
                {l.user ? (
                  <Link to={`/users/${l.user.id}`} className="block max-w-44 truncate hover:text-primary">
                    {l.user.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Guest</span>
                )}
              </Td>
              <Td className="text-muted-foreground">{l.subcategory?.name ?? l.category?.name ?? "Not recorded"}</Td>
              <Td className="text-muted-foreground">{humanize(l.source)}</Td>
              <Td className="text-muted-foreground">
                {l.customerReportedResponse === null ? "Not asked" : l.customerReportedResponse ? "Yes" : "No"}
                {l.disputeStatus !== "none" && (
                  <div className="mt-1">
                    <StatusBadge status={l.disputeStatus === "open" ? "pending" : l.disputeStatus} label={DISPUTE_LABEL[l.disputeStatus]} />
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => setF({ page: String(p) })} />}
        </>
      )}
    </>
  );
}
