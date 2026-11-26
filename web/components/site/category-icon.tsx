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
  Camera,
  Dumbbell,
  Flame,
  BrickWall,
  KeyRound,
  Shirt,
  CarFront,
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
  locksmith: KeyRound,
  tailoring: Scissors,
  drivers: CarFront,
  masonry: BrickWall,
  welding: Flame,
  photography: Camera,
  "fitness-yoga": Dumbbell,
  laundry: Shirt,
};

/**
 * One brand tint for every category. A rainbow of per-category tints made lists look generated; the glyph
 * alone tells the categories apart.
 */
const TONE = { bg: "bg-secondary", fg: "text-primary", hex: "#042161" };

export function categoryTone(_slug?: string | null) {
  return TONE;
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
