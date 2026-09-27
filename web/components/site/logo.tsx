import Link from "next/link";
import { cn } from "@/lib/utils";

/** A navy tile with a white map pin and an orange dot: "find someone near you". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="9" fill="var(--primary)" />
      <path d="M20 8c-5.2 0-9.2 4-9.2 9.1 0 6.4 7.6 13.4 8.4 14.1.5.4 1.1.4 1.6 0 .8-.7 8.4-7.7 8.4-14.1C29.2 12 25.2 8 20 8Z" fill="white" />
      <circle cx="20" cy="17.2" r="3.6" fill="var(--cta)" />
    </svg>
  );
}

export function Logo({ className, href = "/", inverted = false }: { className?: string; href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center gap-2.5", className)} aria-label="DialNFind home">
      <LogoMark />
      <span className={cn("font-display text-xl font-extrabold tracking-tight", inverted ? "text-white" : "text-primary")}>
        Dial<span className={inverted ? "text-[oklch(0.8_0.13_60)]" : "text-cta"}>N</span>Find
      </span>
    </Link>
  );
}
