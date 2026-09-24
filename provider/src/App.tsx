import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/layouts/app-layout";
import { OnboardingLayout } from "@/layouts/onboarding-layout";
import { LoginPage, RegisterPage } from "@/pages/auth";
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

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
}

/** Signed-in users without a business profile are sent to onboarding. */
function RequireProvider() {
  const { providerState } = useAuth();
  if (!providerState?.provider) return <Navigate to="/start" replace />;
  return <Outlet />;
}

function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
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
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
