import {
  AirVent,
  Bug,
  Car,
  GraduationCap,
  Hammer,
  PaintRoller,
  Scissors,
  Sparkles,
  Truck,
  Tv,
  Wrench,
  Zap,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "electronics-repair": Tv,
  "home-appliances": AirVent,
  electricians: Zap,
  plumbing: Wrench,
  carpentry: Hammer,
  cleaning: Sparkles,
  "pest-control": Bug,
  painting: PaintRoller,
  "packers-movers": Truck,
  tutors: GraduationCap,
  "beauty-salon": Scissors,
  "vehicle-repair": Car,
};

/** Soft tinted background + strong foreground per category, all in the same lightness band. */
const TONES: Record<string, { bg: string; fg: string; hex: string }> = {
  "electronics-repair": { bg: "bg-[oklch(0.95_0.03_266)]", fg: "text-[oklch(0.5_0.2_266)]", hex: "oklch(0.55 0.2 266)" },
  "home-appliances": { bg: "bg-[oklch(0.95_0.035_220)]", fg: "text-[oklch(0.52_0.14_225)]", hex: "oklch(0.58 0.14 225)" },
  electricians: { bg: "bg-[oklch(0.96_0.05_85)]", fg: "text-[oklch(0.55_0.13_70)]", hex: "oklch(0.7 0.15 75)" },
  plumbing: { bg: "bg-[oklch(0.95_0.035_200)]", fg: "text-[oklch(0.52_0.1_205)]", hex: "oklch(0.6 0.11 205)" },
  carpentry: { bg: "bg-[oklch(0.95_0.03_55)]", fg: "text-[oklch(0.5_0.1_50)]", hex: "oklch(0.6 0.11 50)" },
  cleaning: { bg: "bg-[oklch(0.95_0.035_170)]", fg: "text-[oklch(0.5_0.11_170)]", hex: "oklch(0.6 0.12 170)" },
  "pest-control": { bg: "bg-[oklch(0.95_0.04_140)]", fg: "text-[oklch(0.5_0.12_145)]", hex: "oklch(0.6 0.13 145)" },
  painting: { bg: "bg-[oklch(0.95_0.035_330)]", fg: "text-[oklch(0.52_0.17_335)]", hex: "oklch(0.6 0.17 335)" },
  "packers-movers": { bg: "bg-[oklch(0.95_0.03_30)]", fg: "text-[oklch(0.55_0.15_35)]", hex: "oklch(0.64 0.15 35)" },
  tutors: { bg: "bg-[oklch(0.95_0.035_295)]", fg: "text-[oklch(0.5_0.17_295)]", hex: "oklch(0.58 0.17 295)" },
  "beauty-salon": { bg: "bg-[oklch(0.95_0.035_10)]", fg: "text-[oklch(0.55_0.16_10)]", hex: "oklch(0.63 0.16 10)" },
  "vehicle-repair": { bg: "bg-[oklch(0.94_0.015_250)]", fg: "text-[oklch(0.42_0.05_255)]", hex: "oklch(0.5 0.05 255)" },
};

const FALLBACK = { bg: "bg-accent", fg: "text-accent-foreground", hex: "oklch(0.55 0.2 266)" };

export function categoryTone(slug?: string | null) {
  return (slug && TONES[slug]) || FALLBACK;
}

export function CategoryIcon({ slug, className, iconClassName }: { slug?: string | null; className?: string; iconClassName?: string }) {
  const Icon = (slug && ICONS[slug]) || Briefcase;
  const tone = categoryTone(slug);
  return (
    <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-xl", tone.bg, tone.fg, className)}>
      <Icon className={cn("size-6", iconClassName)} strokeWidth={1.8} />
    </span>
  );
}

export function categoryIconComponent(slug?: string | null): LucideIcon {
  return (slug && ICONS[slug]) || Briefcase;
}
