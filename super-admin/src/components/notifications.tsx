import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Bell, CreditCard, LifeBuoy, Megaphone, MessageSquare, PhoneIncoming, Store } from "lucide-react";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  dataJson?: { ticketId?: number } | null;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lead: PhoneIncoming,
  review: MessageSquare,
  verification: BadgeCheck,
  claim: Store,
  listing: Store,
  subscription: CreditCard,
  sponsored: Megaphone,
  support: LifeBuoy,
};

export function NotificationBell() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: Notification[]; unread: number }>("/me/notifications"),
    refetchInterval: 60_000,
  });
  const markRead = useMutation({
    mutationFn: () => api("/me/notifications/read", { method: "POST", json: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = data?.unread ?? 0;

  return (
    <Popover onOpenChange={(open) => !open && unread > 0 && markRead.mutate()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={unread ? `${unread} unread notifications` : "Notifications"}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold">Notifications</span>
          {unread > 0 && (
            <button type="button" className="cursor-pointer text-xs font-medium text-primary" onClick={() => markRead.mutate()}>
              Mark all as read
            </button>
          )}
        </div>
        <ul className="max-h-96 divide-y overflow-y-auto">
          {!data?.notifications.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">You are all caught up.</li>}
          {data?.notifications.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <li key={n.id} className={cn(!n.isRead && "bg-accent/50")}>
                <Row to={n.type === "support" && n.dataJson?.ticketId ? `/support/${n.dataJson.ticketId}` : undefined}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <div className="mt-1 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</div>
                  </div>
                </Row>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function Row({ to, children }: { to?: string; children: React.ReactNode }) {
  const cls = "flex gap-3 px-4 py-3";
  return to ? (
    <Link to={to} className={cn(cls, "hover:bg-muted/60")}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}
