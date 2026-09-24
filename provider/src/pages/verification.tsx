import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Building2, CheckCircle2, Clock, IdCard, Loader2, MapPin, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";

type VType = "business" | "location" | "id_proof";

interface Verification {
  id: number;
  type: VType;
  status: "pending" | "approved" | "rejected";
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

const TYPES: { type: VType; title: string; text: string; icon: typeof Building2 }[] = [
  { type: "business", title: "Business registration", text: "Trade licence, GST certificate, Udyam or shop and establishment registration.", icon: Building2 },
  { type: "location", title: "Business address", text: "Utility bill, rent agreement or a photo of your shop front with its signboard.", icon: MapPin },
  { type: "id_proof", title: "Owner identity", text: "Aadhaar, PAN or driving licence of the owner. Only our team sees it.", icon: IdCard },
];

const STATUS_LABEL = {
  none: { label: "Not verified", tone: "bg-muted text-muted-foreground" },
  partial: { label: "Partially verified", tone: "bg-warning/15 text-warning" },
  verified: { label: "Verified business", tone: "bg-success/10 text-success" },
};

export function VerificationPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["verifications"],
    queryFn: () => api<{ verificationStatus: keyof typeof STATUS_LABEL; verifications: Verification[] }>("/provider/verifications"),
  });

  if (isLoading || !data) return <PageSkeleton />;
  const status = STATUS_LABEL[data.verificationStatus];

  return (
    <>
      <PageHeader title="Verification" description="Verified businesses get a badge, rank higher and earn more trust from customers." />
      <Panel className="mb-6">
        <div className="flex items-center gap-4">
          <span className={cn("flex size-12 items-center justify-center rounded-2xl", status.tone)}>
            <BadgeCheck className="size-6" />
          </span>
          <div>
            <div className="text-lg font-semibold">{status.label}</div>
            <p className="text-sm text-muted-foreground">Our team reviews each document within two working days.</p>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        {TYPES.map((t) => (
          <VerificationCard key={t.type} def={t} latest={data.verifications.find((v) => v.type === t.type)} />
        ))}
      </div>
    </>
  );
}

function VerificationCard({ def, latest }: { def: (typeof TYPES)[number]; latest?: Verification }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api("/provider/verifications", { method: "POST", json: { type: def.type, documentUrl: url.trim() } }),
    onSuccess: () => {
      toast.success("Document submitted for review");
      setUrl("");
      void qc.invalidateQueries();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const canSubmit = !latest || latest.status === "rejected";
  const Icon = def.icon;

  return (
    <Panel className="flex flex-col">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold">{def.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{def.text}</p>

      {latest && (
        <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
          {latest.status === "approved" && (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <CheckCircle2 className="size-4" /> Approved {latest.verifiedAt && formatDate(latest.verifiedAt)}
            </span>
          )}
          {latest.status === "pending" && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Clock className="size-4 text-warning" /> Under review since {formatDate(latest.createdAt)}
            </span>
          )}
          {latest.status === "rejected" && (
            <>
              <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                <XCircle className="size-4" /> Not accepted
              </span>
              {latest.notes && <p className="mt-1 text-muted-foreground">{latest.notes}</p>}
            </>
          )}
        </div>
      )}

      {canSubmit && (
        <form
          className="mt-4 space-y-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!url) return setError("Upload a document before submitting");
            mutation.mutate();
          }}
        >
          <FileUpload
            id={`doc-${def.type}`}
            purpose="document"
            value={url}
            onChange={(v) => {
              setUrl(v);
              if (v) setError(null);
            }}
            invalid={!!error}
            describedBy={error ? `doc-${def.type}-error` : undefined}
            onUploadingChange={setUploading}
            previewClassName="aspect-[4/3]"
          />
          {error && (
            <p id={`doc-${def.type}-error`} role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="outline" className="w-full" disabled={mutation.isPending || uploading}>
            {mutation.isPending && <Loader2 className="animate-spin" />} {latest ? "Submit again" : "Submit for review"}
          </Button>
        </form>
      )}
    </Panel>
  );
}
