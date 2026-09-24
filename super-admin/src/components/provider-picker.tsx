import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Store, X } from "lucide-react";
import { api } from "@/lib/api";
import type { ProviderRow } from "@/lib/types";
import { Input } from "@/components/ui/input";

/** Type-ahead search over all providers; returns the chosen one. */
export function ProviderPicker({ value, onChange, id, invalid, describedBy, placeholder = "Type at least 2 letters of the business name" }: { placeholder?: string; value: { id: number; businessName: string; city: string } | null; onChange: (p: { id: number; businessName: string; city: string } | null) => void; id: string; invalid?: boolean; describedBy?: string }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data } = useQuery({
    queryKey: ["provider-picker", debounced],
    queryFn: () => api<{ providers: ProviderRow[] }>(`/admin/providers?status=active&pageSize=8&q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.length >= 2,
  });

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <Store className="size-4 text-primary" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{value.businessName}</span> <span className="text-muted-foreground">{value.city}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Choose a different provider">
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="pl-9"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
      />
      {open && debounced.length >= 2 && data && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-[var(--shadow-lift)]">
          {data.providers.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No live provider matches.</div>}
          {data.providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange({ id: p.id, businessName: p.businessName, city: p.city });
                setQ("");
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="truncate font-medium">{p.businessName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{p.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
