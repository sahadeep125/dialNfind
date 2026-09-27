"use client";

import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, MapPin, Star, UsersRound, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "services", label: "Service", icon: Wrench },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "location", label: "Location", icon: MapPin },
  { id: "similar", label: "Similar Providers", icon: UsersRound },
];

/** Sticky anchor tabs under the header; highlights whichever section is nearest the top of the viewport. */
export function SectionNav({ reviewCount, photoCount, hidden = [] }: { reviewCount: number; photoCount: number; hidden?: string[] }) {
  const [active, setActive] = useState("overview");
  const items = ITEMS.filter((item) => !hidden.includes(item.id));

  useEffect(() => {
    const sections = ITEMS.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-150px 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Profile sections" className="sticky top-16 z-30 -mx-4 border-y bg-card px-2 shadow-[var(--shadow-card)] sm:mx-0 sm:rounded-xl sm:border">
      <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? "true" : undefined}
            className={cn(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3.5 text-[15px] font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
              active === item.id ? "text-primary after:bg-primary" : "text-muted-foreground after:bg-transparent hover:text-foreground",
            )}
          >
            <item.icon className="size-[18px]" aria-hidden />
            {item.label}
            {item.id === "reviews" && reviewCount > 0 && ` (${reviewCount})`}
            {item.id === "photos" && photoCount > 0 && ` (${photoCount})`}
          </a>
        ))}
      </div>
    </nav>
  );
}
