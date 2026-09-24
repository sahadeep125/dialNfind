import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Hours, ProviderProfile, ProviderService, ServiceArea } from "@/lib/types";
import { useProfile } from "@/layouts/app-layout";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton, SaveBar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AreasEditor, DEFAULT_HOURS, HoursEditor, normalizeHours, ServicesEditor, validateHours, validateServices } from "@/components/editors";

/**
 * Shared shape for the list editors (services, hours, areas): load from the profile, edit locally,
 * PUT the whole list back.
 */
function useListEditor<T>(select: (p: ProviderProfile) => T, endpoint: string, key: string) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const initial = useMemo(() => (profile ? select(profile) : null), [profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const [value, setValue] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setValue(initial);
  }, [initial]);

  async function save(payload: unknown) {
    setSaving(true);
    try {
      await api(endpoint, { method: "PUT", json: { [key]: payload } });
      await qc.invalidateQueries();
      toast.success("Saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const dirty = value !== null && JSON.stringify(value) !== JSON.stringify(initial);
  return { initial, value, setValue, saving, save, dirty };
}

export function ServicesPage() {
  const e = useListEditor<ProviderService[]>((p) => p.services, "/provider/services", "services");
  if (!e.value || !e.initial) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Services and prices" description="Customers search by service. A starting price makes you far more likely to get the call." />
      <Panel>
        <ServicesEditor value={e.value} onChange={e.setValue} />
      </Panel>
      {!e.dirty && <ServiceDetails />}
      <SaveBar
        dirty={e.dirty}
        saving={e.saving}
        onReset={() => e.setValue(e.initial)}
        onSave={() => {
          const problem = validateServices(e.value!);
          if (problem) return toast.error(problem);
          void e.save(e.value!.map(({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }) => ({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary })));
        }}
      />
    </>
  );
}

export function HoursPage() {
  const e = useListEditor<Hours[]>((p) => (p.businessHours.length ? normalizeHours(p.businessHours) : DEFAULT_HOURS), "/provider/hours", "hours");
  if (!e.value || !e.initial) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Working hours" description="Customers see an Open now label during these hours, in India Standard Time." />
      <Panel>
        <HoursEditor value={e.value} onChange={e.setValue} />
      </Panel>
      <SaveBar
        dirty={e.dirty}
        saving={e.saving}
        onReset={() => e.setValue(e.initial)}
        onSave={() => {
          if (validateHours(e.value!)) return toast.error("Fix the highlighted days before saving");
          void e.save(e.value);
        }}
      />
    </>
  );
}

export function AreasPage() {
  const e = useListEditor<ServiceArea[]>(
    (p) => p.serviceAreas.map(({ areaName, pincode, latitude, longitude }) => ({ areaName, pincode, latitude, longitude })),
    "/provider/service-areas",
    "serviceAreas",
  );
  const { data: profile } = useProfile();
  if (!e.value || !e.initial || !profile) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Service areas" description={`You appear in searches within ${profile.serviceRadiusKm} km of your location. Add localities you travel to so customers searching by name find you too.`} />
      <Panel>
        <AreasEditor value={e.value} onChange={e.setValue} />
      </Panel>
      <SaveBar dirty={e.dirty} saving={e.saving} onReset={() => e.setValue(e.initial)} onSave={() => void e.save(e.value)} />
    </>
  );
}

type AttrValue = string | number | boolean | string[] | null;
interface Attr {
  id: number;
  label: string;
  fieldType: "text" | "number" | "select" | "multiselect" | "boolean";
  options: string[];
  isRequired: boolean;
  value: AttrValue;
}
interface AttrGroup {
  providerServiceId: number;
  title: string;
  attributes: Attr[];
}

/** Category questions answered by the provider, e.g. "Brands serviced". Shown on the public profile. */
function ServiceDetails() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["attributes"], queryFn: () => api<{ groups: AttrGroup[] }>("/provider/attributes") });
  const [edits, setEdits] = useState<Record<string, AttrValue>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!data?.groups.length) return null;

  const k = (g: AttrGroup, a: Attr) => `${g.providerServiceId}:${a.id}`;
  const valueOf = (g: AttrGroup, a: Attr) => (k(g, a) in edits ? edits[k(g, a)] : a.value);
  const set = (g: AttrGroup, a: Attr, v: AttrValue) => {
    setEdits({ ...edits, [k(g, a)]: v });
    if (errors[k(g, a)]) setErrors(({ [k(g, a)]: _, ...rest }) => rest);
  };
  const problem = (a: Attr, v: AttrValue): string | null => {
    const empty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) return a.isRequired ? (a.fieldType === "select" || a.fieldType === "multiselect" ? "Choose an option" : "This answer is required") : null;
    if (a.fieldType === "number" && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) return "Enter a number of 0 or more";
    if (a.fieldType === "text" && String(v).trim().length > 300) return "Keep it under 300 characters";
    return null;
  };
  const dirty = Object.keys(edits).length > 0;

  async function save() {
    const found: Record<string, string> = {};
    for (const g of data!.groups) for (const a of g.attributes) {
      const msg = problem(a, valueOf(g, a));
      if (msg) found[k(g, a)] = msg;
    }
    setErrors(found);
    if (Object.keys(found).length) return toast.error("Answer the highlighted questions");
    setSaving(true);
    try {
      const values = Object.entries(edits).map(([key, value]) => {
        const [providerServiceId, attributeId] = key.split(":").map(Number);
        return { providerServiceId, attributeId, value: value === "" ? null : value };
      });
      await api("/provider/attributes", { method: "PUT", json: { values } });
      setEdits({});
      await qc.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("Service details saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Service details"
      description="Answer a few questions about your work. These show on your public profile and help customers choose you."
      className="mt-6"
      actions={
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving && <Loader2 className="animate-spin" />} Save details
        </Button>
      }
    >
      <div className="space-y-6">
        {data.groups.map((g) => (
          <div key={g.providerServiceId} className="space-y-4">
            {data.groups.length > 1 && <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</div>}
            {g.attributes.map((a) => {
              const v = valueOf(g, a);
              const id = `attr-${g.providerServiceId}-${a.id}`;
              const err = errors[k(g, a)];
              return (
                <div key={a.id} className="space-y-2">
                  <Label htmlFor={id}>
                    {a.label}
                    {a.isRequired && <span className="text-destructive"> *</span>}
                  </Label>
                  {a.fieldType === "boolean" && (
                    <div className="flex items-center gap-3">
                      <Switch id={id} checked={v === true} onCheckedChange={(c) => set(g, a, c)} />
                      <span className="text-sm text-muted-foreground">{v === true ? "Yes" : v === false ? "No" : "Not answered"}</span>
                    </div>
                  )}
                  {a.fieldType === "select" && (
                    <Select value={typeof v === "string" ? v : ""} onValueChange={(x) => set(g, a, x)}>
                      <SelectTrigger id={id} className="w-full sm:w-72" aria-invalid={!!err || undefined}>
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        {a.options.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {a.fieldType === "multiselect" && (
                    <div className="flex flex-wrap gap-2">
                      {a.options.map((o) => {
                        const list = Array.isArray(v) ? v : [];
                        const on = list.includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set(g, a, on ? list.filter((x) => x !== o) : [...list, o])}
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                              on ? "border-primary bg-accent text-primary" : "hover:bg-muted",
                            )}
                          >
                            {on && <Check className="size-3.5" />} {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {(a.fieldType === "text" || a.fieldType === "number") && (
                    <Input
                      id={id}
                      type={a.fieldType === "number" ? "number" : "text"}
                      min={a.fieldType === "number" ? 0 : undefined}
                      maxLength={a.fieldType === "text" ? 300 : undefined}
                      aria-invalid={!!err || undefined}
                      aria-describedby={err ? `${id}-error` : undefined}
                      className="sm:w-72"
                      value={v === null || v === undefined ? "" : String(v)}
                      onChange={(e) => set(g, a, a.fieldType === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
                    />
                  )}
                  {err && (
                    <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Panel>
  );
}
