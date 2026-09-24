import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/format";
import { VERIFICATION_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState, PageSkeleton } from "@/components/common";
import { StatusBadge } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Verification {
  id: number;
  type: string;
  status: "pending" | "approved" | "rejected";
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
  provider: { id: number; businessName: string; city: string; verificationStatus: string };
  verifier: { name: string } | null;
}

const REASONS = ["The document is blurry or cut off", "The name does not match the business", "The document has expired", "This is not an accepted document type"];

export function VerificationsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [rejecting, setRejecting] = useState<Verification | null>(null);
  const { data } = useQuery({ queryKey: ["verifications", status], queryFn: () => api<{ verifications: Verification[] }>(`/admin/verifications?status=${status}`) });
  const decide = useMutation({
    mutationFn: ({ id, decision, notes }: { id: number; decision: "approved" | "rejected"; notes?: string }) => api(`/admin/verifications/${id}`, { method: "PATCH", json: { decision, notes } }),
    onSuccess: (_r, v) => {
      toast.success(v.decision === "approved" ? "Document approved" : "Document rejected. The provider has been told why.");
      setRejecting(null);
      void qc.invalidateQueries({ queryKey: ["verifications"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Verification" description="Check documents providers upload. Verified businesses get a badge and rank higher." />
      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">To check</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>
      {!data ? (
        <PageSkeleton />
      ) : data.verifications.length === 0 ? (
        <EmptyState icon={BadgeCheck} title={status === "pending" ? "All documents checked" : "Nothing here yet"} text="New uploads from the provider app appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.verifications.map((v) => {
            const isPdf = v.documentUrl && /\.pdf($|\?)/i.test(v.documentUrl);
            return (
              <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
                <a href={v.documentUrl ?? undefined} target="_blank" rel="noreferrer" className="flex aspect-[4/3] items-center justify-center bg-muted">
                  {v.documentUrl && !isPdf ? (
                    <img src={v.documentUrl} alt={`${VERIFICATION_LABEL[v.type]} document`} className="size-full object-contain" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="size-10 text-primary" /> {v.documentUrl ? "Open PDF" : "No document"}
                    </span>
                  )}
                </a>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold">{VERIFICATION_LABEL[v.type] ?? v.type}</div>
                      <Link to={`/providers/${v.provider.id}`} className="block truncate text-sm text-muted-foreground hover:text-primary">
                        {v.provider.businessName}, {v.provider.city}
                      </Link>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Uploaded {formatRelative(v.createdAt)}
                    {v.verifier && v.verifiedAt && `. Checked by ${v.verifier.name} on ${formatDate(v.verifiedAt)}`}
                  </div>
                  {v.notes && <p className="mt-2 rounded-lg bg-muted p-2 text-xs">{v.notes}</p>}
                  {v.status === "pending" && (
                    <div className="mt-auto flex gap-2 pt-4">
                      <Button className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate({ id: v.id, decision: "approved" })}>
                        Approve
                      </Button>
                      <Button variant="outline" className="flex-1 text-destructive" onClick={() => setRejecting(v)}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {rejecting && <RejectDialog v={rejecting} busy={decide.isPending} onClose={() => setRejecting(null)} onReject={(notes) => decide.mutate({ id: rejecting.id, decision: "rejected", notes })} />}
    </>
  );
}

function RejectDialog({ v, busy, onClose, onReject }: { v: Verification; busy: boolean; onClose: () => void; onReject: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {VERIFICATION_LABEL[v.type]?.toLowerCase()} document?</DialogTitle>
          <DialogDescription>{v.provider.businessName} will see this reason and can upload a new document.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const t = notes.trim();
            if (t.length < 5) return setError("Tell the provider why, in at least 5 characters");
            onReject(t);
          }}
        >
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setNotes(r + ".");
                  setError(null);
                }}
                className="cursor-pointer rounded-full border px-3 py-1 text-xs hover:bg-muted"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reject-notes">Reason</Label>
            <Textarea
              id="reject-notes"
              rows={3}
              maxLength={300}
              value={notes}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "reject-notes-error" : undefined}
              onChange={(e) => {
                setNotes(e.target.value);
                setError(null);
              }}
            />
            {error && (
              <p id="reject-notes-error" role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Reject document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
