"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, History, LayoutDashboard, LifeBuoy, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/contacts", label: "Recent contacts", icon: History },
  { href: "/dashboard/reviews", label: "My reviews", icon: MessageSquare },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/support", label: "Help and support", icon: LifeBuoy },
  { href: "/dashboard/account", label: "Account", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((item) => {
        const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
