import Link from "next/link";
import {
  AirVent,
  ArrowRight,
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
  { problem: "Mixer grinder stopped running", service: "Mixer grinder repair", icon: Blender, href: serviceHref("home-appliances", "mixer-grinder-repair") },
  { problem: "AC not cooling", service: "AC repair & service", icon: AirVent, href: serviceHref("home-appliances", "ac-repair-and-service") },
  { problem: "Fridge warm inside", service: "Refrigerator repair", icon: Refrigerator, href: serviceHref("home-appliances", "refrigerator-repair") },
  { problem: "Washing machine won't spin", service: "Washing machine repair", icon: WashingMachine, href: serviceHref("home-appliances", "washing-machine-repair") },
  { problem: "Chimney or gas stove trouble", service: "Kitchen chimney service", icon: CookingPot, href: serviceHref("home-appliances", "kitchen-chimney-service") },
  { problem: "No hot water", service: "Geyser repair", icon: Heater, href: serviceHref("home-appliances", "geyser-repair") },
  { problem: "Cracked phone screen", service: "Mobile repair", icon: Smartphone, href: serviceHref("electronics-repair", "mobile-phone-repair") },
  { problem: "TV has sound, no picture", service: "TV repair", icon: Tv, href: serviceHref("electronics-repair", "tv-repair") },
  { problem: "Laptop slow or won't start", service: "Laptop repair", icon: Laptop, href: serviceHref("electronics-repair", "laptop-and-computer-repair") },
  { problem: "Power cut in one room", service: "Electrician", icon: PlugZap, href: serviceHref("electricians") },
  { problem: "Tap or pipe leaking", service: "Plumber", icon: Droplets, href: serviceHref("plumbing") },
  { problem: "Bike due for service", service: "Bike service", icon: Bike, href: serviceHref("vehicle-repair", "bike-service") },
  { problem: "Car making a noise", service: "Car mechanic", icon: Wrench, href: serviceHref("vehicle-repair", "car-service") },
  { problem: "Haircut or bridal makeup", service: "Beauty parlour", icon: Scissors, href: serviceHref("beauty-salon") },
  { problem: "Child needs a tutor", service: "Home tutor", icon: GraduationCap, href: serviceHref("tutors") },
  { problem: "Shifting house", service: "Packers & movers", icon: Truck, href: serviceHref("packers-movers") },
];

/** The problem index: a ruled, two-column list of everyday problems, each leading to the people who fix it. */
export function FixGrid() {
  return (
    <ul className="grid border-t border-ink-rule/80 md:grid-cols-2 md:gap-x-10 xl:gap-x-16">
      {NEEDS.map((n) => (
        <li key={n.href} className="border-b">
          <Link href={n.href} className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 py-4 transition-colors md:py-5">
            <span className="flex size-10 items-center justify-center rounded-md bg-card text-primary ring-1 ring-border transition-colors group-hover:bg-cta group-hover:text-cta-foreground group-hover:ring-cta">
              <n.icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-semibold leading-snug tracking-[-0.01em] md:text-xl">{n.problem}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{n.service}</span>
            </span>
            <ArrowRight className="size-5 text-foreground/40 transition-[transform,color] group-hover:translate-x-1 group-hover:text-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
