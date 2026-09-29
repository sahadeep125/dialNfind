"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FavoriteButton } from "@/components/provider/favorite-button";
import { ReviewForm } from "@/components/provider/review-form";
import { useSession } from "@/components/site/session-provider";
import { clientApi } from "@/lib/client";
import type { MyReview, ReviewEligibility } from "@/lib/types";

interface ViewerState {
  loaded: boolean;
  isFavorite: boolean;
  myReview: MyReview | null;
  reviewEligibility: ReviewEligibility | null;
}

const EMPTY: ViewerState = { loaded: false, isFavorite: false, myReview: null, reviewEligibility: null };
const ViewerContext = createContext<ViewerState>(EMPTY);

/**
 * The profile page is cached for everyone. On each visit this counts the view and loads what is
 * personal to the visitor: whether they saved the provider, the review they wrote, and whether they may write one.
 */
export function ProviderViewerState({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { user, loading } = useSession();
  const [state, setState] = useState<ViewerState>(EMPTY);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    clientApi<Omit<ViewerState, "loaded">>(`/providers/${encodeURIComponent(slug)}/visit`, { method: "POST" })
      .then((data) => {
        if (!cancelled) setState({ ...EMPTY, ...data, loaded: true });
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY, loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, userId, loading]);

  return <ViewerContext.Provider value={state}>{children}</ViewerContext.Provider>;
}

export function ProfileFavoriteButton({ providerId, className }: { providerId: number; className?: string }) {
  const { loaded, isFavorite } = useContext(ViewerContext);
  return <FavoriteButton key={loaded ? String(isFavorite) : "loading"} providerId={providerId} initial={isFavorite} withLabel className={className} />;
}

export function ProfileReviewForm(props: { providerId: number; providerName: string; slug: string; minLength: number }) {
  const { user } = useSession();
  const { loaded, myReview, reviewEligibility } = useContext(ViewerContext);
  // Signed-in visitors see nothing until the server says whether they may review.
  if (user && !loaded) return null;
  return <ReviewForm key={loaded ? String(myReview?.id ?? "new") : "loading"} {...props} signedIn={!!user} existing={myReview} eligibility={reviewEligibility} />;
}
