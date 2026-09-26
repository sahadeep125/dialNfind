// Help-desk tickets. Mirrors server/src/routes/support.ts.

import type { Paged } from "@/types";

export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export type TicketCategory =
  "general" | "account" | "listing" | "billing" | "verification" | "report" | "technical";

export interface Ticket {
  id: number;
  reference: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  lastActivityAt: string;
  createdAt: string;
  _count?: { messages: number };
}

export interface TicketMessage {
  id: number;
  body: string;
  attachments: string[];
  fromStaff: boolean;
  createdAt: string;
  authorName: string;
}

/** GET /support/tickets */
export interface TicketPage extends Paged {
  tickets: Ticket[];
}

/** GET /support/tickets/:id */
export interface TicketDetail {
  ticket: Ticket;
  messages: TicketMessage[];
}

export interface NewTicketInput {
  category: TicketCategory;
  subject: string;
  message: string;
  attachments: string[];
}

export interface ReplyInput {
  body: string;
  attachments: string[];
}
