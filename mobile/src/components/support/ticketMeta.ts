import type { BadgeTone } from "@/components/design-system";
import type { SelectOption } from "@/types";
import type { TicketCategory, TicketStatus } from "@/types/support";

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "warning" },
  pending: { label: "Awaiting your reply", tone: "brand" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

export const TICKET_CATEGORIES: SelectOption<TicketCategory>[] = [
  { value: "account", label: "Account and sign in" },
  { value: "report", label: "Report a provider or review" },
  { value: "technical", label: "Something is not working" },
  { value: "general", label: "Something else" },
];

export const MAX_ATTACHMENTS = 5;
