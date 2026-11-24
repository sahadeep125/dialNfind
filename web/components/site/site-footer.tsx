import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./logo";
import { SocialIcon } from "./social-icons";
import { publicApi } from "@/lib/api";
import { getAppConfig } from "@/lib/app-config";
import { OFFICIAL_SOCIAL_LINKS } from "@/lib/config";
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

export async function SiteFooter() {
  const [config, services] = await Promise.all([getAppConfig(), popularServices()]);
  const columns = services.length ? [{ title: "Popular services", links: services }, ...COLUMNS] : COLUMNS;
  return (
    <footer className="mt-16 bg-brand-deep text-white/70 md:mt-20">
      <div className="container-wide grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed">
            KaajVa helps you find trusted electricians, plumbers, repair technicians and other local service professionals in Siliguri and North Bengal, compare them in seconds, and call the one you prefer.
          </p>
          <address className="space-y-2 text-sm not-italic">
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
            {config.info_email && config.info_email !== config.support_email && (
              <a href={`mailto:${config.info_email}`} className="flex items-center gap-2 transition-colors hover:text-white">
                <Mail className="size-4" aria-hidden /> {config.info_email}
              </a>
            )}
            {config.office_address && (
              <p className="flex items-start gap-2 whitespace-pre-line">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {config.office_address}
              </p>
            )}
          </address>
          <ul aria-label="KaajVa on social media" className="flex gap-2 pt-1">
            {OFFICIAL_SOCIAL_LINKS.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={`KaajVa on ${s.label}`}
                  className="flex size-11 items-center justify-center rounded-md text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <SocialIcon name={s.label} className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-4 text-sm font-semibold text-white">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-draw text-sm transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-wide space-y-3 py-6 text-xs text-white/55">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} KaajVa. All rights reserved.</p>
            <nav aria-label="Legal" className="flex gap-5">
              <Link href="/terms" className="link-draw hover:text-white">Terms of use</Link>
              <Link href="/privacy" className="link-draw hover:text-white">Privacy policy</Link>
            </nav>
          </div>
          <p className="max-w-4xl leading-relaxed">
            Unclaimed listings are compiled from public business data, including{" "}
            <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-white" rel="noopener noreferrer" target="_blank">
              &copy; OpenStreetMap contributors
            </a>{" "}
            and Overture Maps. Businesses can claim them; anyone can report one from its profile page. Photographs from Unsplash.
          </p>
        </div>
      </div>
    </footer>
  );
}
