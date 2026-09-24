import { Outlet } from "react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function OnboardingLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,oklch(0.965_0.02_266),transparent_40%)]">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut /> Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
