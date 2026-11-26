export type Role = "super_admin" | "provider" | "customer";

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
  iconUrl: string | null;
  uiTemplate: string;
  providerCount: number;
  subcategories: Subcategory[];
  /** Page content written in the admin console; empty values fall back to content/seo/categories.ts. */
  imageUrl?: string | null;
  imageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoHeading?: string | null;
  /** Paragraphs separated by a blank line. Only on GET /categories/:slug. */
  seoContent?: string | null;
  /** Only on GET /categories/:slug. */
  faqs?: { q: string; a: string }[] | null;
}

export interface ProviderCard {
  id: number;
  slug: string;
  businessName: string;
  shortDescription: string;
  logoUrl: string | null;
  coverUrl: string | null;
  /** "individual": an independent professional listed under their own name; "company": a business. */
  businessType: "individual" | "company";
  /** Individuals: the title after their name ("Plumber"). Null for a business. */
  profession?: string | null;
  /** The middle of the card title: the profession for an individual, the categories for a business. */
  categoryLabel?: string | null;
  /** The area a card names: the locality, else the city. */
  serviceAreaLabel?: string;
  yearsExperience: number | null;
  phone: string;
  /** Null when the business does not take WhatsApp messages. */
  whatsappNumber: string | null;
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
  /** False when no opening hours are listed (older APIs leave it out). */
  hasHours?: boolean;
  primaryCategory: { id: number; name: string; slug: string } | null;
  subcategories: string[];
  startingPrice: number | null;
  priceUnit: "per_visit" | "per_hour" | "fixed" | null;
  serviceAreas: string[];
  badges: { id: number; name: string }[];
  isFavorite: boolean;
}

/** The visitor's own review of a business. */
export interface MyReview {
  id: number;
  rating: number;
  reviewText: string | null;
  photos: string[];
  /** pending: held for the team; flagged or removed: taken down after a report. */
  status: "pending" | "published" | "flagged" | "removed";
  createdAt: string;
  /** After this only the text can change, and a change is checked again before it shows. */
  ratingLockedAt: string;
  ratingLocked: boolean;
}

/** Whether the visitor may review a business: only after contacting it through KaajVa (server/src/services/review-trust.ts). */
export interface ReviewEligibility {
  canReview: boolean;
  reason: "sign_in" | "verify_email" | "own_business" | "no_contact" | "too_soon" | null;
  /** For too_soon: when the review opens, unless they say the business responded first. */
  availableAt: string | null;
}

export interface ProviderDetail extends Omit<ProviderCard, "serviceAreas"> {
  /** Listing status; only a preview (?previewToken=) ever sees one that is not "active". */
  status?: "pending" | "active" | "rejected" | "suspended";
  description: string | null;
  email: string | null;
  website: string | null;
  addressLine: string | null;
  pincode: string | null;
  serviceRadiusKm: number;
  selfReportedCompletedJobs: number | null;
  memberSince: string;
  is24x7: boolean;
  hours: { dayOfWeek: number; day: string; label: string; openTime: string | null; closeTime: string | null; isToday: boolean }[];
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
  /** altText: the title plus the business and city when it lacks them (server/src/services/seo.ts photoAltText). */
  portfolio: { id: number; title: string; description: string | null; imageUrl: string; altText?: string; category: string | null }[];
  verifications: { type: string; verifiedAt: string | null }[];
  /** An individual professional's other professions, each its own listing. */
  otherListings?: { slug: string; profession: string | null; serviceAreaLabel: string }[];
  ratingBreakdown: { rating: number; count: number }[];
  myReview: MyReview | null;
  /** Null when the visitor already reviewed this business (see myReview). */
  reviewEligibility: ReviewEligibility | null;
  /** Search engine text from the API (server/src/services/seo.ts). Missing only in responses cached before it existed. */
  seo?: ProviderSeo;
}

export interface ProviderSeo {
  /** The full <title>, brand included. */
  title: string;
  description: string;
  keywords: string[];
  focusKeyword: string;
  /** "Electrician", "TV Repair": what the page is found for. */
  service: string;
  /** Hidden from search engines by the KaajVa team. */
  noIndex: boolean;
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

/** A recent 4 or 5 star review picked for the home page. */
export interface ReviewHighlight {
  id: number;
  rating: number;
  reviewText: string;
  isVerifiedContact: boolean;
  createdAt: string;
  authorName: string;
  provider: { slug: string; businessName: string; city: string; category: { name: string; slug: string } | null };
}

export interface Paged {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SearchResponse extends Paged {
  results: ProviderCard[];
  /** The radius the server searched: the one asked for, or the admin's default. */
  radiusKm: number;
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
