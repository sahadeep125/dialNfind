"use client";

import { createContext, useContext, useState } from "react";

const HoverContext = createContext<{ hovered: number | null; setHovered: (id: number | null) => void }>({ hovered: null, setHovered: () => undefined });

/** Shares which result the pointer is over, so the map can lift that provider's pin. */
export function ResultsHoverProvider({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return <HoverContext.Provider value={{ hovered, setHovered }}>{children}</HoverContext.Provider>;
}

export const useHoveredResult = () => useContext(HoverContext).hovered;

export function ResultHover({ id, children }: { id: number; children: React.ReactNode }) {
  const { setHovered } = useContext(HoverContext);
  return (
    <div onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(id)} onBlur={() => setHovered(null)}>
      {children}
    </div>
  );
}
