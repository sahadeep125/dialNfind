// GET /provider/reviews and PUT /provider/reviews/:id/reply.
import type { Paged } from "@/types";

export type ReviewFilter = "all" | "unreplied";

export interface ProviderReview {
  id: number;
  rating: number;
  reviewText: string | null;
  providerReply: string | null;
  providerReplyAt: string | null;
  status: string;
  isVerifiedContact: boolean;
  createdAt: string;
  author: string;
  photos: string[];
}

export interface ReviewsSummary {
  avgRating: number;
  totalReviews: number;
  breakdown: { rating: number; count: number }[];
}

export type ReviewsPage = Paged & { summary: ReviewsSummary; reviews: ProviderReview[] };
