import Image from "next/image";
import { isOptimizableImage } from "@/lib/image-hosts";
import { categoryImage } from "@/lib/stock-images";
import { cn } from "@/lib/utils";
import { ProviderAvatar } from "./provider-avatar";

/**
 * A provider's cover photo, filling its parent. Without one, the category's stock photo is shown
 * dimmed with the provider's logo or monogram on top, so no card is left as a flat colour block.
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
  const stock = categoryImage(categorySlug);
  return (
    <>
      <Image src={stock.src} alt="" fill sizes={sizes} priority={priority} className={cn(zoom, "saturate-[0.6]", className)} />
      <div className="absolute inset-0 flex items-center justify-center bg-brand-deep/55">
        <ProviderAvatar name={name} logoUrl={logoUrl} categorySlug={categorySlug} className="shadow-md ring-2 ring-white/80" />
      </div>
    </>
  );
}
