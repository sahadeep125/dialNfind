import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, FileText, Headset, LifeBuoy, Loader2, Paperclip, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/format";
import { checkFile, uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Pager, PageSkeleton } from "@/components/common";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Status = "open" | "pending" | "resolved" | "closed";

interface Ticket {
  id: number;
  reference: string;
  subject: string;
  category: string;
  status: Status;
  lastActivityAt: string;
  createdAt: string;
  _count?: { messages: number };
}

interface Message {
  id: number;
  body: string;
  attachments: string[];
  fromStaff: boolean;
  createdAt: string;
  authorName: string;
}

const STATUS: Record<Status, { label: string; variant: "warning" | "secondary" | "success" | "muted" }> = {
  open: { label: "Open", variant: "warning" },
  pending: { label: "Awaiting your reply", variant: "secondary" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "muted" },
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "listing", label: "My listing" },
  { value: "account", label: "Account and sign in" },
  { value: "billing", label: "Plans and payments" },
  { value: "verification", label: "Verification" },
  { value: "report", label: "Report a customer or review" },
  { value: "technical", label: "Something is not working" },
  { value: "general", label: "Something else" },
];

export function SupportPage() {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data } = useQuery({ queryKey: ["support-tickets", page], queryFn: () => api<{ tickets: Ticket[]; page: number; totalPages: number }>(`/support/tickets?page=${page}&pageSize=15`) });

  return (
    <>
      <PageHeader
        title="Help and support"
        description="Ask the DialNFind team about your listing, payments or anything else. We usually reply within one working day."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New request
          </Button>
        }
      />
      {!data ? (
        <PageSkeleton />
      ) : data.tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No requests yet" text="When you contact support, your conversations with the team appear here.">
          <Button onClick={() => setCreating(true)}>
            <Plus /> Contact support
          </Button>
        </EmptyState>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
          {data.tickets.map((t) => (
            <li key={t.id}>
              <Link to={`/support/${t.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{t.subject}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.reference} · updated {formatRelative(t.lastActivityAt)}
                  </div>
                </div>
                <Badge variant={STATUS[t.status].variant}>{STATUS[t.status].label}</Badge>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
      {creating && <NewTicketDialog onClose={() => setCreating(false)} />}
    </>
  );
}

const ticketSchema = z.object({
  category: z.string().min(1, "Choose what this is about"),
  subject: z.string().trim().min(5, "Write a short subject, at least 5 characters").max(120, "Keep the subject under 120 characters"),
  message: z.string().trim().min(10, "Describe the problem in at least 10 characters").max(5000, "Keep the message under 5000 characters"),
});
type TicketValues = z.infer<typeof ticketSchema>;

function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState } = useForm<TicketValues>({ resolver: zodResolver(ticketSchema), defaultValues: { category: "", subject: "", message: "" }, mode: "onTouched" });
  const { errors } = formState;
  const create = useMutation({
    mutationFn: (v: TicketValues) => api<{ ticket: Ticket }>("/support/tickets", { method: "POST", json: { ...v, attachments: files } }),
    onSuccess: ({ ticket }) => {
      toast.success(`Request ${ticket.reference} sent`);
      void qc.invalidateQueries({ queryKey: ["support-tickets"] });
      navigate(`/support/${ticket.id}`);
    },
    onError: (e) => setServerError(errorMessage(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>Tell us what happened. Screenshots help us sort it out faster.</DialogDescription>
        </DialogHeader>
        <form id="ticket-form" className="space-y-4" noValidate onSubmit={handleSubmit((v) => (setServerError(null), create.mutate(v)))}>
          <FormAlert message={serverError} />
          <Field id="category" label="What is this about?" error={errors.category} required>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="category" className="w-full" aria-invalid={!!errors.category || undefined} aria-describedby={errors.category ? "category-error" : undefined}>
                    <SelectValue placeholder="Choose a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="subject" label="Subject" error={errors.subject} required>
            <Input placeholder="e.g. My phone number is showing wrong" maxLength={120} {...fieldA11y("subject", errors.subject)} {...register("subject")} />
          </Field>
          <Field id="message" label="Details" error={errors.message} required>
            <Textarea rows={5} maxLength={5000} {...fieldA11y("message", errors.message)} {...register("message")} />
          </Field>
          <AttachmentPicker files={files} setFiles={setFiles} uploading={uploading} setUploading={setUploading} />
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="ticket-form" disabled={create.isPending || uploading}>
            {create.isPending && <Loader2 className="animate-spin" />} Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentPicker({ files, setFiles, uploading, setUploading }: { files: string[]; setFiles: (f: string[]) => void; uploading: boolean; setUploading: (u: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  async function attach(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file, "document");
    if (problem) return setError(problem);
    setError(null);
    setUploading(true);
    try {
      setFiles([...files, await uploadFile(file, "document")]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div>
      <input ref={input} id="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => attach(e.target.files?.[0])} />
      {files.length > 0 && <Attachments urls={files} onRemove={(u) => setFiles(files.filter((f) => f !== u))} />}
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading || files.length >= 5} onClick={() => input.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />} Attach a file
        </Button>
        <span className="text-xs text-muted-foreground">JPG, PNG, WebP or PDF, up to 10 MB, 5 files</span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
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

export function SupportTicketPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["support-ticket", id], queryFn: () => api<{ ticket: Ticket; messages: Message[] }>(`/support/tickets/${id}`) });
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["support-ticket", id] });
    void qc.invalidateQueries({ queryKey: ["support-tickets"] });
  };
  const reply = useMutation({
    mutationFn: () => api(`/support/tickets/${id}/messages`, { method: "POST", json: { body: body.trim(), attachments: files } }),
    onSuccess: () => {
      setBody("");
      setFiles([]);
      toast.success("Message sent");
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const close = useMutation({
    mutationFn: () => api(`/support/tickets/${id}/close`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Request closed");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!data) return <PageSkeleton />;
  const t = data.ticket;
  return (
    <>
      <Link to="/support" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All requests
      </Link>
      <PageHeader
        title={t.subject}
        description={`${t.reference} · opened ${formatDate(t.createdAt)}`}
        actions={
          <>
            <Badge variant={STATUS[t.status].variant} className="self-center">
              {STATUS[t.status].label}
            </Badge>
            {t.status !== "closed" && (
              <Button variant="outline" size="sm" disabled={close.isPending} onClick={() => close.mutate()}>
                Mark as solved
              </Button>
            )}
          </>
        }
      />
      <div className="max-w-3xl space-y-3">
        {data.messages.map((m) => (
          <div key={m.id} className={cn("rounded-2xl border p-4", m.fromStaff ? "bg-accent/60" : "bg-card")}>
            <div className="flex items-center gap-2 text-sm">
              {m.fromStaff && (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Headset className="size-3.5" />
                </span>
              )}
              <span className="font-medium">{m.fromStaff ? m.authorName : "You"}</span>
              <span className="ml-auto text-xs text-muted-foreground">{formatRelative(m.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{m.body}</p>
            {m.attachments.length > 0 && <Attachments urls={m.attachments} />}
          </div>
        ))}
        {t.status === "closed" ? (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            This request is closed. <Link to="/support" className="font-medium text-primary">Start a new one</Link> if you still need help.
          </div>
        ) : (
          <form
            className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!body.trim()) return setError("Write a message first");
              setError(null);
              reply.mutate();
            }}
          >
            <Label htmlFor="reply">Reply</Label>
            <Textarea id="reply" rows={4} className="mt-2" value={body} maxLength={5000} onChange={(e) => (setBody(e.target.value), setError(null))} aria-invalid={!!error || undefined} aria-describedby={error ? "reply-error" : undefined} />
            {error && (
              <p id="reply-error" role="alert" className="mt-2 text-xs font-medium text-destructive">
                {error}
              </p>
            )}
            <AttachmentPicker files={files} setFiles={setFiles} uploading={uploading} setUploading={setUploading} />
            <div className="mt-3 flex justify-end">
              <Button type="submit" disabled={reply.isPending || uploading}>
                {reply.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
