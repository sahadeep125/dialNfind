import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useCategoryOptions } from "@/lib/categories";
import { normalizePhone } from "@/lib/validation";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { LocationEditor, locationProblems, type LocationErrors, type LocationValue } from "@/components/location-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const START: LocationValue = { addressLine: "", locality: "", city: "Siliguri", state: "West Bengal", pincode: "", latitude: 26.7271, longitude: 88.3953, serviceRadiusKm: 10 };

/** Adds an unclaimed listing that goes live straight away; the owner can claim it later. */
export function AddListingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories = [] } = useCategoryOptions();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [location, setLocation] = useState<LocationValue>(START);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; category?: string } & LocationErrors>({});
  const category = categories.find((c) => String(c.id) === categoryId);

  const save = useMutation({
    mutationFn: () =>
      api<{ provider: { id: number } }>("/admin/providers", {
        method: "POST",
        json: {
          businessName: name.trim(),
          phone,
          ...location,
          pincode: location.pincode || "",
          services: [{ categoryId: Number(categoryId), subcategoryId: subcategoryId ? Number(subcategoryId) : null, isPrimary: true }],
        },
      }),
    onSuccess: ({ provider }) => {
      toast.success(`${name.trim()} is now listed`);
      void qc.invalidateQueries({ queryKey: ["admin-providers"] });
      onOpenChange(false);
      navigate(`/providers/${provider.id}`);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      ...(name.trim().length < 2 ? { name: "Enter the business name" } : {}),
      ...(!normalizePhone(phone) ? { phone: "Enter a valid 10-digit Indian phone number" } : {}),
      ...(!categoryId ? { category: "Choose a category" } : {}),
      ...locationProblems(location),
    };
    setErrors(next);
    if (!Object.keys(next).length) save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a listing</DialogTitle>
          <DialogDescription>The listing goes live without an owner. The business can claim it later with an ownership document.</DialogDescription>
        </DialogHeader>
        <form id="add-listing" onSubmit={submit} noValidate className="space-y-4">
          <FormAlert message={save.error ? errorMessage(save.error) : null} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-name" label="Business name" required error={errors.name} className="sm:col-span-2">
              <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} {...fieldA11y("new-name", errors.name)} />
            </Field>
            <Field id="new-phone" label="Business phone" required error={errors.phone}>
              <Input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" {...fieldA11y("new-phone", errors.phone)} />
            </Field>
            <Field id="new-category" label="Category" required error={errors.category}>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setSubcategoryId("");
                }}
              >
                <SelectTrigger id="new-category" className="w-full" aria-invalid={!!errors.category || undefined}>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            {category && (
              <Field id="new-sub" label="Main service" optional>
                <Select value={subcategoryId || "all"} onValueChange={(v) => setSubcategoryId(v === "all" ? "" : v)}>
                  <SelectTrigger id="new-sub" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Whole category</SelectItem>
                    {category.subcategories
                      .filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="size-4 text-primary" /> Location
            </h3>
            <LocationEditor idPrefix="new" value={location} onChange={setLocation} errors={errors} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-listing" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Add listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TEMPLATE_HEADER = "business_name,phone,category,subcategory,city,state,locality,address,pincode,latitude,longitude,whatsapp,email,website,description,service_radius_km";
const TEMPLATE_ROW = "Sharma TV Repair,9876543210,electronics-repair,TV Repair,Siliguri,West Bengal,Sevoke Road,Shop 4 City Plaza,734001,26.7338,88.4325,,,,TV and set-top box repairs,10";

interface ImportResult {
  dryRun: boolean;
  total: number;
  valid: number;
  created: number;
  rows: { row: number; businessName: string; city: string; errors: string[]; geocoded: boolean }[];
}

/** Upload a CSV, check every row without saving, then import the rows that passed. */
export function ImportListingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const run = useMutation({
    mutationFn: (dryRun: boolean) => api<ImportResult>("/admin/providers/import", { method: "POST", json: { csv: csv!.text, dryRun } }),
    onSuccess: (r) => {
      setResult(r);
      if (!r.dryRun) {
        toast.success(`${r.created} listing${r.created === 1 ? "" : "s"} imported`);
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

  function template() {
    const url = URL.createObjectURL(new Blob([`${TEMPLATE_HEADER}\r\n${TEMPLATE_ROW}\r\n`], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "dialnfind-import-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  const problems = result?.rows.filter((r) => r.errors.length) ?? [];
  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import listings from CSV</DialogTitle>
          <DialogDescription>
            Up to 500 rows. Category and service can be names or slugs. Rows without latitude and longitude are placed on the map from their address, which takes about a second per row.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={template}>
              <Download /> Download template
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <FileSpreadsheet className="size-4" /> {csv ? csv.name : "Choose CSV file"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
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
              <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${problems.length ? "bg-warning/10" : "bg-success/10"}`}>
                {problems.length ? <AlertTriangle className="size-4 text-warning" /> : <CheckCircle2 className="size-4 text-success" />}
                {result.dryRun
                  ? `${result.valid} of ${result.total} rows are ready to import.${problems.length ? " Fix the rows below or import the valid ones only." : ""}`
                  : `Imported ${result.created} of ${result.total} rows.`}
              </div>
              {problems.length > 0 && (
                <ul className="max-h-60 space-y-2 overflow-y-auto text-sm">
                  {problems.map((r) => (
                    <li key={r.row} className="rounded-lg border p-2">
                      <span className="font-medium">
                        Row {r.row}: {r.businessName || "No name"}
                      </span>
                      <span className="block text-xs text-destructive">{r.errors.join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              )}
              {result.rows.some((r) => r.geocoded && !r.errors.length) && <p className="text-xs text-muted-foreground">Rows without coordinates were placed from their address. Check their pins after importing.</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => reset(false)}>
            {result && !result.dryRun ? "Close" : "Cancel"}
          </Button>
          {(!result || result.dryRun) && (
            <Button type="button" variant={result ? "default" : "outline"} disabled={!csv || run.isPending || (result?.dryRun && !result.valid)} onClick={() => run.mutate(!result)}>
              {run.isPending && <Loader2 className="animate-spin" />} {result ? `Import ${result.valid} listing${result.valid === 1 ? "" : "s"}` : "Check file"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
