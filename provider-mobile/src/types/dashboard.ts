// GET /provider/dashboard: headline numbers, a daily series and recent activity for the home tab.
import type { ChecklistItem, ProviderStatus, VerificationStatus } from "@/types";
import type { LeadChannel } from "@/types/leads";

export type DashboardDays = 7 | 30 | 90;

export interface DashboardProvider {
  id: number;
  slug: string;
  businessName: string;
  status: ProviderStatus;
  isAvailable: boolean;
  avgRating: number;
  totalReviews: number;
  verificationStatus: VerificationStatus;
  profileCompletenessPct: number;
  rankingScore: number;
  responseSignal: number | null;
  favorites: number;
  city: string;
}

export interface DashboardTotals {
  leads: number;
  calls: number;
  whatsapp: number;
  /** Null on Free: views, trends and conversion are analytics (Pro). */
  views: number | null;
  impressions: number | null;
  leadsChangePct: number | null;
  viewsChangePct: number | null;
  conversionPct: number | null;
  unrepliedReviews: number;
}

export interface DashboardSeriesPoint {
  /** YYYY-MM-DD in UTC. */
  date: string;
  calls: number;
  whatsapp: number;
  views: number;
  impressions: number;
}

export interface DashboardRecentLead {
  id: number;
  channel: LeadChannel;
  createdAt: string;
  customerName: string;
  service: string | null;
  description: string | null;
  /** Past the plan's monthly lead limit: details hidden until the provider upgrades. */
  locked: boolean;
}

export interface DashboardRecentReview {
  id: number;
  rating: number;
  reviewText: string | null;
  providerReply: string | null;
  createdAt: string;
  author: string;
}

export interface DashboardSubscription {
  planName: string;
  status: string;
  endDate: string | null;
  autoRenew: boolean;
}

export interface Dashboard {
  provider: DashboardProvider;
  analyticsLocked: boolean;
  totals: DashboardTotals;
  ranking: { position: number; outOf: number } | null;
  series: DashboardSeriesPoint[];
  checklist: ChecklistItem[];
  recentLeads: DashboardRecentLead[];
  recentReviews: DashboardRecentReview[];
  subscription: DashboardSubscription | null;
}

export type ChartMetric = "leads" | "views";
