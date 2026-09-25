import { Fragment, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, Download, FileText, Loader2, RefreshCw, Repeat, TrendingDown, TrendingUp, Webhook } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice, formatRelative } from "@/lib/format";
import { GATEWAY_LABEL, SOURCE_LABEL, type Invoice, type Paged, type PaymentGateway, type SubscriptionSource } from "@/lib/types";
import { Pager, PageSkeleton } from "@/components/common";
import { ConfirmDialog, EmptyRow, FilterSelect, SearchInput, StatCard, StatusBadge, Table, TableSkeleton, Td, Th, Toolbar } from "@/components/admin-ui";
import { BarList } from "@/components/charts";
import { ExportButton } from "@/components/bulk";
import { Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BillingOverview {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  paidSubscriptions: number;
  byPlan: { label: string; value: number }[];
  bySource: { label: string; value: number }[];
  pastDue: number;
  pendingCheckouts: number;
  new30: number;
  churned30: number;
  revenue30: { gateway: PaymentGateway; amount: number; count: number }[];
  failedWebhooks7d: number;
  gateways: { razorpay: boolean; revenuecat: boolean };
}

/** MRR, subscribers by plan and by where they pay, and anything that needs attention. */
export function BillingOverviewTab() {
  const { data } = useQuery({ queryKey: ["billing-overview"], queryFn: () => api<BillingOverview>("/admin/billing/overview") });
  if (!data) return <PageSkeleton />;
  const revenue30 = data.revenue30.reduce((a, r) => a + r.amount, 0);
  return (
    <div className="space-y-6">
      {(!data.gateways.razorpay || !data.gateways.revenuecat) && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <div className="font-semibold">Payments are not fully set up</div>
            <p className="text-muted-foreground">
              {!data.gateways.razorpay && "Razorpay keys are missing, so providers cannot pay on the web. "}
              {!data.gateways.revenuecat && "The RevenueCat secret key is missing, so app store purchases cannot be confirmed. "}
              Add them to the server environment (see server/.env.example).
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly recurring revenue" value={formatPrice(data.mrr)} hint={`${formatPrice(data.arr)} a year`} icon={Repeat} tone="success" />
        <StatCard label="Paying subscribers" value={data.paidSubscriptions} hint={`${data.activeSubscriptions - data.paidSubscriptions} on team grants`} icon={CreditCard} to="/plans?tab=subscribers" />
        <StatCard label="New in 30 days" value={data.new30} hint={`${data.churned30} ended or cancelled`} icon={data.new30 >= data.churned30 ? TrendingUp : TrendingDown} />
        <StatCard
          label="Needs attention"
          value={data.pastDue + data.failedWebhooks7d}
          hint={`${data.pastDue} failed renewals · ${data.failedWebhooks7d} failed webhooks`}
          icon={AlertTriangle}
          tone={data.pastDue + data.failedWebhooks7d ? "warning" : "default"}
          to={data.failedWebhooks7d ? "/plans?tab=webhooks" : "/plans?tab=subscribers"}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Subscribers by plan">
          <BarList items={data.byPlan} />
        </Panel>
        <Panel title="Where they pay">
          <BarList items={data.bySource.map((s) => ({ label: SOURCE_LABEL[s.label as SubscriptionSource] ?? s.label, value: s.value }))} />
        </Panel>
        <Panel title="Collected in 30 days" description={formatPrice(revenue30)}>
          <BarList
            items={data.revenue30.map((r) => ({ label: `${GATEWAY_LABEL[r.gateway]} (${r.count})`, value: r.amount }))}
            format={(v) => formatPrice(v)}
          />
          <p className="mt-4 text-xs text-muted-foreground">Store amounts are what the customer paid, before Apple or Google fees, in their currency.</p>
        </Panel>
      </div>
      {data.pendingCheckouts > 0 && <p className="text-sm text-muted-foreground">{data.pendingCheckouts} web checkouts were started but not paid yet. They close after a day.</p>}
    </div>
  );
}

// Invoices ----------------------------------------------------------------------------------------

type AdminInvoice = Invoice & { provider: { id: number; businessName: string }; billedTo: { name: string; gstin: string | null }; placeOfSupply: string | null };

export function InvoicesTab() {
  const qc = useQueryClient();
  const [f, setF] = useState({ q: "", status: "", from: "", to: "", page: 1 });
  const [voiding, setVoiding] = useState<AdminInvoice | null>(null);
  const [reason, setReason] = useState("");
  const qs = new URLSearchParams(Object.entries({ ...f, page: String(f.page), pageSize: "20" }).filter(([, v]) => v));
  const { data, isLoading } = useQuery({
    queryKey: ["invoices", qs.toString()],
    queryFn: () => api<{ invoices: AdminInvoice[]; totals: { total: number; taxable: number; tax: number } } & Paged>(`/admin/invoices?${qs}`),
  });
  const voidInvoice = useMutation({
    mutationFn: () => api(`/admin/invoices/${voiding!.id}/void`, { method: "POST", json: { note: reason.trim() } }),
    onSuccess: () => {
      toast.success(`Invoice ${voiding!.number} voided`);
      setVoiding(null);
      setReason("");
      void qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      {data && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Invoiced (matching filters)" value={formatPrice(data.totals.total)} tone="success" />
          <StatCard label="Taxable value" value={formatPrice(data.totals.taxable)} />
          <StatCard label="GST collected" value={formatPrice(data.totals.tax)} hint="CGST + SGST + IGST, excluding void invoices" />
        </div>
      )}
      <Toolbar>
        <SearchInput value={f.q} onChange={(q) => setF({ ...f, q, page: 1 })} placeholder="Invoice number or business" />
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={f.status}
          onChange={(status) => setF({ ...f, status, page: 1 })}
          options={[
            { value: "issued", label: "Issued" },
            { value: "void", label: "Void" },
          ]}
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="inv-from" className="sr-only">
            From
          </Label>
          <Input id="inv-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} className="w-40" />
          <span className="text-sm text-muted-foreground">to</span>
          <Label htmlFor="inv-to" className="sr-only">
            To
          </Label>
          <Input id="inv-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} className="w-40" />
        </div>
        <div className="sm:ml-auto">
          <ExportButton entity="invoices" filters={{ q: f.q, status: f.status, from: f.from, to: f.to }} />
        </div>
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>Invoice</Th>
            <Th>Date</Th>
            <Th>Billed to</Th>
            <Th>Place of supply</Th>
            <Th>Taxable</Th>
            <Th>GST</Th>
            <Th>Total</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={9} />}
          {data?.invoices.length === 0 && <EmptyRow cols={9} text="No invoices match." />}
          {data?.invoices.map((i) => (
            <tr key={i.id}>
              <Td className="whitespace-nowrap font-mono text-xs">{i.number}</Td>
              <Td className="whitespace-nowrap">{formatDate(i.issuedAt)}</Td>
              <Td>
                <Link to={`/providers/${i.provider.id}`} className="font-medium hover:text-primary">
                  {i.billedTo.name}
                </Link>
                <div className="font-mono text-xs text-muted-foreground">{i.billedTo.gstin ?? "Unregistered"}</div>
              </Td>
              <Td>{i.placeOfSupply ?? "-"}</Td>
              <Td className="tabular-nums">{formatPrice(i.taxable)}</Td>
              <Td className="tabular-nums">{formatPrice(i.tax)}</Td>
              <Td className="font-semibold tabular-nums">{formatPrice(i.total)}</Td>
              <Td>
                <StatusBadge status={i.status} />
              </Td>
              <Td className="whitespace-nowrap text-right">
                <Button asChild variant="ghost" size="sm">
                  <a href={i.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download /> PDF
                  </a>
                </Button>
                {i.status === "issued" && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setVoiding(i)}>
                    Void
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(page) => setF({ ...f, page })} />}
      {voiding && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && (setVoiding(null), setReason(""))}
          title={`Void invoice ${voiding.number}?`}
          description="The invoice stays on record marked void and its number is not reused. Refund the payment separately if money should go back."
          confirmLabel="Void invoice"
          destructive
          busy={voidInvoice.isPending || reason.trim().length < 3}
          onConfirm={() => voidInvoice.mutate()}
        >
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea id="void-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}

// Webhooks ----------------------------------------------------------------------------------------

interface WebhookEvent {
  id: number;
  source: "razorpay" | "revenuecat";
  eventId: string;
  type: string;
  processedAt: string | null;
  error: string | null;
  createdAt: string;
  provider: { id: number; businessName: string } | null;
  payload: unknown;
}

/** Every Razorpay and RevenueCat event received, so a missed or failed payment update can be found and replayed. */
export function WebhooksTab() {
  const qc = useQueryClient();
  const [f, setF] = useState({ source: "", status: "", page: 1 });
  const [open, setOpen] = useState<number | null>(null);
  const qs = new URLSearchParams(Object.entries({ ...f, page: String(f.page), pageSize: "25" }).filter(([, v]) => v));
  const { data, isLoading } = useQuery({ queryKey: ["webhooks", qs.toString()], queryFn: () => api<{ events: WebhookEvent[] } & Paged>(`/admin/webhooks?${qs}`) });
  const reprocess = useMutation({
    mutationFn: (id: number) => api(`/admin/webhooks/${id}/reprocess`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Event processed");
      void qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <Toolbar>
        <FilterSelect
          label="Source"
          allLabel="Razorpay and RevenueCat"
          value={f.source}
          onChange={(source) => setF({ ...f, source, page: 1 })}
          options={[
            { value: "razorpay", label: "Razorpay" },
            { value: "revenuecat", label: "RevenueCat" },
          ]}
        />
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={f.status}
          onChange={(status) => setF({ ...f, status, page: 1 })}
          options={[
            { value: "processed", label: "Processed" },
            { value: "failed", label: "Failed" },
          ]}
        />
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>Received</Th>
            <Th>Source</Th>
            <Th>Event</Th>
            <Th>Provider</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={6} />}
          {data?.events.length === 0 && <EmptyRow cols={6} text="No webhook events yet. They appear here once Razorpay or RevenueCat start sending them." />}
          {data?.events.map((e) => (
            <Fragment key={e.id}>
              <tr>
                <Td className="whitespace-nowrap">
                  <span title={new Date(e.createdAt).toLocaleString("en-IN")}>{formatRelative(e.createdAt)}</span>
                </Td>
                <Td>{e.source === "razorpay" ? "Razorpay" : "RevenueCat"}</Td>
                <Td>
                  <button type="button" className="cursor-pointer font-mono text-xs hover:text-primary" onClick={() => setOpen(open === e.id ? null : e.id)}>
                    {e.type}
                  </button>
                </Td>
                <Td>
                  {e.provider ? (
                    <Link to={`/providers/${e.provider.id}`} className="hover:text-primary">
                      {e.provider.businessName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </Td>
                <Td>
                  <StatusBadge status={e.processedAt ? "processed" : "failed"} />
                  {e.error && <div className="mt-1 max-w-64 truncate text-xs text-destructive" title={e.error}>{e.error}</div>}
                </Td>
                <Td className="text-right">
                  {!e.processedAt && (
                    <Button variant="ghost" size="sm" disabled={reprocess.isPending} onClick={() => reprocess.mutate(e.id)}>
                      {reprocess.isPending && reprocess.variables === e.id ? <Loader2 className="animate-spin" /> : <RefreshCw />} Retry
                    </Button>
                  )}
                </Td>
              </tr>
              {open === e.id && (
                <tr>
                  <Td colSpan={6} className="bg-muted/40">
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-xs">{JSON.stringify(e.payload, null, 2)}</pre>
                  </Td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(page) => setF({ ...f, page })} />}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Webhook className="size-3.5" /> Failed events are retried by the sender for a while; Retry runs one again now.
        <FileText className="ml-2 size-3.5" /> Click an event name to see what was received.
      </p>
    </>
  );
}
