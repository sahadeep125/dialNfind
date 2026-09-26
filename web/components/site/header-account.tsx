"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "./session-provider";
import { UserMenu } from "./user-menu";

/** Top-right of the header: sign-in buttons, or the notification bell and account menu. */
export function HeaderAccount() {
  const { user, unread, loading } = useSession();
  if (loading) return <Skeleton className="size-9 rounded-full" aria-hidden />;
  if (!user) {
    return (
      <div className="hidden items-center gap-2 sm:flex">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }
  return (
    <>
      <Button asChild variant="ghost" size="icon" className="relative rounded-full">
        <Link href="/dashboard/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span aria-hidden className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </Button>
      <UserMenu user={{ name: user.name, email: user.email, role: user.role, profilePhotoUrl: user.profilePhotoUrl }} />
    </>
  );
}
