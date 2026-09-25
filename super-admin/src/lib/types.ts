export interface Paged {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProviderRow {
  id: number;
  slug: string;
  businessName: string;
  city: string;
  locality: string | null;
  phone: string;
  logoUrl: string | null;
  status: "pending" | "active" | "rejected" | "suspended";
  verificationStatus: "none" | "partial" | "verified";
  userId: number | null;
  avgRating: number;
  totalReviews: number;
  profileCompletenessPct: number;
  createdAt: string;
  user: { name: string; email: string } | null;
  services: { category: { name: string } }[];
}

export type BillingCycle = "monthly" | "yearly";
export type SubscriptionSource = "admin" | "razorpay" | "app_store" | "play_store";
export type PaymentGateway = "manual" | "razorpay" | "app_store" | "play_store";

export interface PlanPrice {
  id: number;
  billingCycle: BillingCycle;
  amount: number;
  razorpayPlanId: string | null;
  iosProductId: string | null;
  androidProductId: string | null;
  isActive: boolean;
}

export interface Plan {
  id: number;
  /** free | pro | business: decides the entitlements; fixed once created. */
  code: string;
  entitlements: string[];
  name: string;
  price: number;
  billingCycle: BillingCycle;
  prices: PlanPrice[];
  photoLimit: number | null;
  leadAccessLimit: number | null;
  analyticsEnabled: boolean;
  rankingBoost: number;
  badgeId: number | null;
  featuresJson: string[] | null;
  isActive: boolean;
  badge: Badge | null;
  _count: { subscriptions: number };
}

export interface Badge {
  id: number;
  name: string;
  iconUrl: string | null;
  criteriaDescription: string | null;
  _count?: { providers: number };
}

export interface CategoryOption {
  id: number;
  name: string;
}

export const VERIFICATION_LABEL: Record<string, string> = {
  phone: "Phone",
  business: "Business registration",
  location: "Business address",
  id_proof: "Owner identity",
};

export interface Invoice {
  id: number;
  number: string;
  transactionId: number;
  total: number;
  taxable: number;
  tax: number;
  status: "issued" | "void";
  issuedAt: string;
  pdfUrl: string;
}

export const SOURCE_LABEL: Record<SubscriptionSource, string> = { admin: "Team grant", razorpay: "Web (Razorpay)", app_store: "App Store", play_store: "Google Play" };
export const GATEWAY_LABEL: Record<PaymentGateway, string> = { manual: "Recorded by team", razorpay: "Razorpay", app_store: "App Store", play_store: "Google Play" };
