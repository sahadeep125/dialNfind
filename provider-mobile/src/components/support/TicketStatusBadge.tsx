import { AppBadge } from "@/components/design-system";
import type { TicketStatus } from "@/types/support";

import { TICKET_STATUS } from "./ticketMeta";

interface Props {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: Props) {
  const meta = TICKET_STATUS[status] ?? TICKET_STATUS.open;
  return <AppBadge label={meta.label} tone={meta.tone} />;
}
