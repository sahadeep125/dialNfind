import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Headset } from "lucide-react";
import { apiOrNull } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Attachments, CloseTicketButton, TicketReply } from "@/components/dashboard/support";
import { TICKET_STATUS, type TicketStatus } from "../status";

export const metadata: Metadata = { title: "Support request" };

interface TicketDetail {
  ticket: { id: number; reference: string; subject: string; status: TicketStatus; createdAt: string };
  messages: { id: number; body: string; attachments: string[]; fromStaff: boolean; createdAt: string; authorName: string }[];
}

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/dashboard/support/${id}`);
  if (!/^\d+$/.test(id)) notFound();
  const data = await apiOrNull<TicketDetail>(`/support/tickets/${id}`);
  if (!data) notFound();
  const t = data.ticket;
  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/support" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All requests
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-deep">{t.subject}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.reference} · opened {formatDate(t.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={TICKET_STATUS[t.status].variant}>{TICKET_STATUS[t.status].label}</Badge>
          {t.status !== "closed" && <CloseTicketButton id={t.id} />}
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {data.messages.map((m) => (
          <div key={m.id} className={cn("rounded-2xl border p-4", m.fromStaff ? "bg-accent/60" : "bg-card")}>
            <div className="flex items-center gap-2 text-sm">
              {m.fromStaff && (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Headset className="size-3.5" />
                </span>
              )}
              <span className="font-medium">{m.fromStaff ? m.authorName : "You"}</span>
              <span className="ml-auto text-xs text-muted-foreground">{formatRelative(m.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{m.body}</p>
            {m.attachments.length > 0 && <Attachments urls={m.attachments} />}
          </div>
        ))}
        {t.status === "closed" ? (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">This request is closed. Start a new one from Help and support if you still need help.</div>
        ) : (
          <TicketReply id={t.id} />
        )}
      </div>
    </div>
  );
}
