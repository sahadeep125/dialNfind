"use client";

import { useEffect, useState } from "react";

/**
 * The masthead's one moving word. Shows the first word on the server and for anyone who prefers reduced
 * motion; otherwise steps through the list every few seconds.
 */
export function CyclingWord({ words, className, interval = 2200 }: { words: string[]; className?: string; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);
  return (
    <span key={i} className={`word-in inline-block ${className ?? ""}`}>
      {words[i]}
    </span>
  );
}
