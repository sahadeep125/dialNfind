"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A section header plus a grid that shows the first `initial` items, with a "View all" link in the header. */
export function ExpandableGrid({
  title,
  items,
  initial,
  moreLabel,
  className,
}: {
  title: string;
  items: React.ReactNode[];
  initial: number;
  moreLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const canExpand = items.length > initial;
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {canExpand && <ToggleLink open={open} onClick={() => setOpen(!open)} label={moreLabel} />}
      </div>
      <div className={className}>{open ? items : items.slice(0, initial)}</div>
    </>
  );
}

/** A row of chips that shows the first `initial`, then "+N {noun}" to reveal the rest. `header` gets a matching toggle link on its right. */
export function ExpandableChips({ header, chips, initial, noun, linkLabel }: { header: React.ReactNode; chips: string[]; initial: number; noun: string; linkLabel: string }) {
  const [open, setOpen] = useState(false);
  const hidden = chips.length - initial;
  const shown = open ? chips : chips.slice(0, initial);
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {header}
        {hidden > 0 && (
          <button type="button" onClick={() => setOpen(!open)} className="shrink-0 cursor-pointer text-sm font-medium text-primary hover:underline">
            {open ? "Show less" : linkLabel}
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {shown.map((c) => (
            <span key={c} className="rounded-md bg-muted px-2.5 py-1 text-[13px] font-medium text-foreground/75">
              {c}
            </span>
          ))}
          {!open && hidden > 0 && (
            <button type="button" onClick={() => setOpen(true)} className="cursor-pointer rounded-md bg-muted px-2.5 py-1 text-[13px] font-medium text-foreground/75 transition-colors hover:bg-accent hover:text-primary">
              +{hidden} {noun}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function ToggleLink({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-medium text-primary hover:underline">
      {open ? "Show less" : label}
      <ArrowRight className={cn("size-4 transition-transform", open && "-rotate-90")} />
    </button>
  );
}
