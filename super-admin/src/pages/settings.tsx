import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Facts } from "@/components/admin-ui";
import { formatRelative } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "email" | "url" | "select" | "textarea";
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
      return v.length > (field.type === "textarea" ? 5000 : 300) ? "This is too long" : null;
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
        <EmailPanel />
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

interface MailConfig {
  host: string;
  port: number;
  user: string;
  from: string;
  replyTo: string;
  hasPassword: boolean;
}

/** Shows the SMTP settings the server runs with and sends a test email, reporting the server's exact error. */
function EmailPanel() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["admin-settings-email"], queryFn: () => api<{ config: MailConfig }>("/admin/settings/email") });
  const [to, setTo] = useState(user?.email ?? "");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const send = useMutation({
    mutationFn: () => api<{ response: string }>("/admin/settings/email/test", { method: "POST", json: { to: to.trim() } }),
    onSuccess: ({ response }) => {
      setResult({ ok: true, text: `Sent. The mail server replied: ${response}` });
      toast.success("Test email sent");
    },
    onError: (err) => setResult({ ok: false, text: errorMessage(err) }),
  });
  const c = data?.config;

  return (
    <Panel title="Email" description="Sign-up codes, password resets and notifications go out through this mail server. Change these values in the server's .env file.">
      {c && (
        <Facts
          items={[
            ["SMTP server", c.host ? `${c.host}:${c.port}` : "Not set (emails are only printed to the server log)"],
            ["Signs in as", c.user ? `${c.user}${c.hasPassword ? "" : " (no password set)"}` : "No username"],
            ["Sent from", c.from],
            ["Replies go to", c.replyTo],
          ]}
        />
      )}
      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setResult(null);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) return setResult({ ok: false, text: "Enter a valid email address" });
          send.mutate();
        }}
      >
        <Field id="test-email-to" label="Send a test email to" className="flex-1">
          <Input id="test-email-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send test email
        </Button>
      </form>
      {result && <p className={`mt-3 text-sm break-words ${result.ok ? "text-success" : "text-destructive"}`} role="status">{result.text}</p>}
    </Panel>
  );
}
