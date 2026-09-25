import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** Row selection for bulk actions. The selection clears whenever the visible rows change (new page or filter). */
export function useSelection(visibleIds: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const key = visibleIds.join(",");
  useEffect(() => setSelected(new Set()), [key]);
  const all = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  return {
    selected: [...selected],
    count: selected.size,
    has: (id: number) => selected.has(id),
    toggle: (id: number) =>
      setSelected((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    allChecked: all ? true : selected.size ? ("indeterminate" as const) : false,
    toggleAll: () => setSelected(all ? new Set() : new Set(visibleIds)),
    clear: () => setSelected(new Set()),
  };
}

export type Selection = ReturnType<typeof useSelection>;

export function SelectAllBox({ selection, label = "Select all rows on this page" }: { selection: Selection; label?: string }) {
  return <Checkbox checked={selection.allChecked} onCheckedChange={selection.toggleAll} aria-label={label} />;
}

export function SelectRowBox({ selection, id, label }: { selection: Selection; id: number; label: string }) {
  return <Checkbox checked={selection.has(id)} onCheckedChange={() => selection.toggle(id)} aria-label={label} />;
}

/** Sticky bar shown while rows are selected, holding the bulk action buttons. */
export function BulkBar({ selection, noun, children }: { selection: Selection; noun: string; children: React.ReactNode }) {
  if (!selection.count) return null;
  return (
    <div role="region" aria-label="Bulk actions" className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 pl-4 shadow-[var(--shadow-soft)]">
      <span className="text-sm font-medium">
        {selection.count} {noun}
        {selection.count === 1 ? "" : "s"} selected
      </span>
      <div className="flex flex-wrap gap-2 sm:ml-auto">{children}</div>
      <Button variant="ghost" size="icon-sm" onClick={selection.clear} aria-label="Clear selection">
        <X />
      </Button>
    </div>
  );
}

/** Downloads the list as CSV with the filters currently applied. */
export function ExportButton({ entity, filters }: { entity: string; filters?: Record<string, string> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadCsv(entity, filters);
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Download />} Export CSV
    </Button>
  );
}
