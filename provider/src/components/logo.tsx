import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** The KaajVa house-and-wrench mark on its own (logo/icon.png). */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/brand/kaajva-mark.png" alt="" aria-hidden width={256} height={256} className={cn("size-9", className)} />;
}

/** The full KaajVa logo with this app's label under it. `light` uses the white version for dark backgrounds. */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn("flex flex-col items-start gap-1", className)}>
      <img src={light ? "/brand/kaajva-logo-white.png" : "/brand/kaajva-logo.png"} alt="KaajVa" width={light ? 524 : 494} height={120} className="h-8 w-auto" />
      <span className={cn("block text-[10px] font-semibold uppercase tracking-[0.18em]", light ? "text-white/60" : "text-muted-foreground")}>for Business</span>
    </Link>
  );
}
