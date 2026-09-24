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

export interface Plan {
  id: number;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
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
