import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Clock,
  CreditCard,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquare,
  PhoneIncoming,
  Store,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WEB_URL } from "@/lib/config";
import { initials } from "@/lib/format";
import type { ProviderProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/leads", label: "Leads", icon: PhoneIncoming },
      { to: "/reviews", label: "Reviews", icon: MessageSquare },
    ],
  },
  {
    title: "Business profile",
    items: [
      { to: "/profile", label: "Business details", icon: Store },
      { to: "/services", label: "Services and prices", icon: Wrench },
      { to: "/hours", label: "Working hours", icon: Clock },
      { to: "/areas", label: "Service areas", icon: MapPinned },
      { to: "/portfolio", label: "Photos", icon: Images },
      { to: "/verification", label: "Verification", icon: BadgeCheck },
    ],
  },
  { title: "Account", items: [{ to: "/subscription", label: "Plan and billing", icon: CreditCard }] },
];

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => api<{ provider: ProviderProfile }>("/provider/profile").then((r) => r.provider) });
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-6">
      {NAV.map((group) => (
        <div key={group.title}>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.title}</div>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
                  )
                }
              >
                <item.icon className="size-4" /> {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AvailabilityToggle() {
  const qc = useQueryClient();
  const { data } = useProfile();
  const mutation = useMutation({
    mutationFn: (isAvailable: boolean) => api("/provider/profile", { method: "PATCH", json: { isAvailable } }),
    onSuccess: (_d, isAvailable) => {
      toast.success(isAvailable ? "You are visible as available" : "Marked as unavailable. You will rank lower until you switch back.");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data) return null;
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-full border bg-card py-1.5 pl-3 pr-2 text-sm font-medium">
      <span className={cn("size-2 rounded-full", data.isAvailable ? "bg-success" : "bg-muted-foreground")} />
      <span className="hidden sm:inline">{data.isAvailable ? "Available for work" : "Unavailable"}</span>
      <Switch checked={data.isAvailable} onCheckedChange={(v) => mutation.mutate(v)} disabled={mutation.isPending} />
    </label>
  );
}

export function AppLayout() {
  const { user, providerState, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const provider = providerState?.provider;

  const sidebar = (
    <div className="flex h-full flex-col gap-8 bg-brand-deep px-4 py-6">
      <Logo light className="px-2" />
      <SidebarNav onNavigate={() => setOpen(false)} />
      {provider && (
        <a
          href={`${WEB_URL}/providers/${provider.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center gap-2 rounded-xl bg-white/8 p-3 text-sm text-white/80 hover:bg-white/12 hover:text-white"
        >
          <ExternalLink className="size-4" /> View public profile
        </a>
      )}
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
          <div className="min-w-0">
            <div className="truncate font-semibold">{provider?.businessName}</div>
            {provider?.status === "pending" && <div className="text-xs text-warning">Waiting for approval</div>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <AvailabilityToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground outline-none">
                {initials(user?.name ?? "")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate">{user?.name}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
