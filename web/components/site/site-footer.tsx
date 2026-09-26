import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./logo";
import { publicApi } from "@/lib/api";
import { getAppConfig } from "@/lib/app-config";
import { OFFICE_REGION } from "@/lib/config";
import { formatPhone, telHref } from "@/lib/format";
import type { Category } from "@/lib/types";

const COLUMNS = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/about#trust", label: "Trust and safety" },
      { href: "/contact", label: "Contact" },
      { href: "/help", label: "Help centre" },
      { href: "/services", label: "All categories" },
    ],
  },
  {
    title: "For businesses",
    links: [
      { href: "/claim", label: "List your business" },
      { href: "/claim#claim", label: "Claim your listing" },
      { href: "/about#providers", label: "How listing works" },
    ],
  },
];

/** The busiest categories, so the footer follows what the admin team has set up. */
async function popularServices() {
  try {
    const { categories } = await publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] });
    return [...categories]
      .sort((a, b) => b.providerCount - a.providerCount)
      .slice(0, 6)
      .map((c) => ({ href: `/services/${c.slug}`, label: c.name }));
  } catch {
    return [];
  }
}

export async function SiteFooter() {
  const [config, services] = await Promise.all([getAppConfig(), popularServices()]);
  const columns = services.length ? [{ title: "Popular services", links: services }, ...COLUMNS] : COLUMNS;
  return (
    <footer className="mt-24 border-t bg-card">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Find trusted local service professionals near you, compare them in seconds, and call the one you prefer.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            {config.support_email && (
              <a href={`mailto:${config.support_email}`} className="flex items-center gap-2 hover:text-foreground">
                <Mail className="size-4" aria-hidden /> {config.support_email}
              </a>
            )}
            {config.support_phone && (
              <a href={telHref(config.support_phone)} className="flex items-center gap-2 hover:text-foreground">
                <Phone className="size-4" aria-hidden /> {formatPhone(config.support_phone)}
              </a>
            )}
            {OFFICE_REGION && (
              <p className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden /> {OFFICE_REGION}
              </p>
            )}
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-4 text-sm font-semibold">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} DialNFind. All rights reserved.</p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">Terms of use</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
          </nav>
          <p>Phone numbers are shown with each provider&apos;s consent. Report a listing from its profile page.</p>
        </div>
      </div>
    </footer>
  );
}
