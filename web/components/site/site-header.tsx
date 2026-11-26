import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { HeaderAccount } from "./header-account";
import { HeaderSearch } from "./header-search";
import { MobileNav } from "./mobile-nav";

export const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/guides", label: "Guides", minor: true },
  { href: "/#how", label: "How it works" },
  { href: "/help", label: "Help", minor: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
      <div className="container-wide flex h-16 items-center gap-4 lg:gap-6">
        <Logo />
        <div className="group/hdr flex min-w-0 flex-1 items-center gap-6">
          <HeaderSearch />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                // With the slim search in the header, the lesser links step aside until there is room.
                className={`${"minor" in l && l.minor ? "xl:max-[1399px]:group-has-[form]/hdr:hidden " : ""}whitespace-nowrap rounded-md px-3 py-2 text-[15px] font-medium text-foreground/70 transition-colors hover:bg-muted/70 hover:text-foreground`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/claim"
            className="hidden whitespace-nowrap rounded-md border-[1.5px] border-ink-rule/80 px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background xl:inline-flex"
          >
            List your business
          </Link>
          <Link href="/search" aria-label="Find a pro" className="flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted md:hidden">
            <Search className="size-5" aria-hidden />
          </Link>
          <HeaderAccount />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
