import Link from "next/link";
import type { CategoryArea } from "@/lib/category-areas";
import { areaHref } from "@/lib/category-areas";
import { SEO_CITY } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";

/** The searches people in the city make most, written the way they type them. Each opens the page that answers it. */
const NEAR_ME = [
  { label: "Mixer grinder repair near me", href: serviceHref("home-appliances", "mixer-grinder-repair") },
  { label: "AC repair near me", href: serviceHref("home-appliances", "ac-repair-and-service") },
  { label: "Washing machine repair near me", href: serviceHref("home-appliances", "washing-machine-repair") },
  { label: "Fridge repair near me", href: serviceHref("home-appliances", "refrigerator-repair") },
  { label: "Electrician near me", href: serviceHref("electricians") },
  { label: "Plumber near me", href: serviceHref("plumbing") },
  { label: "Mobile repair shop near me", href: serviceHref("electronics-repair", "mobile-phone-repair") },
  { label: "Bike service centre near me", href: serviceHref("vehicle-repair", "bike-service") },
  { label: "Beauty parlour near me", href: serviceHref("beauty-salon") },
  { label: "Home tutor near me", href: serviceHref("tutors") },
  { label: "Packers and movers near me", href: serviceHref("packers-movers") },
  { label: "Locksmith near me", href: serviceHref("locksmith") },
];

/** Plain text links, grouped: services by name, then services by neighbourhood. Good for visitors and for crawlers. */
export function PopularSearches({ areas }: { areas: CategoryArea[] }) {
  const byArea = [...areas].sort((a, b) => b.providers - a.providers).slice(0, 12);
  // The para band above already lists areas; here they are a compact list for people scanning the footer.
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <h3 className="text-base font-bold">Repairs and services in {SEO_CITY}</h3>
        <ul className="mt-4 grid gap-x-6 gap-y-2.5 text-[15px] sm:grid-cols-2">
          {NEAR_ME.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="link-draw text-foreground/80 hover:text-foreground">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {byArea.length > 0 && (
        <div>
          <h3 className="text-base font-bold">By neighbourhood</h3>
          <ul className="mt-4 grid gap-x-6 gap-y-2.5 text-[15px] sm:grid-cols-2">
            {byArea.map((a) => (
              <li key={`${a.category}-${a.slug}`}>
                <Link href={areaHref(a.category, a.slug)} className="link-draw text-foreground/80 hover:text-foreground">
                  {a.categoryName} in {a.area}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
