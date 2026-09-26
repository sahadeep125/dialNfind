"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PenLine, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { PhotoListUpload } from "@/components/file-upload";
import { clientApi, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/utils";
import { refreshProvider } from "@/app/providers/[slug]/actions";

const LABELS = ["", "Poor", "Below average", "Good", "Very good", "Excellent"];
const MAX_PHOTOS = 6;

/** The minimum length comes from the admin settings (GET /app-config). */
const makeSchema = (minLength: number) =>
  z.object({
    rating: z.number().int().min(1, "Pick a star rating").max(5),
    reviewText: z
      .string()
      .trim()
      .min(Math.max(1, minLength), minLength > 1 ? `Tell others a little more, at least ${minLength} characters` : "Write a few words about your experience")
      .max(2000, "Keep the review under 2,000 characters"),
    photos: z.array(z.string()).max(MAX_PHOTOS),
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

export function ReviewForm({
  providerId,
  providerName,
  slug,
  signedIn,
  existing,
  minLength,
}: {
  providerId: number;
  providerName: string;
  /** The profile's slug, so its cached page is rebuilt after saving. */
  slug?: string;
  signedIn: boolean;
  minLength: number;
  existing: { id: number; rating: number; reviewText: string | null; photos?: string[] } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaults: Values = { rating: existing?.rating ?? 0, reviewText: existing?.reviewText ?? "", photos: existing?.photos ?? [] };
  const { register, control, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(makeSchema(minLength)), mode: "onTouched", defaultValues: defaults });
  const { errors, isSubmitting } = formState;
  const rating = useWatch({ control, name: "rating" });
  const textLength = useWatch({ control, name: "reviewText" }).length;

  // Each time the dialog opens it starts from the saved review.
  const onOpenChange = (next: boolean) => {
    if (next) {
      reset(defaults);
      setError(null);
    }
    setOpen(next);
  };

  if (!signedIn) {
    return (
      <Button variant="outline" onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>
        <PenLine /> Write a review
      </Button>
    );
  }

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const body = { rating: v.rating, reviewText: v.reviewText.trim(), photos: v.photos };
    try {
      if (existing) await clientApi(`/reviews/${existing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await clientApi("/reviews", { method: "POST", body: JSON.stringify({ providerId, ...body }) });
      toast.success(existing ? "Review updated" : "Thanks for sharing your experience");
      setOpen(false);
      if (slug) await refreshProvider(slug);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save your review");
    }
  });

  const shown = hover || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PenLine /> {existing ? "Edit your review" : "Write a review"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : `Review ${providerName}`}</DialogTitle>
          <DialogDescription>Honest reviews help your neighbours pick the right professional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormAlert message={error} />
          <Field id="rating" label="Your rating" error={errors.rating} required>
            <Controller
              control={control}
              name="rating"
              render={({ field }) => (
                <div id="rating" role="radiogroup" aria-invalid={errors.rating ? true : undefined} aria-describedby={errors.rating ? "rating-error" : undefined} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={field.value === i}
                      onMouseEnter={() => setHover(i)}
                      onClick={() => field.onChange(i)}
                      className="cursor-pointer p-0.5"
                      aria-label={`${i} star${i > 1 ? "s" : ""}, ${LABELS[i]}`}
                    >
                      <Star className={cn("size-8 transition-colors", i <= shown ? "fill-warning text-warning" : "text-[oklch(0.88_0.02_85)]")} strokeWidth={1.5} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">{LABELS[shown]}</span>
                </div>
              )}
            />
          </Field>
          <Field
            id="review-text"
            label="Your experience"
            error={errors.reviewText}
            hint={`${textLength} of 2,000 characters. Do not share personal phone numbers or addresses.`}
            required
          >
            <Textarea {...fieldA11y("review-text", errors.reviewText, true)} rows={5} maxLength={2000} placeholder="What did they fix? Were they on time? Was the price fair?" {...register("reviewText")} />
          </Field>
          <Field id="review-photos" label="Photos" optional>
            <Controller control={control} name="photos" render={({ field }) => <PhotoListUpload id="review-photos" purpose="review" max={MAX_PHOTOS} value={field.value} onChange={field.onChange} onUploadingChange={setUploading} />} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting && <Loader2 className="animate-spin" />} {existing ? "Save changes" : "Post review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
