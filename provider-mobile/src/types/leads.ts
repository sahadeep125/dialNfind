// GET /provider/leads: customers who tapped Call or WhatsApp on the listing.
import type { Paged } from "@/types";

export type LeadChannel = "call" | "whatsapp";

export type LeadFilter = "all" | LeadChannel;

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
  /** Past the plan's monthly lead limit: details hidden until the provider upgrades. */
  locked: boolean;
  /** Not sent by the API today; the row shows call-back actions only when it is present. */
  customerPhone?: string | null;
}

export type LeadsPage = Paged & { leads: Lead[]; leadLimit: number | null };
