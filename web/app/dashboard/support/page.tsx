import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { NewTicketButton } from "@/components/dashboard/support";
import { TICKET_STATUS, type TicketStatus } from "./status";

export const metadata: Metadata = { title: "Help and support" };

interface Ticket {
  id: number;
  reference: string;
  subject: string;
  status: TicketStatus;
  lastActivityAt: string;
}

export default async function SupportPage() {
  await requireSession("/dashboard/support");
  const { tickets } = await api<{ tickets: Ticket[] }>("/support/tickets", { query: { pageSize: 50 } });
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-deep">Help and support</h1>
          <p className="mt-1 text-muted-foreground">Your conversations with the DialNFind team.</p>
        </div>
        <NewTicketButton />
      </div>
      {tickets.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <LifeBuoy className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold">No requests yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Having trouble with your account or a listing? Send us a request and we will help.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y overflow-hidden rounded-2xl border bg-card">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/dashboard/support/${t.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{t.subject}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.reference} · updated {formatRelative(t.lastActivityAt)}
                  </div>
                </div>
                <Badge variant={TICKET_STATUS[t.status].variant}>{TICKET_STATUS[t.status].label}</Badge>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
