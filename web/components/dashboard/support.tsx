"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Loader2, Paperclip, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { clientApi, ClientApiError } from "@/lib/client";
import { checkFile, uploadFile } from "@/lib/upload";

const errorMessage = (err: unknown) => (err instanceof ClientApiError || err instanceof Error ? err.message : "Something went wrong");

const CATEGORIES = [
  { value: "account", label: "My account" },
  { value: "report", label: "Report a provider or review" },
  { value: "listing", label: "Wrong information on a listing" },
  { value: "technical", label: "Something is not working" },
  { value: "general", label: "Something else" },
];

export function Attachments({ urls, onRemove }: { urls: string[]; onRemove?: (u: string) => void }) {
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
              // eslint-disable-next-line @next/next/no-img-element
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
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" aria-label="Attach a file" onChange={(e) => attach(e.target.files?.[0])} />
      {files.length > 0 && <Attachments urls={files} onRemove={(u) => setFiles(files.filter((f) => f !== u))} />}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading || files.length >= 5} onClick={() => input.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />} Attach a file
        </Button>
        <span className="text-xs text-muted-foreground">JPG, PNG, WebP or PDF, up to 10 MB</span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const ticketSchema = z.object({
  category: z.string().min(1, "Choose what this is about"),
  subject: z.string().trim().min(5, "Write a short subject, at least 5 characters").max(120, "Keep the subject under 120 characters"),
  message: z.string().trim().min(10, "Describe the problem in at least 10 characters").max(5000, "Keep the message under 5000 characters"),
});
type TicketValues = z.infer<typeof ticketSchema>;

export function NewTicketButton({ label = "New request" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, formState } = useForm<TicketValues>({ resolver: zodResolver(ticketSchema), defaultValues: { category: "", subject: "", message: "" }, mode: "onTouched" });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const { ticket } = await clientApi<{ ticket: { id: number; reference: string } }>("/support/tickets", { method: "POST", body: JSON.stringify({ ...v, attachments: files }) });
      toast.success(`Request ${ticket.reference} sent`);
      reset();
      setFiles([]);
      setOpen(false);
      router.push(`/dashboard/support/${ticket.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>Tell us what happened and we will reply here and by notification.</DialogDescription>
        </DialogHeader>
        <form id="ticket-form" className="space-y-4" noValidate onSubmit={onSubmit}>
          <FormAlert message={error} />
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
            <Input maxLength={120} placeholder="e.g. I cannot sign in on my phone" {...fieldA11y("subject", errors.subject)} {...register("subject")} />
          </Field>
          <Field id="message" label="Details" error={errors.message} required>
            <Textarea rows={5} maxLength={5000} {...fieldA11y("message", errors.message)} {...register("message")} />
          </Field>
          <AttachmentPicker files={files} setFiles={setFiles} uploading={uploading} setUploading={setUploading} />
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="ticket-form" disabled={isSubmitting || uploading}>
            {isSubmitting && <Loader2 className="animate-spin" />} Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TicketReply({ id }: { id: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setError("Write a message first");
    setError(null);
    setSending(true);
    try {
      await clientApi(`/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body: body.trim(), attachments: files }) });
      setBody("");
      setFiles([]);
      toast.success("Message sent");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="rounded-2xl border bg-card p-4" noValidate onSubmit={submit}>
      <Label htmlFor="reply">Reply</Label>
      <Textarea id="reply" rows={4} className="mt-2" value={body} maxLength={5000} onChange={(e) => (setBody(e.target.value), setError(null))} aria-invalid={!!error || undefined} aria-describedby={error ? "reply-error" : undefined} />
      {error && (
        <p id="reply-error" role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <AttachmentPicker files={files} setFiles={setFiles} uploading={uploading} setUploading={setUploading} />
      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={sending || uploading}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />} Send
        </Button>
      </div>
    </form>
  );
}

export function CloseTicketButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await clientApi(`/support/tickets/${id}/close`, { method: "POST" });
          toast.success("Request closed");
          router.refresh();
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      Mark as solved
    </Button>
  );
}
