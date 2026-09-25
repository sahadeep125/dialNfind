// Shared domain types. API shapes mirror server/src and the provider web app's src/lib/types.ts.
// Screen-specific response shapes live in their own files in this folder (dashboard.ts, leads.ts, ...).

export type Role = "super_admin" | "admin" | "provider" | "customer";

export interface SessionUser {
  id: number;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  createdAt: string;
  provider: { id: number; slug: string; businessName: string; status: string } | null;
}

export type ProviderStatus = "pending" | "active" | "rejected" | "suspended";
export type VerificationStatus = "none" | "partial" | "verified";

/** GET /provider/me: the signed-in person's business, if any, and their listing claims. */
export interface ProviderState {
  provider: {
    id: number;
    slug: string;
    businessName: string;
    status: ProviderStatus;
    profileCompletenessPct: number;
    verificationStatus: VerificationStatus;
  } | null;
  claims: {
    id: number;
    status: string;
    method: string;
    provider: { id: number; businessName: string; city: string };
  }[];
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
  providerCount: number;
  subcategories: Subcategory[];
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

export interface PortfolioItem {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  categoryId: number | null;
}

/** GET /provider/profile: the full editable business profile. */
export interface ProviderProfile {
  id: number;
  slug: string;
  businessName: string;
  description: string | null;
  businessType: "individual" | "company";
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
  verificationStatus: VerificationStatus;
  status: ProviderStatus;
  profileCompletenessPct: number;
  businessHours: Hours[];
  serviceAreas: ServiceArea[];
  services: ProviderService[];
  portfolio: PortfolioItem[];
  badges: { badge: { id: number; name: string } }[];
  checklist: ChecklistItem[];
}

export interface LocationOption {
  label: string;
  name: string;
  city: string;
  state: string;
  kind: "city" | "area" | "current";
  latitude: number;
  longitude: number;
  providerCount?: number;
}

export interface Paged {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error?: { message?: string; details?: { path: string; message: string }[] };
}

export type ThemePreference = "system" | "light" | "dark";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface AppConfig {
  site_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_hours: string | null;
  terms_url: string | null;
  privacy_url: string | null;
}

export type UploadPurpose = "avatar" | "logo" | "cover" | "portfolio" | "review" | "document";

/** A file chosen from the photo library, camera or document picker, ready to upload. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}
