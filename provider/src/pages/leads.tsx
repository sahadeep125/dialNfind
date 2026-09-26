import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleHelp, Download, Flag, Loader2, Lock, MessageCircle, Phone, PhoneIncoming, Search, StickyNote, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, download, errorMessage } from "@/lib/api";
import { formatPhone, formatRelative, telLink, whatsappLink } from "@/lib/format";
import type { Lead, LeadsResponse, LeadStatus } from "@/lib/types";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { EmptyState, PageSkeleton, Pager, Stars } from "@/components/common";
import { PlanBanner } from "@/components/plan";
import { ReportDialog } from "@/components/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DISPUTE_DAYS = 30;

const SOURCE_LABEL: Record<string, string> = { search: "Search results", profile: "Your profile", category_browse: "Category page", ai_match: "Smart match" };

const LEAD_STATUS: Record<LeadStatus, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-accent text-primary" },
  contacted: { label: "Contacted", tone: "bg-warning-soft text-foreground" },
  won: { label: "Won", tone: "bg-success/10 text-success" },
  lost: { label: "Lost", tone: "bg-muted text-muted-foreground" },
};

type Channel = "all" | "call" | "whatsapp";

export function LeadsPage() {
  const [channel, setChannel] = useState<Channel>("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [reporting, setReporting] = useState<Lead | null>(null);
  const [noting, setNoting] = useState<Lead | null>(null);
  const [exporting, setExporting] = useState(false);
  const q = useDebounced(search.trim());

  const filters = new URLSearchParams();
  if (channel !== "all") filters.set("channel", channel);
  if (status !== "all") filters.set("status", status);
  if (q) filters.set("q", q);
  if (from) filters.set("from", from);
  if (to) filters.set("to", to);
  const filterQuery = filters.toString();
  const filtered = filterQuery !== "";

  const { data, isLoading } = useQuery({
    queryKey: ["leads", filterQuery, page],
    queryFn: () => api<LeadsResponse>(`/provider/leads?page=${page}&pageSize=15${filterQuery ? `&${filterQuery}` : ""}`),
    placeholderData: keepPreviousData,
  });

  const onFilter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await download(`/provider/leads/export.csv${filterQuery ? `?${filterQuery}` : ""}`, "dialnfind-leads.csv");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every customer who tapped Call or WhatsApp on your listing. Track each one and add a private note."
        actions={
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting || data.total === 0}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export CSV
          </Button>
        }
      />
      {data.leadLimit !== null && (
        <div className="mb-4">
          <PlanBanner />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Tabs value={channel} onValueChange={(v) => onFilter(setChannel)(v as Channel)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="call">Calls</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={status} onValueChange={(v) => onFilter(setStatus)(v as LeadStatus | "all")}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => onFilter(setSearch)(e.target.value)} placeholder="Search name, service or message" aria-label="Search leads" className="pl-9" maxLength={100} />
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="leads-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input id="leads-from" type="date" value={from} max={to || undefined} onChange={(e) => onFilter(setFrom)(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="leads-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input id="leads-to" type="date" value={to} min={from || undefined} onChange={(e) => onFilter(setTo)(e.target.value)} className="w-36" />
          </div>
        </div>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setChannel("all");
              setStatus("all");
              setSearch("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {data.leads.length === 0 ? (
        filtered ? (
          <EmptyState icon={Search} title="No leads match" text="Try a different status, date range or search." />
        ) : (
          <EmptyState icon={PhoneIncoming} title="No leads yet" text="Complete your profile and add prices to appear higher in search. Leads show up here the moment a customer contacts you." />
        )
      ) : (
        <Panel className="p-0 md:p-0">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_1fr_1.1fr] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span>Customer</span>
            <span>Service</span>
            <span>Came from</span>
            <span>Outcome</span>
            <span>Follow-up</span>
          </div>
          <ul className="divide-y">
            {data.leads.map((l) => (
              <li key={l.id} className="grid gap-1.5 px-4 py-3.5 md:grid-cols-[1.4fr_1fr_0.8fr_1fr_1.1fr] md:items-center md:gap-4 md:px-6">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", l.channel === "call" ? "bg-accent text-primary" : "bg-success/10 text-success")}>
                    {l.channel === "call" ? <Phone className="size-4" /> : <MessageCircle className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    {l.locked ? (
                      <Link to="/subscription" className="flex items-center gap-1.5 truncate font-medium text-muted-foreground hover:text-primary">
                        <Lock className="size-3.5 shrink-0" /> {l.customerName}
                      </Link>
                    ) : (
                      <div className="truncate font-medium">
                        {l.customerName}
                        {l.isGuest && <span className="ml-2 text-xs font-normal text-muted-foreground">not signed in</span>}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {l.channel === "call" ? "Call" : "WhatsApp"} · {formatRelative(l.createdAt)}
                    </div>
                    {l.customerPhone && <CallBack phone={l.customerPhone} />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-12 md:contents md:pl-0">
                  <div className="text-sm">
                    {l.service ?? <span className="text-muted-foreground">General enquiry</span>}
                    {l.description && <div className="line-clamp-1 hidden text-xs text-muted-foreground md:block">{l.description}</div>}
                    {l.details.length > 0 && <div className="text-xs text-muted-foreground">{l.details.map((d) => `${d.label}: ${d.value}`).join(" · ")}</div>}
                  </div>
                  <div className="text-sm text-muted-foreground">{SOURCE_LABEL[l.source] ?? l.source}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Outcome lead={l} />
                    <DisputeState lead={l} onReport={() => setReporting(l)} />
                  </div>
                  <FollowUp lead={l} onNote={() => setNoting(l)} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
      <ReportLead lead={reporting} onClose={() => setReporting(null)} />
      <NoteDialog lead={noting} onClose={() => setNoting(null)} />
    </>
  );
}

function CallBack({ phone }: { phone: string }) {
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <a href={telLink(phone)} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted" aria-label={`Call ${formatPhone(phone)}`}>
        <Phone className="size-3" /> {formatPhone(phone)}
      </a>
      <a
        href={whatsappLink(phone)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium text-success hover:bg-muted"
        aria-label={`WhatsApp ${formatPhone(phone)}`}
      >
        <MessageCircle className="size-3" /> WhatsApp
      </a>
    </div>
  );
}

function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...json }: { id: number; status?: LeadStatus; note?: string | null }) => api(`/provider/leads/${id}`, { method: "PATCH", json }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

function FollowUp({ lead, onNote }: { lead: Lead; onNote: () => void }) {
  const update = useUpdateLead();
  if (lead.locked) return <span className="text-xs text-muted-foreground">Upgrade to track</span>;
  return (
    <div className="flex items-center gap-2">
      <Select value={lead.providerStatus} onValueChange={(v) => update.mutate({ id: lead.id, status: v as LeadStatus })} disabled={update.isPending}>
        <SelectTrigger size="sm" className={cn("h-7 w-32 border-0 text-xs font-medium", LEAD_STATUS[lead.providerStatus].tone)} aria-label={`Status for ${lead.customerName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_STATUS[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-xs", lead.providerNote ? "text-foreground" : "text-muted-foreground")} onClick={onNote} title={lead.providerNote ?? undefined}>
        <StickyNote className="size-3" /> {lead.providerNote ? "Note" : "Add note"}
      </Button>
    </div>
  );
}

function NoteDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const update = useUpdateLead();
  const [note, setNote] = useState("");
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  if (lead && loadedFor !== lead.id) {
    setLoadedFor(lead.id);
    setNote(lead.providerNote ?? "");
  }
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && (onClose(), setLoadedFor(null))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Note for {lead?.customerName}</DialogTitle>
          <DialogDescription>Only you see this. Keep track of what you agreed, a quote or when to call back.</DialogDescription>
        </DialogHeader>
        <form
          id="lead-note"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(
              { id: lead!.id, note: note.trim() || null },
              {
                onSuccess: () => {
                  toast.success(note.trim() ? "Note saved" : "Note removed");
                  onClose();
                  setLoadedFor(null);
                },
              },
            );
          }}
          className="space-y-2"
        >
          <Label htmlFor="lead-note-text">Note</Label>
          <Textarea id="lead-note-text" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Quoted Rs 1,200 for the panel. Visiting Monday 11 am." />
          <p className="text-right text-xs text-muted-foreground">{note.length} / 1,000</p>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="lead-note" disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />} Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Outcome({ lead }: { lead: Lead }) {
  if (lead.reviewRating) return <Stars rating={lead.reviewRating} />;
  if (lead.customerReportedResponse === true)
    return (
      <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
        <CheckCircle2 className="size-3" /> Responded
      </Badge>
    );
  if (lead.customerReportedResponse === false)
    return (
      <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive">
        <XCircle className="size-3" /> Missed
      </Badge>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CircleHelp className="size-3" /> Awaiting feedback
    </span>
  );
}

function DisputeState({ lead, onReport }: { lead: Lead; onReport: () => void }) {
  if (lead.disputeStatus === "open") return <Badge variant="secondary">Reported, under review</Badge>;
  if (lead.disputeStatus === "accepted") return <Badge variant="secondary">Report accepted, not counted</Badge>;
  if (lead.disputeStatus === "rejected") return <Badge variant="secondary">Report not accepted</Badge>;
  if (Date.now() - new Date(lead.createdAt).getTime() > DISPUTE_DAYS * 86_400_000) return null;
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={onReport}>
      <Flag className="size-3" /> Report
    </Button>
  );
}

/** Spam, fake or wrong-number contacts can be reported; if our team agrees, they stop counting and any promotion charge is refunded. */
function ReportLead({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const qc = useQueryClient();
  const report = useMutation({
    mutationFn: (reason: string) => api(`/provider/leads/${lead!.id}/dispute`, { method: "POST", json: { reason } }),
    onSuccess: () => {
      toast.success("Thanks. Our team will look at this contact.");
      onClose();
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
  return (
    <ReportDialog
      open={!!lead}
      title="Report this contact"
      description="For spam, fake or wrong-number contacts. If our team agrees, it no longer counts in your numbers and any promotion charge goes back to your budget."
      label="What was wrong with it?"
      sending={report.isPending}
      error={report.error ? errorMessage(report.error) : null}
      onSend={(reason) => report.mutate(reason)}
      onClose={() => (report.reset(), onClose())}
    />
  );
}
