import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { CloudOff, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/layouts/app-layout";
import { OnboardingLayout } from "@/layouts/onboarding-layout";
import { ForgotPasswordPage, LoginPage, RegisterPage } from "@/pages/auth";
import { AccountPage } from "@/pages/account";
import { LegalPage } from "@/pages/legal";
import { StartPage } from "@/pages/start";
import { ClaimPage } from "@/pages/claim";
import { OnboardingPage } from "@/pages/onboarding";
import { DashboardPage } from "@/pages/dashboard";
import { LeadsPage } from "@/pages/leads";
import { ReviewsPage } from "@/pages/reviews";
import { ProfilePage } from "@/pages/profile";
import { AreasPage, HoursPage, ServicesPage } from "@/pages/editors";
import { PortfolioPage } from "@/pages/portfolio";
import { VerificationPage } from "@/pages/verification";
import { SubscriptionPage } from "@/pages/subscription";
import { PromotePage } from "@/pages/promote";
import { SupportPage, SupportTicketPage } from "@/pages/support";
import { VerifyEmailPage } from "@/pages/verify-email";

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

/** Shown when the API cannot be reached, so an outage does not look like being signed out. */
function Unreachable() {
  const { refresh } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <CloudOff className="size-10 text-muted-foreground" />
      <h1 className="mt-5 text-2xl font-bold">We could not reach DialNFind</h1>
      <p className="mt-2 max-w-md text-muted-foreground">Check your connection. If it keeps happening, the service may be down for a moment.</p>
      <Button className="mt-6" onClick={() => void refresh()}>
        Try again
      </Button>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <SearchX className="size-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-bold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">The link may be old, or the page has moved.</p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/">Go to the dashboard</Link>
      </Button>
    </div>
  );
}

function RequireAuth() {
  const { user, loading, unreachable } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (unreachable) return <Unreachable />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!user.emailVerifiedAt) return <Navigate to="/verify-email" replace />;
  return <Outlet />;
}

/** Signed-in users without a business profile are sent to onboarding. */
function RequireProvider() {
  const { providerState } = useAuth();
  if (!providerState?.provider) return <Navigate to="/start" replace />;
  return <Outlet />;
}

function PublicOnly() {
  const { user, loading, unreachable } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (unreachable) return <Unreachable />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/terms" element={<LegalPage doc="terms" />} />
      <Route path="/privacy" element={<LegalPage doc="privacy" />} />
      <Route element={<RequireAuth />}>
        <Route element={<OnboardingLayout />}>
          <Route path="/start" element={<StartPage />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route element={<RequireProvider />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/hours" element={<HoursPage />} />
            <Route path="/areas" element={<AreasPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/promote" element={<PromotePage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/support/:id" element={<SupportTicketPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
