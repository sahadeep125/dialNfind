// Shapes for business setup: creating a new listing (POST /provider/onboarding) and claiming an
// existing one (/provider/claims/*). Mirrors server/src/routes/provider/onboarding.ts.

import type { Hours, PriceUnit, ServiceArea } from "./index";

/** A listing returned by the claim search and the single-listing lookup. The phone is masked. */
export interface ClaimListing {
  id: number;
  businessName: string;
  slug: string;
  locality: string | null;
  city: string;
  phone: string;
  category: string | null;
  avgRating: number;
  totalReviews: number;
  isClaimed: boolean;
}

export interface StartClaimInput {
  providerId: number;
  documentUrl: string;
}

/** POST /provider/claims. token is set when the account's role changed to provider. */
export interface StartClaimResponse {
  claim: { id: number; status: string; method: "document" };
  token: string | null;
}

export type BusinessType = "individual" | "company";

/** Step 1 form state. Numbers stay as text until they are sent. */
export interface BusinessDraft {
  businessName: string;
  businessType: BusinessType;
  yearsExperience: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
}

/** A service chosen in step 2. */
export interface ServiceDraft {
  categoryId: number;
  subcategoryId: number | null;
  startingPrice: number | null;
  priceUnit: PriceUnit;
  isPrimary: boolean;
}

/** Step 3 form state. */
export interface LocationDraft {
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
}

/** Step 5 form state. */
export interface ContactDraft {
  phone: string;
  whatsappNumber: string;
  email: string;
  website: string;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
}

export interface OnboardingDraft {
  business: BusinessDraft;
  services: ServiceDraft[];
  location: LocationDraft;
  areas: ServiceArea[];
  hours: Hours[];
  contact: ContactDraft;
}

/** Field problems for the current step, keyed by field name. */
export type StepErrors = Record<string, string>;

/** Body of POST /provider/onboarding. */
export interface OnboardingPayload {
  businessName: string;
  businessType: BusinessType;
  yearsExperience: number | null;
  description?: string;
  phone: string;
  whatsappNumber: string | null;
  email: string;
  website: string;
  addressLine?: string;
  locality?: string;
  city: string;
  state: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
  services: ServiceDraft[];
  serviceAreas: ServiceArea[];
  hours: Hours[];
}

export interface OnboardingResponse {
  provider: { id: number; slug: string; status: string };
  token: string | null;
}
