import Image from "next/image";
import type { StockImage } from "@/lib/stock-images";
import { cn } from "@/lib/utils";

/** A stock photo in a rounded 4:3 frame, for content pages. */
export function PhotoFrame({ image, className, priority = false }: { image: StockImage; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted", className)}>
      <Image src={image.src} alt={image.alt} fill priority={priority} sizes="(min-width: 1024px) 36rem, 100vw" className="object-cover" />
    </div>
  );
}
