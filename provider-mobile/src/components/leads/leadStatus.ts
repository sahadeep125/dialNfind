import type { BadgeTone } from "@/components/design-system/AppBadge";
import type { Lead, LeadStatus } from "@/types/leads";

export const LEAD_STATUS: Record<LeadStatus, { label: string; tone: BadgeTone }> = {
  new: { label: "New", tone: "brand" },
  contacted: { label: "Contacted", tone: "warning" },
  won: { label: "Won", tone: "success" },
  lost: { label: "Lost", tone: "neutral" },
};

export const LEAD_STATUS_OPTIONS = (Object.keys(LEAD_STATUS) as LeadStatus[]).map((value) => ({
  value,
  label: LEAD_STATUS[value].label,
}));

/** Days after contact during which a lead can be reported as spam or a wrong number (the API's limit). */
export const DISPUTE_DAYS = 30;

export function isReportable(lead: Lead): boolean {
  return lead.disputeStatus === "none" && Date.now() - new Date(lead.createdAt).getTime() <= DISPUTE_DAYS * 86_400_000;
}
