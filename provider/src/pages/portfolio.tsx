import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Item = ProviderProfile["portfolio"][number];
type Draft = { id?: number; title: string; description: string; imageUrl: string };

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
            <DialogDescription>Paste a link to a hosted image. Direct uploads arrive with cloud storage.</DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              id="portfolio-form"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input id="imageUrl" type="url" required value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://" />
                {draft.imageUrl && <img src={draft.imageUrl} alt="" className="aspect-video w-full rounded-xl border object-cover" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" required minLength={2} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. 55 inch LED panel replacement" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description (optional)</Label>
                <Textarea id="desc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button type="submit" form="portfolio-form" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
