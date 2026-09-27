import Image from "next/image";
import { Camera } from "lucide-react";
import { isOptimizableImage } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";
import { PhotoTrigger, type LightboxPhoto } from "./photo-lightbox";

/** Cover banner: a large main shot plus a 2x2 grid of thumbnails; the last one shows "+N more". Every tile opens the photo viewer. */
export function PhotoGallery({ photos, businessName, toneHex }: { photos: LightboxPhoto[]; businessName: string; toneHex: string }) {
  if (photos.length === 0) {
    return (
      <div className="relative h-40 overflow-hidden rounded-xl md:h-52" style={{ background: `linear-gradient(120deg, ${toneHex}, oklch(0.27 0.09 268))` }}>
        <div className="bg-grid absolute inset-0 opacity-40 [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>
    );
  }

  const [main, ...rest] = photos;
  const thumbs = rest.slice(0, 4);
  const remaining = photos.length - 1 - thumbs.length;

  return (
    <div className={cn("grid h-56 gap-1.5 overflow-hidden rounded-xl sm:h-64 md:h-[18rem]", thumbs.length > 0 && "sm:grid-cols-[1.55fr_1fr]")}>
      <PhotoTrigger index={0} className="group relative overflow-hidden bg-muted" aria-label={`Open photo: ${main.title || businessName}`}>
        <Image
          src={main.imageUrl}
          alt={main.title || businessName}
          fill
          priority
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(min-width: 1024px) 40vw, (min-width: 640px) 60vw, 100vw"
          unoptimized={!isOptimizableImage(main.imageUrl)}
        />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-lg bg-black/65 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-black/80">
          <Camera className="size-4" /> View all photos ({photos.length})
        </span>
      </PhotoTrigger>
      {thumbs.length > 0 && (
        <div className={cn("hidden gap-1.5 sm:grid", thumbs.length > 1 ? "grid-cols-2" : "grid-cols-1", thumbs.length > 2 ? "grid-rows-2" : "grid-rows-1")}>
          {thumbs.map((photo, i) => {
            const showMore = i === thumbs.length - 1 && remaining > 0;
            return (
              <PhotoTrigger
                key={photo.id}
                index={i + 1}
                className={cn("group relative overflow-hidden bg-muted", thumbs.length === 3 && i === 0 && "row-span-2")}
                aria-label={showMore ? `View all ${photos.length} photos` : `Open photo: ${photo.title || businessName}`}
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.title || businessName}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(min-width: 1024px) 14vw, 20vw"
                  unoptimized={!isOptimizableImage(photo.imageUrl)}
                />
                {showMore && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">+{remaining} more</span>}
              </PhotoTrigger>
            );
          })}
        </div>
      )}
    </div>
  );
}
