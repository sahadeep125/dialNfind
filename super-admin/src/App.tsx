import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth, type Module } from "@/lib/auth";
import { AppLayout } from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { AnalyticsPage } from "@/pages/analytics";
import { ProviderDetailPage, ProvidersPage } from "@/pages/providers";
import { ClaimsPage } from "@/pages/claims";
import { VerificationsPage } from "@/pages/verifications";
import { CategoriesPage } from "@/pages/categories";
import { BadgesPage } from "@/pages/badges";
import { ReviewsPage } from "@/pages/reviews";
import { LeadsPage } from "@/pages/leads";
import { PlansPage } from "@/pages/plans";
import { PromotionsPage } from "@/pages/promotions";
import { UsersPage } from "@/pages/users";
import { TicketDetailPage, TicketsPage } from "@/pages/support";
import { AnnouncementsPage } from "@/pages/announcements";
import { PluginsPage, SettingsPage } from "@/pages/settings";
import { TeamPage } from "@/pages/team";
import { AuditPage } from "@/pages/audit";
import { AccountPage } from "@/pages/account";

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

function NoAccess() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-brand-deep">This account has no admin access</h1>
      <p className="mt-2 max-w-md text-muted-foreground">The admin console is only for the DialNFind team. Ask the super admin to add you to the team, or sign in with a different account.</p>
      <Button className="mt-6" onClick={signOut}>
        Sign in with another account
      </Button>
    </div>
  );
}

function RequireStaff() {
  const { user, loading, denied } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (denied) return <NoAccess />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
}

function RequireModule({ module }: { module: Module }) {
  const { can } = useAuth();
  if (!can(module)) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <ShieldAlert className="size-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">Your role does not include this section</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ask the super admin if you need access.</p>
      </div>
    );
  }
  return <Outlet />;
}

function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

const guarded: [Module, [string, React.ReactNode][]][] = [
  ["analytics", [["/analytics", <AnalyticsPage />]]],
  [
    "providers",
    [
      ["/providers", <ProvidersPage />],
      ["/providers/:id", <ProviderDetailPage />],
      ["/claims", <ClaimsPage />],
    ],
  ],
  ["verifications", [["/verifications", <VerificationsPage />]]],
  [
    "categories",
    [
      ["/categories", <CategoriesPage />],
      ["/badges", <BadgesPage />],
    ],
  ],
  ["reviews", [["/reviews", <ReviewsPage />]]],
  ["leads", [["/leads", <LeadsPage />]]],
  ["plans", [["/plans", <PlansPage />]]],
  ["promotions", [["/promotions", <PromotionsPage />]]],
  ["users", [["/users", <UsersPage />]]],
  [
    "support",
    [
      ["/support", <TicketsPage />],
      ["/support/:id", <TicketDetailPage />],
    ],
  ],
  ["notifications", [["/announcements", <AnnouncementsPage />]]],
  [
    "settings",
    [
      ["/settings", <SettingsPage />],
      ["/plugins", <PluginsPage />],
    ],
  ],
  ["team", [["/team", <TeamPage />]]],
  ["audit", [["/audit", <AuditPage />]]],
];

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<RequireStaff />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/account" element={<AccountPage />} />
          {guarded.map(([module, routes]) => (
            <Route key={module} element={<RequireModule module={module} />}>
              {routes.map(([path, el]) => (
                <Route key={path} path={path} element={el} />
              ))}
            </Route>
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
