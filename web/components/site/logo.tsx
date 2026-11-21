import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The KaajVa house-and-wrench mark on its own (logo/icon.png). */
export function LogoMark({ className }: { className?: string }) {
  return <Image src="/brand/kaajva-mark.png" alt="" aria-hidden width={256} height={256} className={cn("size-9", className)} />;
}

/** The full KaajVa logo. `inverted` uses the white version for dark backgrounds. */
export function Logo({ className, href = "/", inverted = false }: { className?: string; href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center", className)} aria-label="KaajVa home">
      <Image
        src={inverted ? "/brand/kaajva-logo-white.png" : "/brand/kaajva-logo.png"}
        alt="KaajVa"
        width={inverted ? 524 : 494}
        height={120}
        priority={!inverted}
        className="h-9 w-auto"
      />
    </Link>
  );
}
