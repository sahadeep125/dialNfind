import Image from "next/image";
import { initials } from "@/lib/format";
import { isOptimizableImage } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";
import { categoryIconComponent, categoryTone } from "@/components/site/category-icon";

/** Logo if uploaded, otherwise a monogram on the category's tone with a small category glyph. */
export function ProviderAvatar({
  name,
  logoUrl,
  categorySlug,
  className,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  categorySlug?: string | null;
  className?: string;
  size?: "md" | "lg" | "xl";
}) {
  const dims = size === "xl" ? "size-24 rounded-3xl text-3xl" : size === "lg" ? "size-16 rounded-2xl text-xl" : "size-14 rounded-2xl text-lg";
  if (logoUrl) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden bg-muted", dims, className)}>
        <Image src={logoUrl} alt={name} fill className="object-cover" sizes="96px" unoptimized={!isOptimizableImage(logoUrl)} />
      </span>
    );
  }
  const Icon = categoryIconComponent(categorySlug);
  const tone = categoryTone(categorySlug);
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center font-display font-bold", dims, tone.bg, tone.fg, className)} aria-hidden>
      {initials(name)}
      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg border-2 border-card bg-card shadow-sm">
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
    </span>
  );
}
