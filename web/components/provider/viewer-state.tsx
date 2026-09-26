"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FavoriteButton } from "@/components/provider/favorite-button";
import { ReviewForm } from "@/components/provider/review-form";
import { useSession } from "@/components/site/session-provider";
import { clientApi } from "@/lib/client";

interface MyReview {
  id: number;
  rating: number;
  reviewText: string | null;
  photos: string[];
}

interface ViewerState {
  loaded: boolean;
  isFavorite: boolean;
  myReview: MyReview | null;
}

const ViewerContext = createContext<ViewerState>({ loaded: false, isFavorite: false, myReview: null });

/**
 * The profile page is cached for everyone. On each visit this counts the view and loads what is
 * personal to the visitor: whether they saved the provider and the review they wrote.
 */
export function ProviderViewerState({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { user, loading } = useSession();
  const [state, setState] = useState<ViewerState>({ loaded: false, isFavorite: false, myReview: null });
  const userId = user?.id ?? null;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    clientApi<{ isFavorite: boolean; myReview: MyReview | null }>(`/providers/${encodeURIComponent(slug)}/visit`, { method: "POST" })
      .then((data) => {
        if (!cancelled) setState({ loaded: true, ...data });
      })
      .catch(() => {
        if (!cancelled) setState({ loaded: true, isFavorite: false, myReview: null });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, userId, loading]);

  return <ViewerContext.Provider value={state}>{children}</ViewerContext.Provider>;
}

export function ProfileFavoriteButton({ providerId }: { providerId: number }) {
  const { loaded, isFavorite } = useContext(ViewerContext);
  return <FavoriteButton key={loaded ? String(isFavorite) : "loading"} providerId={providerId} initial={isFavorite} withLabel />;
}

export function ProfileReviewForm(props: { providerId: number; providerName: string; slug: string; minLength: number }) {
  const { user } = useSession();
  const { loaded, myReview } = useContext(ViewerContext);
  return <ReviewForm key={loaded ? String(myReview?.id ?? "new") : "loading"} {...props} signedIn={!!user} existing={myReview} />;
}
