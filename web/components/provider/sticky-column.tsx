"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Header height plus a gap: where the sidebar stops when it fits on screen. */
const TOP = 80;
const BOTTOM_GAP = 20;

/**
 * A page column that sticks on large screens, with no scroll of its own. One that fits on screen stays
 * under the header; a taller one scrolls with the page until its bottom is in view, then stays there.
 * Put it on both columns and the shorter one stays put while the longer one keeps scrolling.
 */
export function StickyColumn({ as: Tag = "div", className, children }: { as?: "div" | "aside"; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(TOP);

  useEffect(() => {
    const el = ref.current;
    /* v8 ignore next -- the ref is always attached by the time an effect runs */
    if (!el) return;
    const measure = () => setTop(Math.min(TOP, window.innerHeight - el.offsetHeight - BOTTOM_GAP));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <Tag ref={ref} className={cn("lg:sticky lg:self-start", className)} style={{ top }}>
      {children}
    </Tag>
  );
}
