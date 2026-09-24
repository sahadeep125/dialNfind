export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export const TICKET_STATUS: Record<TicketStatus, { label: string; variant: "warning" | "secondary" | "success" | "muted" }> = {
  open: { label: "Open", variant: "warning" },
  pending: { label: "Awaiting your reply", variant: "secondary" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "muted" },
};
