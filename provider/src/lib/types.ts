import type { SeoAnalysis } from "@/lib/seo";
export interface User {
  id: number;
  role: "super_admin" | "provider" | "customer";
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: string | null;
  createdAt?: string;
  provider: { id: number; slug: string; businessName: string; status: string } | null;
  /** False for accounts created with Google or Apple until a password is set. */
  hasPassword: boolean;
  linkedAccounts: ("google" | "apple")[];
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
  subcategories: Subcategory[];
}

/** A profession an individual can pick; it maps onto a category and, sometimes, one of its services. */
export interface Profession {
  label: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
}

export interface Hours {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  is24x7: boolean;
}

export interface ServiceArea {
  areaName: string;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type PriceUnit = "per_visit" | "per_hour" | "fixed";

export interface ProviderService {
  id?: number;
  categoryId: number;
  subcategoryId: number | null;
  startingPrice: number | null;
  priceUnit: PriceUnit;
  isPrimary: boolean;
  category?: { id: number; name: string };
  subcategory?: { id: number; name: string } | null;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export interface ProviderProfile {
  id: number;
  slug: string;
  businessName: string;
  description: string | null;
  businessType: "individual" | "company";
  /** The title after an individual's name ("Plumber"); null means the main service gives it. */
  profession: string | null;
  yearsExperience: number | null;
  selfReportedCompletedJobs: number | null;
  phone: string;
  whatsappNumber: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  addressLine: string | null;
  locality: string | null;
  city: string;
  state: string;
  pincode: string | null;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
  isAvailable: boolean;
  avgRating: number;
  totalReviews: number;
  verificationStatus: "none" | "partial" | "verified";
  status: "pending" | "active" | "rejected" | "suspended";
  profileCompletenessPct: number;
  businessHours: Hours[];
  serviceAreas: ServiceArea[];
  services: ProviderService[];
  portfolio: PortfolioItem[];
  badges: { badge: { id: number; name: string } }[];
  checklist: ChecklistItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  seoKeywords: string[];
  updatedAt: string;
  /** The SEO score, checks and Google preview (server/src/services/seo.ts). */
  seo: SeoAnalysis;
}

export interface PortfolioItem {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  categoryId: number | null;
  sortOrder: number;
  /** Shown first on the public listing. */
  isCover: boolean;
}

export interface LocationOption {
  label: string;
  name: string;
  city: string;
  state: string;
  kind: string;
  latitude: number;
  longitude: number;
}

// Leads ------------------------------------------------------------------------------------------

export type LeadChannel = "call" | "whatsapp";
/** The provider's own follow-up on a lead. */
export type LeadStatus = "new" | "contacted" | "won" | "lost";

export interface Lead {
  id: number;
  channel: LeadChannel;
  source: string;
  description: string | null;
  createdAt: string;
  customerName: string;
  /** Only for signed-in customers with a number on file. */
  customerPhone: string | null;
  isGuest: boolean;
  service: string | null;
  customerReportedResponse: boolean | null;
  reviewRating: number | null;
  details: { label: string; value: string }[];
  disputeStatus: "none" | "open" | "accepted" | "rejected";
  disputeReason: string | null;
  providerStatus: LeadStatus;
  providerNote: string | null;
}

export interface LeadsResponse {
  leads: Lead[];
  page: number;
  totalPages: number;
  total: number;
}

// Reviews ----------------------------------------------------------------------------------------

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
  /** The provider already reported it to the moderation team. */
  reported: boolean;
}

export interface ReviewsResponse {
  summary: { avgRating: number; totalReviews: number; breakdown: { rating: number; count: number }[] };
  reviews: ProviderReview[];
  page: number;
  totalPages: number;
}
