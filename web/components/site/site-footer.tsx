import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./logo";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/config";
import { formatPhone } from "@/lib/format";

const COLUMNS = [
  {
    title: "Popular services",
    links: [
      { href: "/services/electronics-repair?sub=tv-repair", label: "TV repair" },
      { href: "/services/home-appliances?sub=ac-repair-and-service", label: "AC repair" },
      { href: "/services/electricians", label: "Electricians" },
      { href: "/services/plumbing", label: "Plumbers" },
      { href: "/services/pest-control", label: "Pest control" },
      { href: "/services/cleaning", label: "Home cleaning" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/about#trust", label: "Trust and safety" },
      { href: "/contact", label: "Contact" },
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

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Find trusted local service professionals near you, compare them in seconds, and call the one you prefer.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 hover:text-foreground">
              <Mail className="size-4" /> {SUPPORT_EMAIL}
            </a>
            <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-2 hover:text-foreground">
              <Phone className="size-4" /> {formatPhone(SUPPORT_PHONE)}
            </a>
            <p className="flex items-center gap-2">
              <MapPin className="size-4" /> Siliguri, West Bengal
            </p>
          </div>
        </div>
        {COLUMNS.map((col) => (
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
          <p>Phone numbers are shown with each provider&apos;s consent. Report a listing from its profile page.</p>
        </div>
      </div>
    </footer>
  );
}
