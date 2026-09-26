export interface User {
  id: number;
  role: "super_admin" | "provider" | "customer";
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: string | null;
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
  portfolio: PortfolioItem[];
  badges: { badge: { id: number; name: string } }[];
  checklist: ChecklistItem[];
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

// Plans and billing ------------------------------------------------------------------------------

export type Entitlement = "provider_pro" | "provider_business";
export type PlanCode = "free" | "pro" | "business";
export type SubscriptionSource = "admin" | "razorpay" | "app_store" | "play_store";
export type BillingCycle = "monthly" | "yearly";

/** From GET /provider/me and /provider/billing. Features are gated on entitlements, never plan names. */
export interface PlanState {
  plan: { id: number | null; code: PlanCode; name: string };
  entitlements: Entitlement[];
  features: { analytics: boolean; whatsapp: boolean; promote: boolean; priority_support: boolean };
  subscription: {
    id: number;
    status: "pending" | "active" | "past_due" | "expired" | "cancelled";
    source: SubscriptionSource;
    billingCycle: BillingCycle;
    startDate: string;
    endDate: string | null;
    cancelAtPeriodEnd: boolean;
    graceUntil: string | null;
  } | null;
  limits: { leads: { limit: number | null; used: number }; photos: { limit: number | null; used: number } };
}

export interface PlanForSale {
  id: number;
  code: PlanCode;
  name: string;
  price: number;
  leadAccessLimit: number | null;
  photoLimit: number | null;
  featuresJson: string[] | null;
  badge: { id: number; name: string } | null;
  prices: { billingCycle: BillingCycle; amount: number; availableOnWeb: boolean }[];
}

export interface Invoice {
  id: number;
  number: string;
  total: number;
  taxable: number;
  tax: number;
  status: "issued" | "void";
  issuedAt: string;
  pdfUrl: string;
}

export interface BillingResponse {
  state: PlanState;
  plans: PlanForSale[];
  transactions: {
    id: number;
    type: string;
    gateway: "manual" | "razorpay" | "app_store" | "play_store";
    amount: number;
    currency: string;
    status: string;
    gatewayTxnId: string | null;
    invoiceNumber: string | null;
    createdAt: string;
  }[];
  invoices: Invoice[];
  billingProfile: { billingName: string; billingAddress: string | null; billingStateCode: string | null; gstin: string | null };
  web: { enabled: boolean; keyId: string | null };
  managedIn: "web" | "app_store" | "play_store" | "support" | null;
  manageUrl: string | null;
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
  /** Only for signed-in customers with a number on file; null while the lead is locked. */
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
  /** Past the plan's monthly lead limit: the details stay hidden until the provider upgrades. */
  locked: boolean;
}

export interface LeadsResponse {
  leads: Lead[];
  leadLimit: number | null;
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

// Promotions -------------------------------------------------------------------------------------

export interface Campaign {
  id: number;
  status: "active" | "paused" | "completed";
  startDate: string;
  endDate: string;
  budget: number;
  amountSpent: number;
  impressions: number;
  clicks: number;
  ctrPct: number | null;
  targetLocation: string | null;
  category: { id: number; name: string };
}

export interface PromoteResponse {
  /** Campaigns need the Business plan; past campaigns stay visible either way. */
  locked: boolean;
  listings: Campaign[];
  categories: { id: number; name: string }[];
  pricing: { costPerClick: number; minBudget: number; city: string; gstRate: number };
  /** Online payment is available; otherwise campaigns are requested from the team. */
  checkoutEnabled: boolean;
}

export interface SponsoredCheckout {
  orderId: string;
  keyId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  prefill: { name?: string; email?: string; contact?: string };
}
