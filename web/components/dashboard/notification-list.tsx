"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, LifeBuoy, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/site/session-provider";
import { clientApi } from "@/lib/client";
import { formatRelative } from "@/lib/format";
import { notificationHref } from "@/lib/notification-href";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  dataJson: unknown;
  createdAt: string;
}

const ICONS: Record<string, typeof Bell> = { review_reply: MessageSquareReply, support: LifeBuoy };

/** The notification list: each one opens what it is about and is marked read; "Mark all read" clears the rest. */
export function NotificationList({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const { setUnread } = useSession();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => !n.isRead).length;

  async function markRead(ids?: number[]) {
    const before = items;
    const next = items.map((n) => (!ids || ids.includes(n.id) ? { ...n, isRead: true } : n));
    setItems(next);
    setUnread(next.filter((n) => !n.isRead).length);
    try {
      await clientApi("/me/notifications/read", { method: "POST", body: JSON.stringify(ids ? { ids } : {}) });
    } catch {
      setItems(before);
      setUnread(before.filter((n) => !n.isRead).length);
      toast.error("Could not update your notifications");
    }
  }

  return (
    <>
      {unread > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{unread} unread</p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await markRead();
              setBusy(false);
              router.refresh();
            }}
          >
            <CheckCheck /> Mark all read
          </Button>
        </div>
      )}
      <ul className="mt-4 divide-y rounded-2xl border bg-card">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          const href = notificationHref(n.type, n.dataJson);
          const content = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">
                    {!n.isRead && <span className="sr-only">Unread: </span>}
                    {n.title}
                  </span>
                  {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                </div>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <div className="mt-1 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</div>
              </div>
            </>
          );
          const rowClass = cn("flex gap-3 p-4", !n.isRead && "bg-accent/40");
          return (
            <li key={n.id}>
              {href ? (
                <Link
                  href={href}
                  className={cn(rowClass, "transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none")}
                  onClick={() => {
                    if (!n.isRead) void markRead([n.id]);
                  }}
                >
                  {content}
                </Link>
              ) : (
                <div className={rowClass}>
                  {content}
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" className="self-start" onClick={() => void markRead([n.id])}>
                      Mark read
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
