import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  BadgeCheck,
  CreditCard,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareWarning,
  PhoneIncoming,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Store,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type Module } from "@/lib/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notifications";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface Overview {
  providers: number;
  activeProviders: number;
  pendingProviders: number;
  pendingClaims: number;
  pendingVerifications: number;
  openFlags: number;
  users: number;
  customers: number;
  leads30: number;
  reviews30: number;
  revenue30: number;
  activeSponsored: number;
  openTickets: number;
  activeSubscriptions: number;
  leadSeries: { date: string; value: number }[];
  signupSeries: { date: string; value: number }[];
}

export function useOverview() {
  return useQuery({ queryKey: ["overview"], queryFn: () => api<Overview>("/admin/overview"), refetchInterval: 60_000 });
}

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; module?: Module; count?: (o: Overview) => number; end?: boolean };

const NAV: { title: string; items: Item[] }[] = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/analytics", label: "Analytics", icon: BarChart3, module: "analytics" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/providers", label: "Providers", icon: Store, module: "providers", count: (o) => o.pendingProviders },
      { to: "/claims", label: "Listing claims", icon: KeyRound, module: "providers", count: (o) => o.pendingClaims },
      { to: "/verifications", label: "Verification", icon: BadgeCheck, module: "verifications", count: (o) => o.pendingVerifications },
      { to: "/categories", label: "Categories", icon: FolderTree, module: "categories" },
      { to: "/badges", label: "Badges", icon: Award, module: "categories" },
      { to: "/reviews", label: "Reviews and reports", icon: MessageSquareWarning, module: "reviews", count: (o) => o.openFlags },
      { to: "/leads", label: "Leads", icon: PhoneIncoming, module: "leads" },
    ],
  },
  {
    title: "Revenue",
    items: [
      { to: "/plans", label: "Plans and billing", icon: CreditCard, module: "plans" },
      { to: "/promotions", label: "Promotions", icon: Megaphone, module: "promotions" },
    ],
  },
  {
    title: "People",
    items: [
      { to: "/users", label: "Users", icon: Users, module: "users" },
      { to: "/support", label: "Support tickets", icon: LifeBuoy, module: "support", count: (o) => o.openTickets },
      { to: "/announcements", label: "Announcements", icon: Send, module: "notifications" },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings, module: "settings" },
      { to: "/team", label: "Team and roles", icon: UsersRound, module: "team" },
      { to: "/audit", label: "Audit log", icon: ScrollText, module: "audit" },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const { data: overview } = useOverview();
  return (
    <nav className="space-y-6">
      {NAV.map((group) => {
        const items = group.items.filter((i) => !i.module || can(i.module));
        if (!items.length) return null;
        return (
          <div key={group.title}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.title}</div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const count = overview && item.count ? item.count(overview) : 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
                      )
                    }
                  >
                    <item.icon className="size-4" /> {item.label}
                    {count > 0 && <span className="ml-auto rounded-full bg-[oklch(0.76_0.15_72)] px-1.5 text-[11px] font-bold leading-5 text-brand-deep">{count > 99 ? "99+" : count}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function AppLayout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col gap-8 overflow-y-auto bg-brand-deep px-4 py-6">
      <Logo light className="px-2" />
      <SidebarNav onNavigate={() => setOpen(false)} />
      <div className="mt-auto flex items-center gap-2 rounded-xl bg-white/8 p-3 text-xs text-white/70">
        <ShieldCheck className="size-4 shrink-0" />
        <span className="truncate">{user?.role === "super_admin" ? "Super admin, full access" : `${user?.adminRole?.name ?? "Team member"}`}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-lg md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 p-0 [&>button]:text-white">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 font-semibold lg:hidden">DialNFind Admin</div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-accent-foreground outline-none" aria-label="Account menu">
                {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" className="size-full object-cover" /> : initials(user?.name ?? "")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="truncate">{user?.name}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <UserCircle /> My account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
