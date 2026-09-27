import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { HeaderAccount } from "./header-account";
import { MobileNav } from "./mobile-nav";

export const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/search", label: "Search" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-lg">
      <div className="container-wide flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
            <Link href="/claim">
              <Store />
              List your business
            </Link>
          </Button>
          <HeaderAccount />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
