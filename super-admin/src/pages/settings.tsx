import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, ExternalLink, KeyRound, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "secret" | "email" | "url" | "select" | "textarea";
  help?: string;
  options?: string[];
  min?: number;
  max?: number;
  default?: string;
  isSet: boolean;
  value: string;
}

interface SettingsResponse {
  groups: { key: string; title: string; description: string; fields: SettingField[] }[];
  plugins: { key: string; name: string; category: string; description: string; docsUrl: string; fields: SettingField[]; enabled: boolean; configured: boolean; active: boolean }[];
  other: { key: string; value: string; updatedAt: string }[];
}

const useSettings = () => useQuery({ queryKey: ["admin-settings"], queryFn: () => api<SettingsResponse>("/admin/settings") });

function useSave(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string | null>) => api("/admin/settings", { method: "PUT", json: { values } }),
    onSuccess: () => {
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
      onDone?.();
    },
  });
}

/** Browser-side checks that mirror the server, so mistakes show next to the field. */
function validate(field: SettingField, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  switch (field.type) {
    case "number": {
      const n = Number(v);
      if (!Number.isFinite(n)) return "Enter a number";
      if (field.min !== undefined && n < field.min) return `Must be at least ${field.min}`;
      if (field.max !== undefined && n > field.max) return `Must be at most ${field.max}`;
      return null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email address";
    case "url":
      try {
        const u = new URL(v);
        return /^https?:$/.test(u.protocol) ? null : "Use a link starting with https://";
      } catch {
        return "Enter a full link starting with https://";
      }
    default:
      return v.length > (field.type === "textarea" || field.type === "secret" ? 5000 : 300) ? "This is too long" : null;
  }
}

function FieldInput({ field, value, onChange, error }: { field: SettingField; value: string; onChange: (v: string) => void; error?: string | null }) {
  const id = field.key.replace(/\./g, "-");
  const a11y = fieldA11y(id, error ?? undefined, !!field.help);
  if (field.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
        <div>
          <label htmlFor={id} className="text-sm font-medium">
            {field.label}
          </label>
          {field.help && (
            <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted-foreground">
              {field.help}
            </p>
          )}
        </div>
        <Switch id={id} checked={value === "true"} onCheckedChange={(c) => onChange(c ? "true" : "false")} aria-describedby={field.help ? `${id}-hint` : undefined} />
      </div>
    );
  }
  return (
    <Field id={id} label={field.label} error={error ?? undefined} hint={field.help}>
      {field.type === "textarea" ? (
        <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} {...a11y} />
      ) : field.type === "select" ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          inputMode={field.type === "number" ? "numeric" : undefined}
          min={field.min}
          max={field.max}
          placeholder={field.default ? `Default: ${field.default}` : undefined}
          {...a11y}
        />
      )}
    </Field>
  );
}

export function SettingsPage() {
  const { data } = useSettings();
  if (!data) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Settings" description="Contact details, listing rules and fees used across the customer site and the provider app." />
      <div className="space-y-6">
        {data.groups.map((g) => (
          <GroupForm key={g.key} group={g} />
        ))}
        {data.other.length > 0 && (
          <Panel title="Other stored values" description="Written by older versions or scripts. Shown for reference only.">
            <dl className="divide-y text-sm">
              {data.other.map((o) => (
                <div key={o.key} className="flex flex-wrap justify-between gap-2 py-2">
                  <dt className="font-mono text-xs">{o.key}</dt>
                  <dd className="max-w-full truncate text-muted-foreground">
                    {o.value} <span className="text-xs">· {formatRelative(o.updatedAt)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}
      </div>
    </>
  );
}

function GroupForm({ group }: { group: SettingsResponse["groups"][number] }) {
  const initial = useMemo(() => Object.fromEntries(group.fields.map((f) => [f.key, f.value])), [group]);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const save = useSave();
  const changed = group.fields.filter((f) => (values[f.key] ?? "") !== (initial[f.key] ?? ""));
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setValues(initial);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = Object.fromEntries(changed.map((f) => [f.key, validate(f, values[f.key] ?? "")]));
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setServerError(null);
    save.mutate(Object.fromEntries(changed.map((f) => [f.key, values[f.key]?.trim() ?? ""])), { onError: (err) => setServerError(errorMessage(err)) });
  }

  return (
    <Panel title={group.title} description={group.description}>
      <form className="space-y-4" noValidate onSubmit={submit}>
        <FormAlert message={serverError} />
        <div className="grid gap-4 md:grid-cols-2">
          {group.fields.map((f) => (
            <div key={f.key} className={f.type === "textarea" || f.type === "boolean" ? "md:col-span-2" : undefined}>
              <FieldInput
                field={f}
                value={values[f.key] ?? ""}
                error={errors[f.key]}
                onChange={(v) => {
                  setValues((s) => ({ ...s, [f.key]: v }));
                  if (errors[f.key]) setErrors((s) => ({ ...s, [f.key]: validate(f, v) }));
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          {changed.length > 0 && (
            <Button type="button" variant="ghost" onClick={() => (setValues(initial), setErrors({}))}>
              Discard
            </Button>
          )}
          <Button type="submit" disabled={!changed.length || save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Save {group.title.toLowerCase()}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

type Plugin = SettingsResponse["plugins"][number];

export function PluginsPage() {
  const { data } = useSettings();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Plugin | null>(null);
  const toggle = useMutation({
    mutationFn: ({ p, on }: { p: Plugin; on: boolean }) => api("/admin/settings", { method: "PUT", json: { values: { [`plugin.${p.key}.enabled`]: on ? "true" : "false" } } }),
    onSuccess: (_r, v) => {
      toast.success(`${v.p.name} ${v.on ? "turned on" : "turned off"}`);
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!data) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Plugins" description="Connect payment, messaging, sign-in and analytics services. Keys and secrets are stored on the server and are never shown again after saving." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.plugins.map((p) => (
          <div key={p.key} className="flex flex-col rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.category}</div>
                <div className="mt-0.5 font-semibold">{p.name}</div>
              </div>
              <Switch checked={p.enabled} disabled={toggle.isPending} onCheckedChange={(on) => toggle.mutate({ p, on })} aria-label={`Use ${p.name}`} />
            </div>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              {p.active ? (
                <Badge variant="success">
                  <CheckCircle2 /> Active
                </Badge>
              ) : p.enabled ? (
                <Badge variant="warning">
                  <KeyRound /> Needs keys
                </Badge>
              ) : (
                <Badge variant="muted">
                  <CircleDashed /> Off
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                <Settings2 /> Configure
              </Button>
            </div>
          </div>
        ))}
      </div>
      {editing && <PluginDialog plugin={data.plugins.find((p) => p.key === editing.key) ?? editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function PluginDialog({ plugin, onClose }: { plugin: Plugin; onClose: () => void }) {
  const fields = plugin.fields.filter((f) => !f.key.endsWith(".enabled"));
  // Secrets start empty: leaving one empty keeps the stored value.
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.type === "secret" ? "" : f.value])));
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const save = useSave(onClose);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const out: Record<string, string | null> = {};
    const errs: Record<string, string | null> = {};
    for (const f of fields) {
      const v = values[f.key] ?? "";
      if (f.type === "secret") {
        if (v.trim()) out[f.key] = v;
        else if (cleared.has(f.key)) out[f.key] = null;
        continue;
      }
      if (v.trim() !== (f.value ?? "")) {
        errs[f.key] = validate(f, v);
        out[f.key] = v.trim();
      }
    }
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    if (!Object.keys(out).length) return onClose();
    setServerError(null);
    save.mutate(out, { onError: (err) => setServerError(errorMessage(err)) });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plugin.name}</DialogTitle>
          <DialogDescription>
            {plugin.description}{" "}
            <a href={plugin.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Setup guide <ExternalLink className="size-3" />
            </a>
          </DialogDescription>
        </DialogHeader>
        <form id="plugin-form" className="space-y-4" noValidate onSubmit={submit}>
          <FormAlert message={serverError} />
          {fields.map((f) => {
            if (f.type !== "secret") {
              return <FieldInput key={f.key} field={f} value={values[f.key] ?? ""} error={errors[f.key]} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />;
            }
            const id = f.key.replace(/\./g, "-");
            const isCleared = cleared.has(f.key);
            return (
              <Field
                key={f.key}
                id={id}
                label={f.label}
                hint={
                  isCleared ? (
                    <>
                      Will be removed when you save.{" "}
                      <button type="button" className="cursor-pointer font-medium text-primary" onClick={() => setCleared((s) => (s.delete(f.key), new Set(s)))}>
                        Undo
                      </button>
                    </>
                  ) : f.isSet ? (
                    <>
                      Saved as <span className="font-mono">{f.value}</span>. Leave empty to keep it.{" "}
                      <button type="button" className="cursor-pointer font-medium text-destructive" onClick={() => setCleared((s) => new Set(s).add(f.key))}>
                        Remove
                      </button>
                    </>
                  ) : (
                    "Not set yet"
                  )
                }
              >
                {f.key.endsWith("service_account") || f.key.endsWith("private_key") ? (
                  <Textarea id={id} rows={4} className="font-mono text-xs" value={values[f.key]} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.isSet ? "Paste a new value to replace it" : "Paste the value"} aria-describedby={`${id}-hint`} autoComplete="off" spellCheck={false} />
                ) : (
                  <Input id={id} type="password" value={values[f.key]} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.isSet ? "Enter a new value to replace it" : "Enter the value"} aria-describedby={`${id}-hint`} autoComplete="new-password" />
                )}
              </Field>
            );
          })}
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="plugin-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
