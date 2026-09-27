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

/** A quiet tint + a readable foreground per category, all in the same lightness band so none shouts. */
const TONES: Record<string, { bg: string; fg: string; hex: string }> = {
  "electronics-repair": { bg: "bg-[oklch(0.955_0.022_255)]", fg: "text-[oklch(0.45_0.1_255)]", hex: "oklch(0.55 0.1 255)" },
  "home-appliances": { bg: "bg-[oklch(0.955_0.022_225)]", fg: "text-[oklch(0.45_0.1_225)]", hex: "oklch(0.55 0.1 225)" },
  electricians: { bg: "bg-[oklch(0.955_0.022_75)]", fg: "text-[oklch(0.45_0.1_75)]", hex: "oklch(0.55 0.1 75)" },
  plumbing: { bg: "bg-[oklch(0.955_0.022_210)]", fg: "text-[oklch(0.45_0.1_210)]", hex: "oklch(0.55 0.1 210)" },
  carpentry: { bg: "bg-[oklch(0.955_0.022_55)]", fg: "text-[oklch(0.45_0.1_55)]", hex: "oklch(0.55 0.1 55)" },
  cleaning: { bg: "bg-[oklch(0.955_0.022_170)]", fg: "text-[oklch(0.45_0.1_170)]", hex: "oklch(0.55 0.1 170)" },
  "pest-control": { bg: "bg-[oklch(0.955_0.022_140)]", fg: "text-[oklch(0.45_0.1_140)]", hex: "oklch(0.55 0.1 140)" },
  painting: { bg: "bg-[oklch(0.955_0.022_340)]", fg: "text-[oklch(0.45_0.1_340)]", hex: "oklch(0.55 0.1 340)" },
  "packers-movers": { bg: "bg-[oklch(0.955_0.022_40)]", fg: "text-[oklch(0.45_0.1_40)]", hex: "oklch(0.55 0.1 40)" },
  tutors: { bg: "bg-[oklch(0.955_0.022_295)]", fg: "text-[oklch(0.45_0.1_295)]", hex: "oklch(0.55 0.1 295)" },
  "beauty-salon": { bg: "bg-[oklch(0.955_0.022_10)]", fg: "text-[oklch(0.45_0.1_10)]", hex: "oklch(0.55 0.1 10)" },
  "vehicle-repair": { bg: "bg-[oklch(0.955_0.022_250)]", fg: "text-[oklch(0.45_0.05_250)]", hex: "oklch(0.55 0.05 250)" },
};

const FALLBACK = { bg: "bg-accent", fg: "text-accent-foreground", hex: "oklch(0.45 0.07 252)" };

export function categoryTone(slug?: string | null) {
  return (slug && TONES[slug]) || FALLBACK;
}

export function CategoryIcon({ slug, className, iconClassName }: { slug?: string | null; className?: string; iconClassName?: string }) {
  const Icon = (slug && ICONS[slug]) || Briefcase;
  const tone = categoryTone(slug);
  return (
    <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-lg", tone.bg, tone.fg, className)}>
      <Icon className={cn("size-6", iconClassName)} strokeWidth={1.8} />
    </span>
  );
}

/** Just the category's icon, with no tile around it. */
export function CategoryGlyph({ slug, className, strokeWidth }: { slug?: string | null; className?: string; strokeWidth?: number }) {
  const Icon = (slug && ICONS[slug]) || Briefcase;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}

export function categoryIconComponent(slug?: string | null): LucideIcon {
  return (slug && ICONS[slug]) || Briefcase;
}
