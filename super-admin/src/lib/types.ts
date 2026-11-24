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
  seoScore: number;
  seoNoIndex: boolean;
  createdAt: string;
  user: { name: string; email: string } | null;
  services: { category: { name: string } }[];
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

