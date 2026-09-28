import Link from "next/link";
import { BadgeCheck, Mail, MapPin, Phone, PhoneCall, Star } from "lucide-react";
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
      { href: "/guides", label: "Guides" },
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

const PROMISES = [
  { icon: BadgeCheck, title: "Visible verification", text: "Every profile shows which checks were done" },
  { icon: Star, title: "Real reviews", text: "Written by signed-in customers" },
  { icon: PhoneCall, title: "No booking fees", text: "Call or WhatsApp the pro directly" },
];

export async function SiteFooter() {
  const [config, services] = await Promise.all([getAppConfig(), popularServices()]);
  const columns = services.length ? [{ title: "Popular services", links: services }, ...COLUMNS] : COLUMNS;
  return (
    <footer className="mt-16 bg-brand-deep text-white/70 md:mt-20">
      <div className="border-b border-white/10">
        <ul className="container-wide grid gap-6 py-8 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className="flex items-center gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
                <p.icon className="size-5" aria-hidden />
              </span>
              <div>
                <div className="text-sm font-semibold text-white">{p.title}</div>
                <div className="text-sm">{p.text}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="container-wide grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed">
            Find trusted local service professionals near you, compare them in seconds, and call the one you prefer.
          </p>
          <div className="space-y-2 text-sm">
            {config.support_email && (
              <a href={`mailto:${config.support_email}`} className="flex items-center gap-2 transition-colors hover:text-white">
                <Mail className="size-4" aria-hidden /> {config.support_email}
              </a>
            )}
            {config.support_phone && (
              <a href={telHref(config.support_phone)} className="flex items-center gap-2 transition-colors hover:text-white">
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
            <h3 className="mb-4 text-sm font-semibold text-white">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-wide flex flex-col gap-2 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} DialNFind. All rights reserved.</p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/terms" className="hover:text-white">Terms of use</Link>
            <Link href="/privacy" className="hover:text-white">Privacy policy</Link>
          </nav>
          <p>
            Unclaimed listings are compiled from public business data, including{" "}
            <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-white" rel="noopener noreferrer" target="_blank">
              &copy; OpenStreetMap contributors
            </a>{" "}
            and Overture Maps. Businesses can claim them; anyone can report one from its profile page.
          </p>
        </div>
      </div>
    </footer>
  );
}
