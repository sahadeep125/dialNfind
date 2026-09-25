// Shapes for the listing management screens: profile, services, hours, areas, portfolio and
// verification. Request and response shapes mirror server/src/routes/provider/profile.ts.

import type { Hours, PriceUnit, ProviderProfile, ServiceArea } from "@/types";

/** Local form state for the business profile editor. Numbers are kept as text while editing. */
export interface ProfileFormValues {
  businessName: string;
  businessType: "individual" | "company";
  description: string;
  yearsExperience: string;
  selfReportedCompletedJobs: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  website: string;
  logoUrl: string | null;
  coverUrl: string | null;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string | null>>;

/** PATCH /provider/profile body (every field optional on the server). */
export interface ProfileUpdateBody {
  businessName?: string;
  businessType?: "individual" | "company";
  description?: string | null;
  yearsExperience?: number | null;
  selfReportedCompletedJobs?: number | null;
  phone?: string;
  whatsappNumber?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  acceptsCalls?: boolean;
  acceptsWhatsapp?: boolean;
  addressLine?: string | null;
  locality?: string | null;
  city?: string;
  state?: string;
  pincode?: string | null;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
}

/** Every list and profile write returns the refreshed profile. */
export interface ProfileResponse {
  provider: ProviderProfile;
}

/** One row of PUT /provider/services { services }. */
export interface ServiceInput {
  categoryId: number;
  subcategoryId: number | null;
  startingPrice: number | null;
  priceUnit: PriceUnit;
  isPrimary: boolean;
}

/** What the add or edit service sheet produces. */
export interface ServiceDraft {
  categoryId: number | null;
  subcategoryId: number | null;
  price: string;
  priceUnit: PriceUnit;
  isPrimary: boolean;
}

export type HoursInput = Hours;
export type ServiceAreaInput = ServiceArea;

// Category attributes ("service details") -----------------------------------------------------

export type AttributeValue = string | number | boolean | string[] | null;

export interface CategoryAttribute {
  id: number;
  label: string;
  fieldType: "text" | "number" | "select" | "multiselect" | "boolean";
  options: string[];
  isRequired: boolean;
  value: AttributeValue;
}

export interface AttributeGroup {
  providerServiceId: number;
  title: string;
  attributes: CategoryAttribute[];
}

export interface AttributeValueInput {
  providerServiceId: number;
  attributeId: number;
  value: AttributeValue;
}

// Portfolio -----------------------------------------------------------------------------------

export interface PortfolioDraft {
  id?: number;
  imageUrl: string | null;
  title: string;
  description: string;
}

export interface PortfolioBody {
  title: string;
  description: string | null;
  imageUrl: string;
}

// Verification --------------------------------------------------------------------------------

/** Types a provider can submit. The server also stores "phone" rows created by the team. */
export type SubmittableVerificationType = "business" | "location" | "id_proof";

export interface Verification {
  id: number;
  type: SubmittableVerificationType | "phone";
  status: "pending" | "approved" | "rejected";
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

export interface VerificationsResponse {
  verificationStatus: ProviderProfile["verificationStatus"];
  verifications: Verification[];
}
