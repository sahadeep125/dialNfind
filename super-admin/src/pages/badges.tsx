import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Badge } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState, PageSkeleton } from "@/components/common";
import { ConfirmDialog } from "@/components/admin-ui";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BadgesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["badges"], queryFn: () => api<{ badges: Badge[] }>("/admin/badges") });
  const [edit, setEdit] = useState<Badge | "new" | null>(null);
  const [del, setDel] = useState<Badge | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => api(`/admin/badges/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Badge deleted");
      setDel(null);
      void qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Badges"
        description="Trust marks shown on provider profiles. Award them from a provider's page or attach one to a plan."
        actions={
          <Button onClick={() => setEdit("new")}>
            <Plus /> New badge
          </Button>
        }
      />
      {!data ? (
        <PageSkeleton />
      ) : data.badges.length === 0 ? (
        <EmptyState icon={Award} title="No badges yet" text="Create badges like Top Rated or Premium Partner." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.badges.map((b) => (
            <div key={b.id} className="flex gap-4 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary">
                {b.iconUrl ? <img src={b.iconUrl} alt="" className="size-full object-cover" /> : <Award className="size-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.name}</div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{b.criteriaDescription ?? "No description"}</p>
                <div className="mt-2 text-xs text-muted-foreground">{b._count?.providers ?? 0} providers</div>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEdit(b)} aria-label={`Edit ${b.name}`}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDel(b)} aria-label={`Delete ${b.name}`}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <BadgeDialog badge={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {del && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDel(null)}
          title={`Delete ${del.name}?`}
          description={`It is removed from ${del._count?.providers ?? 0} providers. A badge used by an active plan cannot be deleted.`}
          confirmLabel="Delete badge"
          destructive
          busy={remove.isPending}
          onConfirm={() => remove.mutate(del.id)}
        />
      )}
    </>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(60, "Keep it under 60 characters"),
  criteriaDescription: z.string().trim().max(300, "Keep it under 300 characters"),
  iconUrl: z.string(),
});
type Values = z.infer<typeof schema>;

function BadgeDialog({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { name: badge?.name ?? "", criteriaDescription: badge?.criteriaDescription ?? "", iconUrl: badge?.iconUrl ?? "" },
  });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const json = { name: v.name, criteriaDescription: v.criteriaDescription || null, iconUrl: v.iconUrl || null };
    try {
      if (badge) await api(`/admin/badges/${badge.id}`, { method: "PATCH", json });
      else await api("/admin/badges", { method: "POST", json });
      toast.success(badge ? "Badge saved" : "Badge created");
      void qc.invalidateQueries({ queryKey: ["badges"] });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{badge ? `Edit ${badge.name}` : "New badge"}</DialogTitle>
          <DialogDescription>Customers see the name and icon on provider profiles.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormAlert message={error} />
          <Field id="badge-name" label="Name" error={errors.name} required>
            <Input {...fieldA11y("badge-name", errors.name)} maxLength={60} {...register("name")} />
          </Field>
          <Field id="badge-desc" label="How it is earned" error={errors.criteriaDescription} optional>
            <Textarea {...fieldA11y("badge-desc", errors.criteriaDescription)} rows={2} maxLength={300} {...register("criteriaDescription")} />
          </Field>
          <Field id="badge-icon" label="Icon" optional>
            <Controller control={control} name="iconUrl" render={({ field }) => <FileUpload id="badge-icon" purpose="logo" value={field.value} onChange={field.onChange} previewClassName="size-16 rounded-xl" onUploadingChange={setUploading} />} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting && <Loader2 className="animate-spin" />} Save badge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
