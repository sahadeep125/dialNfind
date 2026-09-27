import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { categoryImage } from "@/lib/stock-images";

/** Photo tiles for each service category, linking to its listing page. */
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {categories.map((c) => {
        const photo = categoryImage(c.slug);
        return (
          <li key={c.id}>
            <Link
              href={`/services/${c.slug}`}
              className="group block overflow-hidden rounded-lg border bg-card transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1024px) 19rem, (min-width: 640px) 31vw, 48vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.providerCount.toLocaleString("en-IN")} {c.providerCount === 1 ? "pro" : "pros"}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-cta" aria-hidden />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
