"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info, Loader2, PenLine, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { PhotoListUpload } from "@/components/file-upload";
import { clientApi, ClientApiError } from "@/lib/client";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { MyReview, ReviewEligibility } from "@/lib/types";
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
  eligibility = null,
  minLength,
}: {
  providerId: number;
  providerName: string;
  /** The profile's slug, so its cached page is rebuilt after saving. */
  slug?: string;
  signedIn: boolean;
  minLength: number;
  existing: (Pick<MyReview, "id" | "rating" | "reviewText"> & Partial<Pick<MyReview, "photos" | "status" | "ratingLocked">>) | null;
  /** From the profile visit; when it says no, there is no form, only a note on how to become able to review. */
  eligibility?: ReviewEligibility | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const canWrite = signedIn && (!!existing || eligibility?.canReview !== false);
  // A "How was it?" notification links here with ?review=1 to open the form straight away.
  const [open, setOpen] = useState(() => canWrite && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("review") === "1");
  const [hover, setHover] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaults: Values = { rating: existing?.rating ?? 0, reviewText: existing?.reviewText ?? "", photos: existing?.photos ?? [] };
  const { register, control, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(makeSchema(minLength)), mode: "onTouched", defaultValues: defaults });
  const { errors, isSubmitting } = formState;
  const rating = useWatch({ control, name: "rating" });
  const textLength = useWatch({ control, name: "reviewText" }).length;
  const ratingLocked = !!existing?.ratingLocked;

  // Each time the dialog opens it starts from the saved review.
  const onOpenChange = (next: boolean) => {
    if (next) {
      reset(defaults);
      setError(null);
    }
    setOpen(next);
  };

  if (!signedIn || eligibility?.reason === "sign_in") {
    return (
      <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5 hover:text-primary" onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>
        <PenLine /> Write a Review
      </Button>
    );
  }

  if (!existing && eligibility && !eligibility.canReview) return <ReviewNotAllowed eligibility={eligibility} pathname={pathname} />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const body = { rating: v.rating, reviewText: v.reviewText.trim(), photos: v.photos };
    try {
      const { review } = existing
        ? await clientApi<{ review: MyReview }>(`/reviews/${existing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await clientApi<{ review: MyReview }>("/reviews", { method: "POST", body: JSON.stringify({ providerId, ...body }) });
      if (review?.status === "pending" && existing?.status !== "pending") toast.success("Thanks! Your review will show once our team has checked it");
      else toast.success(existing ? "Review updated" : "Thanks for sharing your experience");
      track(existing ? "review_updated" : "review_submitted", { provider_id: providerId, rating: v.rating, photo_count: v.photos.length });
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
        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5 hover:text-primary">
          <PenLine /> {existing ? "Edit your review" : "Write a Review"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : `Review ${providerName}`}</DialogTitle>
          <DialogDescription>Honest reviews help your neighbours pick the right professional.</DialogDescription>
        </DialogHeader>
        {existing?.status === "pending" && <ReviewNote>Our team is checking this review. It shows on the profile once approved.</ReviewNote>}
        {ratingLocked && existing?.status !== "pending" && <ReviewNote>Stars can only be changed in the first week. If you edit the text, our team checks it again before it shows.</ReviewNote>}
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
                      disabled={ratingLocked}
                      onMouseEnter={() => !ratingLocked && setHover(i)}
                      onClick={() => field.onChange(i)}
                      className="cursor-pointer p-0.5 disabled:cursor-not-allowed"
                      aria-label={`${i} star${i > 1 ? "s" : ""}, ${LABELS[i]}`}
                    >
                      <Star className={cn("size-8 transition-colors", i <= shown ? "fill-star text-star" : "text-border")} strokeWidth={1.5} />
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

function ReviewNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl bg-muted/70 p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" /> <span>{children}</span>
    </p>
  );
}

/** In place of "Write a Review" when the visitor may not review yet, saying what would change that. */
function ReviewNotAllowed({ eligibility, pathname }: { eligibility: ReviewEligibility; pathname: string }) {
  const link = "font-medium text-primary hover:underline";
  let text: React.ReactNode;
  if (eligibility.reason === "verify_email") {
    text = (
      <>
        <Link href={`/verify-email?next=${encodeURIComponent(pathname)}`} className={link}>
          Confirm your email
        </Link>{" "}
        to write a review.
      </>
    );
  } else if (eligibility.reason === "too_soon") {
    text = (
      <>
        You can review them {eligibility.availableAt ? `from ${formatDateTime(eligibility.availableAt)}` : "soon"}. Already heard back?{" "}
        <Link href="/dashboard/contacts" className={link}>
          Tell us they responded
        </Link>
        .
      </>
    );
  } else if (eligibility.reason === "no_contact") {
    text = "Reviews come from customers who contacted this business on DialNFind. Call or WhatsApp them from this page to review them later.";
  } else {
    return null;
  }
  return <p className="max-w-xs text-right text-xs text-muted-foreground">{text}</p>;
}
