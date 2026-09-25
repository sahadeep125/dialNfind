export interface User {
  id: number;
  role: "super_admin" | "provider" | "customer";
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: string | null;
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
  verificationStatus: "none" | "partial" | "verified";
  status: "pending" | "active" | "rejected" | "suspended";
  profileCompletenessPct: number;
  businessHours: Hours[];
  serviceAreas: ServiceArea[];
  services: ProviderService[];
  portfolio: { id: number; title: string; description: string | null; imageUrl: string; categoryId: number | null }[];
  badges: { badge: { id: number; name: string } }[];
  checklist: ChecklistItem[];
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
