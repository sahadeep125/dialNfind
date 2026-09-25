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

export interface Plan {
  id: number;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  leadAccessLimit: number | null;
  analyticsEnabled: boolean;
  featuresJson: string[] | null;
  badge?: { id: number; name: string } | null;
}

export interface CurrentSubscription {
  id: number;
  planId: number;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  plan: Plan;
}

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  status: string;
  gatewayTxnId: string | null;
  createdAt: string;
}

/** GET /provider/subscription */
export interface SubscriptionResponse {
  current: CurrentSubscription | null;
  plans: Plan[];
  transactions: Transaction[];
}

/** Payments are simulated until a gateway is connected; the server says so with this flag. */
export interface PaymentResult {
  simulated: boolean;
}
