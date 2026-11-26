import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, downloadCsv, errorMessage } from "@/lib/api";
import { FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UpdateRow {
  row: number;
  id: number | null;
  businessName: string;
  status: "update" | "unchanged" | "error";
  errors: string[];
  warnings: string[];
  changes: { column: string; from: string; to: string }[];
  geocoded: boolean;
}

interface UpdateResult {
  dryRun: boolean;
  total: number;
  toUpdate: number;
  unchanged: number;
  failed: number;
  updated: number;
  ignoredColumns: string[];
  rows: UpdateRow[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Download the listings' current details as CSV, edit them in a spreadsheet and upload the file. The
 * first pass lists every change without saving; the second saves the rows that changed.
 */
export function BulkUpdateListingsDialog({ open, onOpenChange, filters }: { open: boolean; onOpenChange: (o: boolean) => void; filters: Record<string, string> }) {
  const qc = useQueryClient();
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const run = useMutation({
    mutationFn: (dryRun: boolean) => api<UpdateResult>("/admin/providers/bulk-update", { method: "POST", json: { csv: csv!.text, dryRun } }),
    onSuccess: (r) => {
      setResult(r);
      if (!r.dryRun) {
        toast.success(`${plural(r.updated, "listing")} updated`);
        void qc.invalidateQueries({ queryKey: ["admin-providers"] });
      }
    },
  });

  function reset(o: boolean) {
    if (!o) {
      setCsv(null);
      setResult(null);
      run.reset();
    }
    onOpenChange(o);
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadCsv("provider-updates", filters);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  const changed = result?.rows.filter((r) => r.status !== "unchanged") ?? [];
  const failed = result ? (result.dryRun ? result.failed : result.rows.filter((r) => r.status === "error").length) : 0;
  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk update listings</DialogTitle>
          <DialogDescription>
            Download the current details of the listings in this view, change what you need in a spreadsheet and upload the file. Rows are matched by id, or by phone when the id is blank. Empty cells keep the current value and a single - clears an optional one. Write hours like "Mon-Sat 10:00-20:00; Sun closed" or "24x7". Up to 500 rows at a time. The services column is for reference only; services, photos and status are not changed here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={download} disabled={downloading}>
              {downloading ? <Loader2 className="animate-spin" /> : <Download />} Download current data
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <FileSpreadsheet className="size-4" /> {csv ? csv.name : "Choose CSV file"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 2_000_000) return toast.error("The file is too large. Split it into files under 2 MB.");
                  setCsv({ name: file.name, text: await file.text() });
                  setResult(null);
                  run.reset();
                }}
              />
            </label>
          </div>
          <FormAlert message={run.error ? errorMessage(run.error) : null} />
          {result && (
            <div className="space-y-3" aria-live="polite">
              <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${failed ? "bg-warning/10" : "bg-success/10"}`}>
                {failed ? <AlertTriangle className="size-4 shrink-0 text-warning" /> : <CheckCircle2 className="size-4 shrink-0 text-success" />}
                <span>
                  {result.dryRun
                    ? `${plural(result.toUpdate, "listing")} will change, ${result.unchanged} unchanged${failed ? `, ${plural(failed, "row")} with problems` : ""}. Nothing is saved yet.`
                    : `Updated ${plural(result.updated, "listing")}${failed ? `; ${plural(failed, "row")} could not be saved` : ""}.`}
                </span>
              </div>
              {result.ignoredColumns.length > 0 && <p className="text-xs text-muted-foreground">Ignored columns: {result.ignoredColumns.join(", ")}.</p>}
              {changed.length > 0 && (
                <ul className="max-h-[45dvh] space-y-2 overflow-y-auto text-sm">
                  {changed.map((r) => (
                    <li key={r.row} className="rounded-lg border p-2">
                      <span className="font-medium">
                        Row {r.row}: {r.businessName || "Unknown listing"}
                        {r.id && <span className="font-normal text-muted-foreground"> · #{r.id}</span>}
                      </span>
                      {r.errors.length > 0 && <span className="block text-xs text-destructive">{r.errors.join(" · ")}</span>}
                      {r.changes.length > 0 && (
                        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                          {r.changes.map((ch) => (
                            <div key={ch.column} className="contents">
                              <dt className="text-muted-foreground">{ch.column}</dt>
                              <dd className="min-w-0 break-words">
                                <span className="text-muted-foreground line-through">{ch.from || "empty"}</span> → <span>{ch.to || "empty"}</span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {r.warnings.length > 0 && <span className="mt-1 block text-xs text-warning">{r.warnings.join(" · ")}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {result.rows.some((r) => r.geocoded && r.status !== "error") && <p className="text-xs text-muted-foreground">Rows with a new address and no coordinates were placed from the address. Check their pins after updating.</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => reset(false)}>
            {result && !result.dryRun ? "Close" : "Cancel"}
          </Button>
          {(!result || result.dryRun) && (
            <Button type="button" variant={result ? "default" : "outline"} disabled={!csv || run.isPending || (result?.dryRun && !result.toUpdate)} onClick={() => run.mutate(!result)}>
              {run.isPending && <Loader2 className="animate-spin" />} {result ? `Update ${plural(result.toUpdate, "listing")}` : "Check file"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
