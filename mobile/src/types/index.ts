// Shared domain types. API shapes mirror server/src and the website's web/lib/types.ts.

export type Role = "super_admin" | "admin" | "provider" | "customer";

export interface SessionUser {
  id: number;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  provider: { id: number; slug: string; businessName: string; status: string } | null;
}

export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  uiTemplate: string;
  providerCount: number;
  subcategories: Subcategory[];
}

export interface ProviderCard {
  id: number;
  slug: string;
  businessName: string;
  shortDescription: string;
  logoUrl: string | null;
  coverUrl: string | null;
  businessType: "individual" | "company";
  yearsExperience: number | null;
  phone: string;
  whatsappNumber: string;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
  isAvailable: boolean;
  locality: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  avgRating: number;
  totalReviews: number;
  verificationStatus: "none" | "partial" | "verified";
  isClaimed: boolean;
  isOpenNow: boolean;
  todayHours: string;
  primaryCategory: { id: number; name: string; slug: string } | null;
  subcategories: string[];
  startingPrice: number | null;
  priceUnit: "per_visit" | "per_hour" | "fixed" | null;
  serviceAreas: string[];
  badges: { id: number; name: string }[];
  isFavorite: boolean;
  isSponsored: boolean;
}

export interface ProviderDetail extends Omit<ProviderCard, "serviceAreas"> {
  description: string | null;
  email: string | null;
  website: string | null;
  addressLine: string | null;
  pincode: string | null;
  serviceRadiusKm: number;
  selfReportedCompletedJobs: number | null;
  memberSince: string;
  is24x7: boolean;
  hours: { dayOfWeek: number; day: string; label: string; isToday: boolean }[];
  serviceAreas: { areaName: string; pincode: string | null }[];
  services: {
    id: number;
    category: { id: number; name: string; slug: string };
    subcategory: { id: number; name: string; slug: string } | null;
    startingPrice: number | null;
    priceUnit: "per_visit" | "per_hour" | "fixed";
    isPrimary: boolean;
  }[];
  serviceDetails: { label: string; value: string }[];
  portfolio: {
    id: number;
    title: string;
    description: string | null;
    imageUrl: string;
    category: string | null;
  }[];
  verifications: { type: string; verifiedAt: string | null }[];
  ratingBreakdown: { rating: number; count: number }[];
  myReview: { id: number; rating: number; reviewText: string | null; photos: string[] } | null;
}

export interface Review {
  id: number;
  rating: number;
  reviewText: string | null;
  providerReply: string | null;
  providerReplyAt: string | null;
  isVerifiedContact: boolean;
  createdAt: string;
  author: { name: string; photoUrl: string | null };
  photos: string[];
}

export interface Paged {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SearchResponse extends Paged {
  results: ProviderCard[];
  resolved: {
    category: { id: number; name: string; slug: string } | null;
    subcategory: { id: number; name: string; slug: string } | null;
  };
}

export interface LocationOption {
  label: string;
  name: string;
  city: string;
  state: string;
  /** "place" comes from the map search: a real place with no providers listed yet. */
  kind: "city" | "area" | "place" | "current";
  latitude: number;
  longitude: number;
  providerCount?: number;
}

export interface Suggestion {
  type: "service" | "category" | "provider";
  label: string;
  slug: string;
  categorySlug?: string;
  context?: string;
}

export interface Address {
  id: number;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface ContactHistoryItem {
  id: number;
  channel: "call" | "whatsapp";
  createdAt: string;
  customerReportedResponse: boolean | null;
  hasReview: boolean;
  provider: ProviderCard;
}

export interface FavoriteProvider extends ProviderCard {
  favoritedAt: string;
}

export interface MyReview {
  id: number;
  rating: number;
  reviewText: string | null;
  providerReply: string | null;
  providerReplyAt: string | null;
  status: "published" | "flagged" | "removed";
  createdAt: string;
  provider: {
    id: number;
    slug: string;
    businessName: string;
    city: string;
    locality: string | null;
    logoUrl: string | null;
  };
}

export interface ApiErrorBody {
  error?: { message?: string; details?: { path: string; message: string }[] };
}

export type SortOption = "relevance" | "distance" | "rating" | "reviews";

export interface SearchFilters {
  q?: string;
  category?: string;
  subcategory?: string;
  sort: SortOption;
  openNow: boolean;
  verified: boolean;
  minRating?: number;
}

export type ThemePreference = "system" | "light" | "dark";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface PopularTerm {
  term: string;
  count: number;
}

export interface AppConfig {
  site_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_hours: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  min_review_length: number;
}
