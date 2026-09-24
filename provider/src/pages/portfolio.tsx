import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Images, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { ProviderProfile } from "@/lib/types";
import { useProfile } from "@/layouts/app-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState, PageSkeleton } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, fieldA11y } from "@/components/form";
import { FileUpload } from "@/components/file-upload";

type Item = ProviderProfile["portfolio"][number];
const photoSchema = z.object({
  imageUrl: z.string().min(1, "Upload a photo"),
  title: z.string().trim().min(2, "Give the photo a short title").max(100, "Keep the title under 100 characters"),
  description: z.string().trim().max(500, "Keep the description under 500 characters"),
});
type PhotoValues = z.infer<typeof photoSchema>;
type Draft = PhotoValues & { id?: number };

const EMPTY: Draft = { title: "", description: "", imageUrl: "" };

export function PortfolioPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const json = { title: d.title.trim(), description: d.description.trim() || null, imageUrl: d.imageUrl.trim() };
      return d.id ? api(`/provider/portfolio/${d.id}`, { method: "PATCH", json }) : api("/provider/portfolio", { method: "POST", json });
    },
    onSuccess: (_r, d) => {
      toast.success(d.id ? "Photo updated" : "Photo added");
      setDraft(null);
      void qc.invalidateQueries();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/provider/portfolio/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Photo removed");
      void qc.invalidateQueries();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (!profile) return <PageSkeleton />;
  const items = profile.portfolio;
  const edit = (i: Item) => setDraft({ id: i.id, title: i.title, description: i.description ?? "", imageUrl: i.imageUrl });

  return (
    <>
      <PageHeader
        title="Photos"
        description="Show your shop, your team and finished jobs. Profiles with photos get noticeably more calls."
        actions={
          <Button onClick={() => setDraft(EMPTY)}>
            <ImagePlus /> Add photo
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={Images} title="No photos yet" text="Add a few photos of recent work so customers can judge the quality before they call.">
          <Button onClick={() => setDraft(EMPTY)}>
            <ImagePlus /> Add your first photo
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((i) => (
            <figure key={i.id} className="group overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
              <div className="relative aspect-[4/3] bg-muted">
                <img src={i.imageUrl} alt={i.title} className="size-full object-cover" loading="lazy" />
                <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="size-8" onClick={() => edit(i)} aria-label="Edit photo">
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="size-8 text-destructive"
                    aria-label="Delete photo"
                    disabled={remove.isPending}
                    onClick={() => confirm(`Remove "${i.title}"?`) && remove.mutate(i.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <figcaption className="p-4">
                <div className="font-medium">{i.title}</div>
                {i.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.description}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit photo" : "Add a photo"}</DialogTitle>
            <DialogDescription>Show a finished job, your shop or your team. Clear, well-lit photos work best.</DialogDescription>
          </DialogHeader>
          {draft && <PhotoForm draft={draft} saving={save.isPending} onCancel={() => setDraft(null)} onSubmit={(v) => save.mutate({ ...v, id: draft.id })} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhotoForm({ draft, saving, onCancel, onSubmit }: { draft: Draft; saving: boolean; onCancel: () => void; onSubmit: (v: PhotoValues) => void }) {
  const [uploading, setUploading] = useState(false);
  const { register, control, handleSubmit, reset, formState } = useForm<PhotoValues>({ resolver: zodResolver(photoSchema), defaultValues: draft, mode: "onTouched" });
  const { errors } = formState;
  useEffect(() => reset(draft), [draft, reset]);

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Field id="imageUrl" label="Photo" error={errors.imageUrl} required>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => (
            <FileUpload id="imageUrl" purpose="portfolio" value={field.value} onChange={field.onChange} invalid={!!errors.imageUrl} describedBy={errors.imageUrl ? "imageUrl-error" : undefined} onUploadingChange={setUploading} />
          )}
        />
      </Field>
      <Field id="title" label="Title" error={errors.title} required>
        <Input placeholder="e.g. 55 inch LED panel replacement" {...fieldA11y("title", errors.title)} {...register("title")} />
      </Field>
      <Field id="desc" label="Description" error={errors.description} optional>
        <Textarea rows={3} {...fieldA11y("desc", errors.description)} {...register("description")} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Loader2 className="animate-spin" />} Save photo
        </Button>
      </DialogFooter>
    </form>
  );
}
