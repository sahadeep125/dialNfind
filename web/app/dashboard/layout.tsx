import { requireSession } from "@/lib/session";
import { initials } from "@/lib/format";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession("/dashboard");
  return (
    <div className="container-page py-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">{initials(user.name)}</span>
            <div className="min-w-0">
              <div className="truncate font-semibold">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <DashboardNav />
        </aside>
        <div className="min-w-0">
          {!user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}
          {children}
        </div>
      </div>
    </div>
  );
}
