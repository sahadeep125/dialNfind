import Image from "next/image";
import { initials } from "@/lib/format";
import { isOptimizableImage } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";
import { ProviderAvatar } from "./provider-avatar";

/**
 * A provider's cover photo, filling its parent. Without one, its logo on a flat panel, else its initials.
 */
export function ProviderPhoto({
  name,
  coverUrl,
  logoUrl,
  categorySlug,
  sizes,
  priority = false,
  className,
}: {
  name: string;
  coverUrl: string | null;
  logoUrl: string | null;
  categorySlug?: string | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const zoom = "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]";
  if (coverUrl) {
    return <Image src={coverUrl} alt={name} fill sizes={sizes} priority={priority} className={cn(zoom, className)} unoptimized={!isOptimizableImage(coverUrl)} />;
  }
  if (logoUrl) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center bg-muted", className)}>
        <ProviderAvatar name={name} logoUrl={logoUrl} categorySlug={categorySlug} className="size-20 bg-card" />
      </div>
    );
  }
  // No photo yet (most unclaimed listings): a flat panel with the business's initials, rather than a
  // stock photo that would pass for the business's own.
  return (
    <div aria-hidden className={cn("absolute inset-0 flex items-center justify-center bg-[#eceae3]", className)}>
      <span className="font-display text-5xl font-semibold tracking-[-0.04em] text-primary/80">{initials(name)}</span>
    </div>
  );
}

