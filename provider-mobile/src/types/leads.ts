// GET /provider/leads: customers who tapped Call or WhatsApp on the listing.
import type { Paged } from "@/types";

export type LeadChannel = "call" | "whatsapp";

export type LeadFilter = "all" | LeadChannel;

/** The provider's own follow-up on a lead. */
export type LeadStatus = "new" | "contacted" | "won" | "lost";

export interface LeadFilters {
  channel: LeadFilter;
  status: LeadStatus | "all";
  /** Matches the customer's name, the service or their message. */
  q: string;
}

export type LeadSource = "search" | "profile" | "category_browse" | "ai_match";

export interface Lead {
  id: number;
  channel: LeadChannel;
  source: LeadSource | string;
  description: string | null;
  createdAt: string;
  customerName: string;
  isGuest: boolean;
  service: string | null;
  customerReportedResponse: boolean | null;
  reviewRating: number | null;
  details: { label: string; value: string }[];
  /** A report the provider made about this contact (spam, fake, wrong number) and its outcome. */
  disputeStatus: "none" | "open" | "accepted" | "rejected";
  disputeReason: string | null;
  providerStatus: LeadStatus;
  /** Private to the provider. */
  providerNote: string | null;
  /** Signed-in customers only. */
  customerPhone: string | null;
}

export type LeadsPage = Paged & { leads: Lead[] };
