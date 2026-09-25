import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Headset, Loader2, Lock, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRelative, initials } from "@/lib/format";
import { checkFile, uploadFile } from "@/lib/upload";
import type { Paged } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { Pager, PageSkeleton } from "@/components/common";
import { EmptyRow, Facts, FilterSelect, humanize, SearchInput, StatusBadge, Table, TableSkeleton, Td, Th, Toolbar, useUrlState } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Status = "open" | "pending" | "resolved" | "closed";
type Priority = "low" | "normal" | "high" | "urgent";

interface TicketRow {
  id: number;
  reference: string;
  subject: string;
  category: string;
  priority: Priority;
  status: Status;
  source: string;
  name: string;
  email: string;
  lastActivityAt: string;
  createdAt: string;
  assignedTo: { id: number; name: string } | null;
  provider: { id: number; businessName: string } | null;
  _count: { messages: number };
}

const STATUS_LABEL: Record<Status, string> = { open: "Open", pending: "Waiting on customer", resolved: "Resolved", closed: "Closed" };
const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];
const CATEGORIES = ["general", "account", "listing", "billing", "verification", "report", "technical"];
const SOURCES: Record<string, string> = { web: "Website", provider_app: "Provider app", contact_form: "Contact form", app: "App", email: "Email" };

export function TicketsPage() {
  const [f, setF] = useUrlState({ status: "active", priority: "", assignee: "", q: "", page: "1" });
  const params = new URLSearchParams({ pageSize: "20", page: f.page });
  for (const k of ["status", "priority", "assignee", "q"] as const) if (f[k]) params.set(k, f[k]);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", params.toString()],
    queryFn: () => api<{ tickets: TicketRow[]; counts: Partial<Record<Status, number>> } & Paged>(`/admin/tickets?${params}`),
    refetchInterval: 30_000,
    enabled: f.status !== "messages",
  });
  const c = data?.counts ?? {};
  const active = (c.open ?? 0) + (c.pending ?? 0);
  const { data: legacy } = useQuery({ queryKey: ["contact-messages"], queryFn: () => api<{ messages: ContactMessage[] }>("/admin/contact-messages") });
  const legacyOpen = legacy?.messages.filter((m) => m.status !== "closed").length ?? 0;

  return (
    <>
      <PageHeader title="Support tickets" description="Questions and problems raised by customers and providers from the apps and the contact form." />
      <Tabs value={f.status || "all"} onValueChange={(s) => setF({ status: s === "all" ? "" : s, page: "1" })}>
        <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="active">Needs attention {data && <span className="ml-1 text-muted-foreground">{active}</span>}</TabsTrigger>
          <TabsTrigger value="open">Open {data && <span className="ml-1 text-muted-foreground">{c.open ?? 0}</span>}</TabsTrigger>
          <TabsTrigger value="pending">Waiting {data && <span className="ml-1 text-muted-foreground">{c.pending ?? 0}</span>}</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          {!!legacy?.messages.length && (
            <TabsTrigger value="messages">
              Old contact messages {legacyOpen > 0 && <span className="ml-1 text-muted-foreground">{legacyOpen}</span>}
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
      {f.status === "messages" ? (
        <ContactMessages messages={legacy?.messages ?? []} />
      ) : (
        <>
      <Toolbar>
        <SearchInput value={f.q} onChange={(q) => setF({ q, page: "1" })} placeholder="Search subject, email or DNF-000123" />
        <FilterSelect label="Priority" allLabel="Any priority" value={f.priority} onChange={(priority) => setF({ priority, page: "1" })} options={PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))} />
        <FilterSelect
          label="Assignee"
          allLabel="Anyone"
          value={f.assignee}
          onChange={(assignee) => setF({ assignee, page: "1" })}
          options={[
            { value: "me", label: "Assigned to me" },
            { value: "none", label: "Unassigned" },
          ]}
        />
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>Ticket</Th>
            <Th>From</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Assignee</Th>
            <Th>Last activity</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={6} />}
          {data?.tickets.length === 0 && <EmptyRow cols={6} text="No tickets here. Nice work." />}
          {data?.tickets.map((t) => (
            <tr key={t.id} className="hover:bg-muted/40">
              <Td>
                <Link to={`/support/${t.id}`} className="block max-w-80">
                  <span className="block truncate font-medium hover:text-primary">{t.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.reference} · {humanize(t.category)} · {t._count.messages} message{t._count.messages === 1 ? "" : "s"}
                  </span>
                </Link>
              </Td>
              <Td>
                <span className="block max-w-48 truncate">{t.provider?.businessName ?? t.name}</span>
                <span className="block max-w-48 truncate text-xs text-muted-foreground">{t.email}</span>
              </Td>
              <Td>
                <StatusBadge status={t.priority} />
              </Td>
              <Td>
                <StatusBadge status={t.status} label={STATUS_LABEL[t.status]} />
              </Td>
              <Td className="text-muted-foreground">{t.assignedTo?.name ?? "Unassigned"}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatRelative(t.lastActivityAt)}</Td>
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

interface TicketDetail {
  ticket: TicketRow & {
    phone: string | null;
    user: { id: number; name: string; email: string; phone: string | null; role: string; createdAt: string } | null;
    provider: { id: number; businessName: string; slug: string; city: string; status: string } | null;
    messages: { id: number; body: string; attachments: string[]; fromStaff: boolean; isInternal: boolean; createdAt: string; author: { id: number; name: string } | null }[];
  };
  history: { id: number; reference: string; subject: string; status: Status; createdAt: string }[];
}

export function TicketDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-ticket", id], queryFn: () => api<TicketDetail>(`/admin/tickets/${id}`) });
  const { data: staff } = useQuery({ queryKey: ["ticket-assignees"], queryFn: () => api<{ assignees: { id: number; name: string }[] }>("/admin/tickets/assignees") });

  const update = useMutation({
    mutationFn: (json: Partial<{ status: Status; priority: Priority; category: string; assignedToId: number | null }>) => api(`/admin/tickets/${id}`, { method: "PATCH", json }),
    onSuccess: () => {
      toast.success("Ticket updated");
      void qc.invalidateQueries({ queryKey: ["admin-ticket", id] });
      void qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!data) return <PageSkeleton />;
  const t = data.ticket;

  return (
    <>
      <Link to="/support" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All tickets
      </Link>
      <PageHeader title={t.subject} description={`${t.reference} · opened ${formatDate(t.createdAt)} from ${SOURCES[t.source] ?? humanize(t.source)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="space-y-3">
            {t.messages.map((m) => (
              <div key={m.id} className={cn("rounded-2xl border p-4", m.isInternal ? "border-warning/40 bg-warning-soft" : m.fromStaff ? "bg-accent/60" : "bg-card")}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn("flex size-7 items-center justify-center rounded-full text-[11px] font-semibold", m.fromStaff ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {m.fromStaff ? <Headset className="size-3.5" /> : initials(m.author?.name ?? t.name)}
                  </span>
                  <span className="font-medium">{m.author?.name ?? t.name}</span>
                  {m.isInternal ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.5_0.12_60)]">
                      <Lock className="size-3" /> Internal note
                    </span>
                  ) : (
                    m.fromStaff && <span className="text-xs text-muted-foreground">Shown to the customer as DialNFind Support</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{m.body}</p>
                {m.attachments.length > 0 && <Attachments urls={m.attachments} />}
              </div>
            ))}
          </div>
          {t.status === "closed" ? (
            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              This ticket is closed. Reopen it from the panel to reply.
            </div>
          ) : (
            <Composer ticketId={t.id} status={t.status} />
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Ticket">
            <div className="space-y-3">
              <SelectRow label="Status" value={t.status} onChange={(v) => update.mutate({ status: v as Status })} options={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
              <SelectRow label="Priority" value={t.priority} onChange={(v) => update.mutate({ priority: v as Priority })} options={PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))} />
              <SelectRow label="Category" value={t.category} onChange={(v) => update.mutate({ category: v })} options={CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))} />
              <SelectRow
                label="Assignee"
                value={t.assignedTo ? String(t.assignedTo.id) : "none"}
                onChange={(v) => update.mutate({ assignedToId: v === "none" ? null : Number(v) })}
                options={[{ value: "none", label: "Unassigned" }, ...(staff?.assignees ?? (t.assignedTo ? [t.assignedTo] : [])).map((s) => ({ value: String(s.id), label: s.name }))]}
              />
            </div>
          </Panel>
          <Panel title="Requester">
            <Facts
              items={[
                ["Name", t.user?.name ?? t.name],
                ["Email", t.email],
                ["Phone", t.user?.phone ?? t.phone ?? "Not given"],
                ["Account", t.user ? `${humanize(t.user.role)} since ${formatDate(t.user.createdAt)}` : "Guest"],
              ]}
            />
            {t.provider && (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to={`/providers/${t.provider.id}`}>Open {t.provider.businessName}</Link>
              </Button>
            )}
          </Panel>
          {data.history.length > 0 && (
            <Panel title="Earlier tickets">
              <ul className="space-y-2 text-sm">
                {data.history.map((h) => (
                  <li key={h.id}>
                    <Link to={`/support/${h.id}`} className="flex items-center justify-between gap-2 hover:text-primary">
                      <span className="truncate">{h.subject}</span>
                      <StatusBadge status={h.status} label={STATUS_LABEL[h.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = `ticket-${label.toLowerCase()}`;
  return (
    <div className="grid grid-cols-[88px_1fr] items-center gap-2">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Attachments({ urls, onRemove }: { urls: string[]; onRemove?: (u: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.map((u) => (
        <span key={u} className="relative">
          <a href={u} target="_blank" rel="noreferrer" className="block">
            {/\.pdf($|\?)/i.test(u) ? (
              <span className="flex size-16 items-center justify-center rounded-lg border bg-muted">
                <FileText className="size-6 text-primary" />
              </span>
            ) : (
              <img src={u} alt="Attachment" className="size-16 rounded-lg border object-cover" />
            )}
          </a>
          {onRemove && (
            <button type="button" onClick={() => onRemove(u)} className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground text-background" aria-label="Remove attachment">
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

function Composer({ ticketId, status }: { ticketId: number; status: Status }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => setError(null), [body, mode]);

  const send = useMutation({
    mutationFn: (after?: Status) => api(`/admin/tickets/${ticketId}/messages`, { method: "POST", json: { body: body.trim(), isInternal: mode === "note", attachments: files, ...(after ? { status: after } : {}) } }),
    onSuccess: () => {
      toast.success(mode === "note" ? "Note added" : "Reply sent");
      setBody("");
      setFiles([]);
      void qc.invalidateQueries({ queryKey: ["admin-ticket", String(ticketId)] });
      void qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(after?: Status) {
    if (!body.trim()) return setError(mode === "note" ? "Write the note first" : "Write a reply first");
    if (body.trim().length > 5000) return setError("Keep the message under 5000 characters");
    send.mutate(after);
  }

  async function attach(file: File | undefined) {
    if (!file) return;
    if (files.length >= 5) return setError("You can attach up to 5 files");
    const problem = checkFile(file, "document");
    if (problem) return setError(problem);
    setUploading(true);
    try {
      const url = await uploadFile(file, "document");
      setFiles((f) => [...f, url]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]", mode === "note" && "border-warning/40")}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as "reply" | "note")}>
        <TabsList className="mb-3">
          <TabsTrigger value="reply">Reply to customer</TabsTrigger>
          <TabsTrigger value="note">Internal note</TabsTrigger>
        </TabsList>
      </Tabs>
      <Label htmlFor="ticket-body" className="sr-only">
        {mode === "note" ? "Internal note" : "Reply"}
      </Label>
      <Textarea
        id="ticket-body"
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={mode === "note" ? "Only the team sees this" : `Hi, this is ${user?.name.split(" ")[0] ?? "the team"} from DialNFind Support.`}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? "ticket-body-error" : undefined}
        maxLength={5000}
      />
      {files.length > 0 && <Attachments urls={files} onRemove={(u) => setFiles((f) => f.filter((x) => x !== u))} />}
      {error && (
        <p id="ticket-body-error" role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => attach(e.target.files?.[0])} aria-label="Attach a file" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={uploading || files.length >= 5} onClick={() => fileInput.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />} Attach
        </Button>
        <span className="text-xs text-muted-foreground">{body.length}/5000</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {mode === "reply" && status !== "resolved" && (
            <Button type="button" variant="outline" disabled={send.isPending || uploading} onClick={() => submit("resolved")}>
              Send and resolve
            </Button>
          )}
          <Button type="button" disabled={send.isPending || uploading} onClick={() => submit()}>
            {send.isPending ? <Loader2 className="animate-spin" /> : mode === "note" ? <Lock /> : <Send />} {mode === "note" ? "Add note" : "Send reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "new" | "in_progress" | "closed";
  createdAt: string;
}

/** Messages sent through the contact form before it created tickets. Move them into the help desk or close them. */
function ContactMessages({ messages }: { messages: ContactMessage[] }) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["contact-messages"] });
    void qc.invalidateQueries({ queryKey: ["admin-tickets"] });
  };
  const toTicket = useMutation({
    mutationFn: (id: number) => api<{ ticket: { id: number; reference: string } }>(`/admin/contact-messages/${id}/ticket`, { method: "POST" }),
    onSuccess: ({ ticket }) => {
      toast.success(`Moved to ticket ${ticket.reference}`);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const close = useMutation({
    mutationFn: (id: number) => api(`/admin/contact-messages/${id}`, { method: "PATCH", json: { status: "closed" } }),
    onSuccess: () => {
      toast.success("Marked as handled");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">New contact form messages become tickets automatically. These arrived before that and still need an answer or a close.</p>
      {messages.map((m) => (
        <article key={m.id} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.subject || "No subject"}</span>
                <StatusBadge status={m.status === "closed" ? "closed" : "open"} label={m.status === "closed" ? "Handled" : "Needs reply"} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {m.name} · {m.email}
                {m.phone ? ` · ${m.phone}` : ""} · {formatRelative(m.createdAt)}
              </div>
            </div>
            {m.status !== "closed" && (
              <div className="flex gap-2">
                <Button size="sm" disabled={toTicket.isPending} onClick={() => toTicket.mutate(m.id)}>
                  Move to ticket
                </Button>
                <Button size="sm" variant="outline" disabled={close.isPending} onClick={() => close.mutate(m.id)}>
                  Mark handled
                </Button>
              </div>
            )}
          </div>
          <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
        </article>
      ))}
    </div>
  );
}
