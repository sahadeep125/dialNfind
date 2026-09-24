import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function StatCard({ label, value, hint, icon: Icon, to, tone = "default" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; to?: string; tone?: "default" | "warning" | "success" }) {
  const body = (
    <div className={cn("h-full rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition-colors", to && "hover:border-primary/40")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", tone === "warning" ? "bg-warning-soft text-[oklch(0.5_0.12_60)]" : tone === "success" ? "bg-success-soft text-success" : "bg-accent text-primary")}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Horizontally scrollable table shell so wide tables never break the page on phones. */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("border-b bg-muted/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>{children}</th>;
}

export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("border-b px-4 py-3 align-middle last:border-r-0 [tr:last-child_&]:border-b-0", className)}>
      {children}
    </td>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <Td key={c}>
              <Skeleton className="h-4 w-full max-w-40" />
            </Td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <Td colSpan={cols} className="py-12 text-center text-muted-foreground">
        {text}
      </Td>
    </tr>
  );
}

const TONES: Record<string, "success" | "warning" | "destructive" | "muted" | "secondary" | "default"> = {
  active: "success",
  approved: "success",
  published: "success",
  verified: "success",
  resolved: "success",
  success: "success",
  pending: "warning",
  partial: "warning",
  open: "warning",
  paused: "warning",
  flagged: "warning",
  new: "warning",
  high: "warning",
  in_progress: "secondary",
  rejected: "destructive",
  suspended: "destructive",
  removed: "destructive",
  failed: "destructive",
  urgent: "destructive",
  deleted: "destructive",
  cancelled: "muted",
  closed: "muted",
  completed: "muted",
  expired: "muted",
  dismissed: "muted",
  refunded: "muted",
  none: "muted",
  low: "muted",
  normal: "secondary",
};

export const humanize = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1)).replace(/_/g, " ");

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant={TONES[status] ?? "secondary"}>{label ?? humanize(status)}</Badge>;
}

/** Search box that reports its value after the user stops typing. */
export function SearchInput({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={100} className="pl-9 pr-9" />
      {text && (
        <button type="button" onClick={() => setText("")} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, options, label, allLabel = "All", className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; allLabel?: string; className?: string }) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function RowLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary">
      {children} <ChevronRight className="size-3.5 opacity-50" />
    </Link>
  );
}

/** A confirmation dialog for destructive or hard-to-undo actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  busy,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small key/value list used on detail pages. */
export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 truncate font-medium">{v ?? "Not set"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [state, setState] = useState<T>(() => {
    const p = new URLSearchParams(window.location.search);
    return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, p.get(k) ?? v])) as T;
  });
  useEffect(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(state)) if (v && v !== defaults[k]) p.set(k, v);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<T>) => setState((s) => ({ ...s, ...patch }));
  return [state, set] as const;
}
