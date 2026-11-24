import Link from "next/link";
import {
  AirVent,
  Bike,
  Blender,
  CookingPot,
  Droplets,
  GraduationCap,
  Heater,
  Laptop,
  PlugZap,
  Refrigerator,
  Scissors,
  Smartphone,
  Truck,
  Tv,
  WashingMachine,
  Wrench,
} from "lucide-react";
import { serviceHref } from "@/lib/service-href";

/**
 * "What do you need?" as the things people actually type into Google: the appliance or job, not our category
 * names. Each links to the service page that ranks for that search.
 */
const NEEDS = [
  { label: "Mixer grinder repair", icon: Blender, href: serviceHref("home-appliances", "mixer-grinder-repair") },
  { label: "AC repair & service", icon: AirVent, href: serviceHref("home-appliances", "ac-repair-and-service") },
  { label: "Fridge repair", icon: Refrigerator, href: serviceHref("home-appliances", "refrigerator-repair") },
  { label: "Washing machine repair", icon: WashingMachine, href: serviceHref("home-appliances", "washing-machine-repair") },
  { label: "Chimney & gas stove", icon: CookingPot, href: serviceHref("home-appliances", "kitchen-chimney-service") },
  { label: "Geyser repair", icon: Heater, href: serviceHref("home-appliances", "geyser-repair") },
  { label: "Mobile repair", icon: Smartphone, href: serviceHref("electronics-repair", "mobile-phone-repair") },
  { label: "TV repair", icon: Tv, href: serviceHref("electronics-repair", "tv-repair") },
  { label: "Laptop repair", icon: Laptop, href: serviceHref("electronics-repair", "laptop-and-computer-repair") },
  { label: "Electrician", icon: PlugZap, href: serviceHref("electricians") },
  { label: "Plumber", icon: Droplets, href: serviceHref("plumbing") },
  { label: "Bike service", icon: Bike, href: serviceHref("vehicle-repair", "bike-service") },
  { label: "Car mechanic", icon: Wrench, href: serviceHref("vehicle-repair", "car-service") },
  { label: "Beauty parlour", icon: Scissors, href: serviceHref("beauty-salon") },
  { label: "Home tutor", icon: GraduationCap, href: serviceHref("tutors") },
  { label: "Packers & movers", icon: Truck, href: serviceHref("packers-movers") },
];

export function FixGrid() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {NEEDS.map((n) => (
        <li key={n.href}>
          <Link
            href={n.href}
            className="group flex h-full items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-[15px] font-semibold leading-snug transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="icon-tile size-10 text-primary transition-colors group-hover:bg-cta group-hover:text-cta-foreground">
              <n.icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">{n.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
