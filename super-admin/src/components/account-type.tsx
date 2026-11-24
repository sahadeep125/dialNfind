import { useRef, type KeyboardEvent } from "react";
import { Building2, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BusinessType = "individual" | "company";

interface TabOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

/** Icon tabs that pick one value, like a radio group: arrow keys move between them, Tab leaves. */
export function IconTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  id,
  size = "md",
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  id?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : null;
    if (!step && jump === null) return;
    e.preventDefault();
    const next = jump ?? (i + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div id={id} role="radiogroup" aria-label={label} className={cn("inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto", className)}>
      {options.map((o, i) => {
        const selected = i === current;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-none",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3 text-sm",
              selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn(size === "sm" ? "size-3.5" : "size-4", selected && "text-primary")} aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const TYPE_TABS: TabOption<BusinessType>[] = [
  { value: "individual", label: "Individual professional", icon: UserRound },
  { value: "company", label: "Business", icon: Building2 },
];

/** Picks whether a listing is a person's own (the default) or a business's. */
export function AccountTypeTabs({ value, onChange, id }: { value: BusinessType; onChange: (t: BusinessType) => void; id?: string }) {
  return <IconTabs id={id} label="Account type" options={TYPE_TABS} value={value} onChange={onChange} />;
}

const FILTER_TABS: TabOption<"all" | "individual" | "business">[] = [
  { value: "all", label: "All", icon: UsersRound },
  { value: "individual", label: "Individuals", icon: UserRound },
  { value: "business", label: "Businesses", icon: Building2 },
];

/** The providers list filter: everyone, only individual professionals or only businesses. */
export function AccountTypeFilterTabs({ value, onChange }: { value: string; onChange: (v: "" | "individual" | "business") => void }) {
  return (
    <IconTabs
      label="Account type"
      size="sm"
      options={FILTER_TABS}
      value={value === "individual" || value === "business" ? value : "all"}
      onChange={(v) => onChange(v === "all" ? "" : v)}
    />
  );
}
