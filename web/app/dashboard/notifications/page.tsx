import type { Metadata } from "next";
import { Bell, MessageSquareReply } from "lucide-react";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MarkNotificationsRead } from "@/components/dashboard/mark-read";

export const metadata: Metadata = { title: "Notifications" };

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default async function NotificationsPage() {
  await requireSession("/dashboard/notifications");
  const { notifications, unread } = await api<{ notifications: Notification[]; unread: number }>("/me/notifications");
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-deep">Notifications</h1>
      <p className="mt-1 text-muted-foreground">Replies to your reviews and updates about your account.</p>
      {unread > 0 && <MarkNotificationsRead />}
      {notifications.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Bell className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold">Nothing new</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">When a provider replies to your review, you will see it here.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-2xl border bg-card">
          {notifications.map((n) => {
            const Icon = n.type === "review_reply" ? MessageSquareReply : Bell;
            return (
              <li key={n.id} className={cn("flex gap-3 p-4", !n.isRead && "bg-accent/40")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{n.title}</span>
                    {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-1 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
