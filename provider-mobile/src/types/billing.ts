// Response shapes for promotion (sponsored campaigns) and plans. Mirrors server/src/routes/provider/insights.ts.

export type CampaignStatus = "active" | "paused" | "completed";

export interface Campaign {
  id: number;
  status: CampaignStatus;
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

export interface SponsoredPricing {
  costPerClick: number;
  minBudget: number;
  city: string;
}

/** GET /provider/sponsored */
export interface SponsoredResponse {
  /** Campaigns need the Business plan; past campaigns stay visible either way. */
  locked: boolean;
  listings: Campaign[];
  categories: { id: number; name: string }[];
  pricing: SponsoredPricing;
}

export type CampaignDays = 7 | 14 | 30;

export interface NewCampaignInput {
  categoryId: number;
  days: CampaignDays;
  budget: number;
}

// Plans and billing. Mirrors server/src/routes/provider/billing.ts and services/entitlements.ts.

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

export interface PlanPrice {
  billingCycle: BillingCycle;
  amount: number;
  iosProductId: string | null;
  androidProductId: string | null;
  availableOnWeb: boolean;
}

export interface Plan {
  id: number;
  code: PlanCode;
  name: string;
  price: number;
  leadAccessLimit: number | null;
  photoLimit: number | null;
  featuresJson: string[] | null;
  badge?: { id: number; name: string } | null;
  prices: PlanPrice[];
}

export interface Transaction {
  id: number;
  type: string;
  gateway: "manual" | "razorpay" | "app_store" | "play_store";
  amount: number;
  currency: string;
  status: string;
  gatewayTxnId: string | null;
  invoiceNumber: string | null;
  createdAt: string;
}

export interface Invoice {
  id: number;
  number: string;
  total: number;
  tax: number;
  status: "issued" | "void";
  issuedAt: string;
  /** Signed link, valid for an hour; opens the PDF in the browser. */
  pdfUrl: string;
}

/** GET /provider/billing */
export interface BillingResponse {
  state: PlanState;
  plans: Plan[];
  transactions: Transaction[];
  invoices: Invoice[];
  /** Where the live plan is managed. Only store plans (or none) can be bought or changed in the app. */
  managedIn: "web" | "app_store" | "play_store" | "support" | null;
  manageUrl: string | null;
  store: { enabled: boolean };
}
