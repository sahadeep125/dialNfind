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
  Tv,
  WashingMachine,
  Wrench,
} from "lucide-react";
import { serviceHref } from "@/lib/service-href";

/**
 * "What's the problem?" in the words people use when something breaks, each paired with the service that fixes
 * it and linked to the page that ranks for that search.
 */
const NEEDS = [
  { problem: "Mixer grinder stopped running", service: "Mixer grinder repair", icon: Blender, href: serviceHref("home-appliances", "mixer-grinder-repair") },
  { problem: "AC not cooling", service: "AC repair & service", icon: AirVent, href: serviceHref("home-appliances", "ac-repair-and-service") },
  { problem: "Fridge warm inside", service: "Fridge repair", icon: Refrigerator, href: serviceHref("home-appliances", "refrigerator-repair") },
  { problem: "Washing machine won't spin", service: "Washing machine repair", icon: WashingMachine, href: serviceHref("home-appliances", "washing-machine-repair") },
  { problem: "Chimney or gas stove trouble", service: "Chimney & gas stove", icon: CookingPot, href: serviceHref("home-appliances", "kitchen-chimney-service") },
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
];

/** A quiet list (two columns, three on wide screens): soft icon, the problem, the service in small type, and an arrow. No boxes. */
export function FixGrid() {
  return (
    <ul className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
      {NEEDS.map((n) => (
        <li key={n.href} className="border-b border-border">
          <Link href={n.href} className="group flex items-center gap-4 py-3.5">
            <span className="icon-tile size-11 text-primary transition-colors group-hover:bg-cta group-hover:text-cta-foreground">
              <n.icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug text-foreground md:text-base">{n.problem}</span>
              <span className="block text-sm text-muted-foreground">{n.service}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-foreground/30 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
