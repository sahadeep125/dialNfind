import { Link } from "react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id="dnf-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.6 0.2 266)" />
          <stop offset="1" stopColor="oklch(0.45 0.19 270)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#dnf-logo)" />
      <path d="M20 8.5c-5.1 0-9 3.9-9 8.9 0 6.2 7.4 13 8.2 13.7.5.4 1.1.4 1.6 0 .8-.7 8.2-7.5 8.2-13.7 0-5-3.9-8.9-9-8.9Z" fill="white" />
      <path
        d="M17.3 13.6c.3-.3.8-.3 1 .1l1 1.6c.2.3.1.7-.1 1l-.6.5c.4.9 1.1 1.6 2 2l.5-.6c.3-.3.7-.3 1-.1l1.6 1c.4.2.4.7.1 1l-.8.8c-.5.5-1.3.6-1.9.3-1.9-.9-3.4-2.4-4.3-4.3-.3-.6-.2-1.4.3-1.9l.2-.4Z"
        fill="oklch(0.53 0.2 266)"
      />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className={cn("block font-display text-lg font-bold tracking-tight", light ? "text-white" : "text-brand-deep")}>
          Dial<span className={light ? "text-[oklch(0.8_0.1_200)]" : "text-primary"}>N</span>Find
        </span>
        <span className={cn("block text-[10px] font-semibold uppercase tracking-[0.18em]", light ? "text-white/60" : "text-muted-foreground")}>Admin console</span>
      </span>
    </Link>
  );
}
