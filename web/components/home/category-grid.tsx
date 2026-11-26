import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { isOptimizableImage } from "@/lib/image-hosts";
import { categoryPhoto, hasCategoryPhoto } from "@/lib/stock-images";
import { serviceHref } from "@/lib/service-href";

const count = (n: number) => `${n.toLocaleString("en-IN")} ${n === 1 ? "business" : "businesses"}`;

/**
 * The services on the home page: photo tiles for the busiest categories that have their own photograph,
 * then every category as a plain index with its sub-services, so each service page is one click from home.
 */
export function CategoryGrid({ categories, featured = 12 }: { categories: Category[]; featured?: number }) {
  const withPhoto = [...categories].filter(hasCategoryPhoto).sort((a, b) => b.providerCount - a.providerCount).slice(0, featured);
  return (
    <>
      {withPhoto.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 xl:grid-cols-6">
          {withPhoto.map((c) => {
            const photo = categoryPhoto(c);
            return (
              <li key={c.id}>
                <Link href={serviceHref(c.slug)} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      unoptimized={photo.src.startsWith("http") && !isOptimizableImage(photo.src)}
                      sizes="(min-width: 1024px) 19rem, 48vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{c.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{count(c.providerCount)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {categories.length > 0 && (
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-8 sm:gap-x-8 sm:gap-y-8 lg:grid-cols-4">
          {[...categories].sort((a, b) => b.providerCount - a.providerCount).map((c) => (
            <div key={c.id} className="min-w-0">
              <h3 className="flex items-baseline justify-between gap-3 text-[15px] font-semibold">
                <Link href={serviceHref(c.slug)} className="link-draw">
                  {c.name}
                </Link>
                {c.providerCount > 0 && <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">{c.providerCount.toLocaleString("en-IN")}</span>}
              </h3>
              {c.subcategories?.length > 0 && (
                <ul className="mt-2.5 hidden space-y-1.5 sm:block">
                  {c.subcategories.slice(0, 4).map((s) => (
                    <li key={s.id}>
                      <Link href={serviceHref(c.slug, s.slug)} className="link-draw text-sm text-muted-foreground hover:text-foreground">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
