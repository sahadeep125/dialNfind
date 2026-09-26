import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { NotificationList, type NotificationItem } from "@/components/dashboard/notification-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireSession("/dashboard/notifications");
  const { notifications } = await api<{ notifications: NotificationItem[]; unread: number }>("/me/notifications");
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-deep">Notifications</h1>
      <p className="mt-1 text-muted-foreground">Replies to your reviews and updates about your account.</p>
      {notifications.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Bell className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold">Nothing new</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Replies to your reviews and updates on your support requests show up here.</p>
        </div>
      ) : (
        <NotificationList initial={notifications} />
      )}
    </div>
  );
}
