"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isOptimizableImage } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

export interface LightboxPhoto {
  id: number | string;
  title: string;
  imageUrl: string;
}

const LightboxContext = createContext<(index: number) => void>(() => undefined);

/** Holds one photo viewer for the whole profile; any PhotoTrigger inside opens it at its photo. */
export function PhotoLightbox({ photos, businessName, children }: { photos: LightboxPhoto[]; businessName: string; children: React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const count = photos.length;
  // Steps only happen while a photo is open (the arrows and key handler exist only then).
  /* v8 ignore next -- the null case is kept for the state's type */
  const step = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + count) % count)), [count]);

  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const photo = index !== null ? photos[index] : null;

  return (
    <LightboxContext.Provider value={setIndex}>
      {children}
      <Dialog open={photo !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-3 border-0 bg-transparent p-0 shadow-none sm:max-w-5xl [&>button:last-child]:bg-black/50 [&>button:last-child]:text-white">
          {photo && (
            <>
              <DialogTitle className="sr-only">{photo.title || businessName}</DialogTitle>
              <DialogDescription className="sr-only">
                Photo {index! + 1} of {count}
              </DialogDescription>
              <div className="relative h-[70dvh] overflow-hidden rounded-xl bg-black">
                <Image src={photo.imageUrl} alt={photo.title || businessName} fill className="object-contain" sizes="(min-width: 1024px) 64rem, 100vw" unoptimized={!isOptimizableImage(photo.imageUrl)} />
                {count > 1 && (
                  <>
                    <NavButton side="left" onClick={() => step(-1)} />
                    <NavButton side="right" onClick={() => step(1)} />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 text-sm text-white">
                <span className="truncate font-medium">{photo.title}</span>
                <span className="shrink-0 tabular-nums text-white/70">
                  {index! + 1} / {count}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LightboxContext.Provider>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-foreground shadow-md transition-colors hover:bg-white",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

/** A button that opens the profile's photo viewer at `index`. */
export function PhotoTrigger({ index, className, children, ...props }: { index: number } & Omit<React.ComponentProps<"button">, "onClick" | "type">) {
  const open = useContext(LightboxContext);
  return (
    <button type="button" onClick={() => open(index)} className={cn("cursor-pointer", className)} {...props}>
      {children}
    </button>
  );
}
