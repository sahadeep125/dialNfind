import Image from "next/image";
import { Grid2x2 } from "lucide-react";
import { isOptimizableImage } from "@/lib/image-hosts";
import { categoryImage } from "@/lib/stock-images";
import { cn } from "@/lib/utils";
import { PhotoTrigger, type LightboxPhoto } from "./photo-lightbox";

/** Profile banner: one large photo plus up to four thumbnails, each opening the photo viewer. Without photos, a labelled stock photo of the trade. */
export function PhotoGallery({ photos, businessName, categorySlug }: { photos: LightboxPhoto[]; businessName: string; categorySlug?: string | null }) {
  if (photos.length === 0) {
    const stock = categoryImage(categorySlug);
    return (
      <div className="relative h-44 overflow-hidden rounded-lg bg-muted sm:h-56 md:h-64">
        <Image src={stock.src} alt={stock.alt} fill priority sizes="(min-width: 1536px) 92rem, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <span className="absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-xs text-white/90">Representative photo</span>
      </div>
    );
  }

  const [main, ...rest] = photos;
  const thumbs = rest.slice(0, 4);
  const remaining = photos.length - 1 - thumbs.length;
  // Spans on a 4x2 grid (from sm): the main photo takes the left, thumbnails fill what is left.
  const layout: Record<number, { main: string; thumbs: string[] }> = {
    0: { main: "sm:col-span-4 sm:row-span-2", thumbs: [] },
    1: { main: "sm:col-span-3 sm:row-span-2", thumbs: ["sm:row-span-2"] },
    2: { main: "sm:col-span-2 sm:row-span-2", thumbs: ["sm:col-span-2", "sm:col-span-2"] },
    3: { main: "sm:col-span-2 sm:row-span-2", thumbs: ["sm:row-span-2", "", ""] },
    4: { main: "sm:col-span-2 sm:row-span-2", thumbs: ["", "", "", ""] },
  };
  const spans = layout[thumbs.length];

  return (
    <div className="relative grid h-60 gap-2 overflow-hidden rounded-lg sm:h-80 sm:grid-cols-4 sm:grid-rows-2 lg:h-[26rem]">
      <PhotoTrigger index={0} className={cn("group relative overflow-hidden bg-muted", spans.main)} aria-label={`Open photo: ${main.title || businessName}`}>
        <Image
          src={main.imageUrl}
          alt={main.title || businessName}
          fill
          priority
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          sizes="(min-width: 640px) 50vw, 100vw"
          unoptimized={!isOptimizableImage(main.imageUrl)}
        />
      </PhotoTrigger>
      {thumbs.map((photo, i) => (
        <PhotoTrigger
          key={photo.id}
          index={i + 1}
          className={cn("group relative hidden overflow-hidden bg-muted sm:block", spans.thumbs[i])}
          aria-label={`Open photo: ${photo.title || businessName}`}
        >
          <Image
            src={photo.imageUrl}
            alt={photo.title || businessName}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(min-width: 640px) 25vw, 1px"
            unoptimized={!isOptimizableImage(photo.imageUrl)}
          />
        </PhotoTrigger>
      ))}
      <PhotoTrigger
        index={0}
        className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
      >
        <Grid2x2 className="size-4" aria-hidden /> Show all {photos.length} {photos.length === 1 ? "photo" : "photos"}
        {remaining > 0 && <span className="sr-only">, {remaining} more than shown here</span>}
      </PhotoTrigger>
    </div>
  );
}
