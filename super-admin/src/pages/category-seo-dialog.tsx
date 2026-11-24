import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import { SEO_LIMITS } from "@/lib/seo";
import { TITLE_SUFFIX, type CategoryPageContent } from "@/lib/category-page";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { FileUpload } from "@/components/file-upload";
import { LengthHint, SearchPreview } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const schema = z.object({
  imageUrl: z.string(),
  imageAlt: z.string().trim().max(150, "Keep it under 150 characters"),
  seoTitle: z.string().trim().max(SEO_LIMITS.title.hard - TITLE_SUFFIX.length, `Keep it under ${SEO_LIMITS.title.hard - TITLE_SUFFIX.length} characters`),
  seoDescription: z.string().trim().max(SEO_LIMITS.description.hard, `Keep it under ${SEO_LIMITS.description.hard} characters`),
  seoHeading: z.string().trim().max(100, "Keep it under 100 characters"),
  seoContent: z.string().trim().max(5000, "Keep it under 5,000 characters"),
  faqs: z
    .array(
      z.object({
        q: z.string().trim().min(5, "Write the question").max(200, "Keep it under 200 characters"),
        a: z.string().trim().min(10, "Write an answer of at least 10 characters").max(1000, "Keep it under 1,000 characters"),
      }),
    )
    .max(15, "Keep it to 15 questions"),
});
type Values = z.infer<typeof schema>;

/**
 * The category's public page (kaajva.in/services/<slug>): photo, search title and description, heading,
 * the "About" text and the questions. Anything left empty uses the website's own written copy.
 */
export function CategorySeoDialog({ category: c, onClose }: { category: CategoryPageContent; onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, control, handleSubmit, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      imageUrl: c.imageUrl ?? "",
      imageAlt: c.imageAlt ?? "",
      seoTitle: c.seoTitle ?? "",
      seoDescription: c.seoDescription ?? "",
      seoHeading: c.seoHeading ?? "",
      seoContent: c.seoContent ?? "",
      faqs: c.faqs ?? [],
    },
  });
  const faqs = useFieldArray({ control, name: "faqs" });
  const { errors, isSubmitting } = formState;
  const [title, description, content, imageUrl] = watch(["seoTitle", "seoDescription", "seoContent", "imageUrl"]);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const pageUrl = `${WEB_URL.replace(/\/$/, "")}/services/${c.slug}`;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api(`/categories/${c.id}`, { method: "PATCH", json: { ...v, imageUrl: v.imageUrl || null } });
      toast.success("Page content saved. The website shows it within a few minutes.");
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{c.name} page</DialogTitle>
          <DialogDescription>
            What search engines and visitors see on{" "}
            <a href={pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              /services/{c.slug} <ExternalLink className="size-3" />
            </a>
            . Empty fields use the website&apos;s built-in text.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          {error && <FormAlert message={error} />}

          <section className="grid gap-4">
            <h3 className="text-sm font-semibold">Photo</h3>
            <Field id="seo-image" label="Category photo" hint="Landscape, at least 1200 px wide. Shown on the category page, the Services page and in link previews." optional>
              <Controller control={control} name="imageUrl" render={({ field }) => <FileUpload id="seo-image" purpose="cover" value={field.value} onChange={field.onChange} previewClassName="aspect-[16/9] rounded-xl" onUploadingChange={setUploading} />} />
            </Field>
            <Field id="seo-image-alt" label="Photo description (alt text)" error={errors.imageAlt} hint="Describe what is in the photo, e.g. Electrician fixing a switchboard in a Siliguri home" optional={!imageUrl}>
              <Input {...fieldA11y("seo-image-alt", errors.imageAlt, true)} maxLength={150} {...register("imageAlt")} />
            </Field>
          </section>

          <section className="grid gap-4 border-t pt-5">
            <h3 className="text-sm font-semibold">Search result</h3>
            <Field id="seo-title" label="Title" error={errors.seoTitle} hint={<LengthHint length={title.length + TITLE_SUFFIX.length} min={SEO_LIMITS.title.min} max={SEO_LIMITS.title.max} hard={SEO_LIMITS.title.hard} />} optional>
              <Input {...fieldA11y("seo-title", errors.seoTitle, true)} maxLength={SEO_LIMITS.title.hard - TITLE_SUFFIX.length} placeholder={`e.g. Electrician Near Me in Siliguri: Verified Pros`} {...register("seoTitle")} />
            </Field>
            <Field id="seo-desc" label="Description" error={errors.seoDescription} hint={<LengthHint length={description.length} min={SEO_LIMITS.description.min} max={SEO_LIMITS.description.max} hard={SEO_LIMITS.description.hard} />} optional>
              <Textarea {...fieldA11y("seo-desc", errors.seoDescription, true)} rows={3} maxLength={SEO_LIMITS.description.hard} {...register("seoDescription")} />
            </Field>
            {(title || description) && <SearchPreview title={`${title || c.name}${TITLE_SUFFIX}`} url={pageUrl} description={description || c.description || ""} />}
          </section>

          <section className="grid gap-4 border-t pt-5">
            <h3 className="text-sm font-semibold">Page text</h3>
            <Field id="seo-heading" label="Page heading (H1)" error={errors.seoHeading} hint="The main heading at the top of the page" optional>
              <Input {...fieldA11y("seo-heading", errors.seoHeading, true)} maxLength={100} placeholder={`e.g. Electricians near you in Siliguri`} {...register("seoHeading")} />
            </Field>
            <Field
              id="seo-content"
              label="About text"
              error={errors.seoContent}
              hint={`${words} words. Shown under the listings. Separate paragraphs with an empty line; 200 to 400 words works well.`}
              optional
            >
              <Textarea {...fieldA11y("seo-content", errors.seoContent, true)} rows={10} maxLength={5000} {...register("seoContent")} />
            </Field>
          </section>

          <section className="grid gap-3 border-t pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Questions and answers ({faqs.fields.length})</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => faqs.append({ q: "", a: "" })} disabled={faqs.fields.length >= 15}>
                <Plus /> Add question
              </Button>
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">Shown on the page and given to Google as FAQ data. Four to eight real questions customers ask work best.</p>
            {errors.faqs?.message && <p className="text-sm text-destructive">{errors.faqs.message}</p>}
            {faqs.fields.map((f, i) => (
              <div key={f.id} className="grid gap-2 rounded-xl border p-3">
                <div className="flex items-start gap-2">
                  <Field id={`faq-q-${i}`} label={`Question ${i + 1}`} error={errors.faqs?.[i]?.q} className="flex-1">
                    <Input {...fieldA11y(`faq-q-${i}`, errors.faqs?.[i]?.q)} maxLength={200} {...register(`faqs.${i}.q`)} />
                  </Field>
                  <div className="mt-6 flex shrink-0">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => faqs.move(i, i - 1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => faqs.move(i, i + 1)} disabled={i === faqs.fields.length - 1} aria-label={`Move question ${i + 1} down`}>
                      <ArrowDown />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => faqs.remove(i)} aria-label={`Remove question ${i + 1}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <Field id={`faq-a-${i}`} label="Answer" error={errors.faqs?.[i]?.a}>
                  <Textarea {...fieldA11y(`faq-a-${i}`, errors.faqs?.[i]?.a)} rows={3} maxLength={1000} {...register(`faqs.${i}.a`)} />
                </Field>
              </div>
            ))}
          </section>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting && <Loader2 className="animate-spin" />} Save page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
