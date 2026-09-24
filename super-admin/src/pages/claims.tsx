import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, KeyRound, Phone } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState, PageSkeleton } from "@/components/common";
import { ConfirmDialog, StatusBadge } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Claim {
  id: number;
  method: "phone_otp" | "document";
  status: "pending" | "approved" | "rejected";
  documentUrl: string | null;
  createdAt: string;
  reviewedAt: string | null;
  provider: { id: number; businessName: string; city: string };
  user: { id: number; name: string; email: string };
}

export function ClaimsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [confirm, setConfirm] = useState<{ claim: Claim; decision: "approved" | "rejected" } | null>(null);
  const { data } = useQuery({ queryKey: ["claims", status], queryFn: () => api<{ claims: Claim[] }>(`/admin/claims?status=${status}`) });
  const decide = useMutation({
    mutationFn: ({ claim, decision }: { claim: Claim; decision: string }) => api(`/admin/claims/${claim.id}`, { method: "PATCH", json: { decision } }),
    onSuccess: (_r, v) => {
      toast.success(v.decision === "approved" ? "Claim approved. The listing now has an owner." : "Claim rejected");
      setConfirm(null);
      void qc.invalidateQueries({ queryKey: ["claims"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Listing claims" description="Business owners asking to take over a listing we added. Phone claims verify themselves; document claims need a person to check them." />
      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Waiting</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>
      {!data ? (
        <PageSkeleton />
      ) : data.claims.length === 0 ? (
        <EmptyState icon={KeyRound} title={status === "pending" ? "No claims waiting" : "Nothing here yet"} text="Claims made from the provider app appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.claims.map((c) => (
            <div key={c.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/providers/${c.provider.id}`} className="font-semibold hover:text-primary">
                    {c.provider.businessName}
                  </Link>
                  <div className="text-sm text-muted-foreground">{c.provider.city}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
                <div className="font-medium">{c.user.name}</div>
                <div className="text-muted-foreground">{c.user.email}</div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {c.method === "phone_otp" ? <Phone className="size-3.5" /> : <FileText className="size-3.5" />}
                  {c.method === "phone_otp" ? "Phone code" : "Ownership document"}, {formatRelative(c.createdAt)}
                </div>
              </div>
              {c.documentUrl && (
                <a href={c.documentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <FileText className="size-4" /> Open document
                </a>
              )}
              {c.status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => setConfirm({ claim: c, decision: "approved" })}>
                    Approve
                  </Button>
                  <Button variant="outline" className="flex-1 text-destructive" onClick={() => setConfirm({ claim: c, decision: "rejected" })}>
                    Reject
                  </Button>
                </div>
              ) : (
                c.reviewedAt && <div className="mt-4 text-xs text-muted-foreground">Decided {formatDate(c.reviewedAt)}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm.decision === "approved" ? `Give ${confirm.claim.provider.businessName} to ${confirm.claim.user.name}?` : "Reject this claim?"}
          description={
            confirm.decision === "approved"
              ? "They will manage the listing, its leads and reviews from the provider app. Check the document matches the business name first."
              : "The person is told their claim was not approved and can contact support."
          }
          confirmLabel={confirm.decision === "approved" ? "Approve claim" : "Reject claim"}
          destructive={confirm.decision === "rejected"}
          busy={decide.isPending}
          onConfirm={() => decide.mutate(confirm)}
        />
      )}
    </>
  );
}
