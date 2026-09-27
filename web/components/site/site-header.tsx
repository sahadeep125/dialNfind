import Link from "next/link";
import { Logo } from "./logo";
import { HeaderAccount } from "./header-account";
import { HeaderSearch } from "./header-search";
import { MobileNav } from "./mobile-nav";

export const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/guides", label: "Guides" },
  { href: "/#how", label: "How it works" },
  { href: "/help", label: "Help" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/85">
      <div className="container-wide flex h-16 items-center gap-4 lg:gap-6">
        <Logo />
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <HeaderSearch />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/claim"
            className="hidden whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-muted xl:inline-flex"
          >
            List your business
          </Link>
          <HeaderAccount />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
