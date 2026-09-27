"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "services", label: "Services" },
  { id: "photos", label: "Photos" },
  { id: "reviews", label: "Reviews" },
  { id: "location", label: "Location" },
  { id: "similar", label: "Similar pros" },
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
    <nav aria-label="Profile sections" className="sticky top-16 z-30 -mx-4 border-b bg-background/95 px-4 backdrop-blur-md sm:mx-0 sm:px-0">
      <div className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? "true" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors",
              active === item.id ? "border-cta text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {item.label}
            {item.id === "reviews" && reviewCount > 0 && <span className="ml-1 font-normal text-muted-foreground">({reviewCount})</span>}
            {item.id === "photos" && photoCount > 0 && <span className="ml-1 font-normal text-muted-foreground">({photoCount})</span>}
          </a>
        ))}
      </div>
    </nav>
  );
}
