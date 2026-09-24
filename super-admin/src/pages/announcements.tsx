import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { EmptyState } from "@/components/common";
import { ConfirmDialog } from "@/components/admin-ui";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const AUDIENCES = {
  all: "Everyone (customers and providers)",
  customers: "All customers",
  providers: "All providers",
  unverified_providers: "Providers who are not fully verified",
} as const;
type Audience = keyof typeof AUDIENCES;

const schema = z.object({
  audience: z.enum(Object.keys(AUDIENCES) as [Audience, ...Audience[]]),
  city: z.string().trim().max(60, "Keep the city under 60 characters"),
  title: z.string().trim().min(3, "Write a title of at least 3 characters").max(80, "Keep the title under 80 characters"),
  body: z.string().trim().min(5, "Write a message of at least 5 characters").max(500, "Keep the message under 500 characters"),
});
type Values = z.infer<typeof schema>;

interface Broadcast {
  id: number;
  createdAt: string;
  sentBy: string;
  audience: Audience;
  city?: string;
  title: string;
  body: string;
  recipients: number;
}

export function AnnouncementsPage() {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<Values | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { audience: "all", city: "", title: "", body: "" }, mode: "onTouched" });
  const { errors } = formState;
  const [audience, city, title, body] = useWatch({ control, name: ["audience", "city", "title", "body"] });
  const cityApplies = audience === "providers" || audience === "unverified_providers";

  const [debouncedCity, setDebouncedCity] = useState(city);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity(city.trim()), 400);
    return () => clearTimeout(t);
  }, [city]);

  const preview = useQuery({
    queryKey: ["broadcast-preview", audience, cityApplies ? debouncedCity : ""],
    queryFn: () => api<{ recipients: number }>("/admin/notifications/preview", { method: "POST", json: { audience, ...(cityApplies && debouncedCity ? { city: debouncedCity } : {}) } }),
  });
  const history = useQuery({ queryKey: ["broadcasts"], queryFn: () => api<{ broadcasts: Broadcast[] }>("/admin/notifications/broadcasts") });

  const send = useMutation({
    mutationFn: (v: Values) => api<{ recipients: number }>("/admin/notifications/broadcast", { method: "POST", json: { audience: v.audience, title: v.title, body: v.body, ...(cityApplies && v.city ? { city: v.city } : {}) } }),
    onSuccess: (r) => {
      toast.success(`Sent to ${r.recipients.toLocaleString("en-IN")} people`);
      setConfirming(null);
      reset();
      void qc.invalidateQueries({ queryKey: ["broadcasts"] });
    },
    onError: (e) => {
      setConfirming(null);
      setServerError(errorMessage(e));
    },
  });

  return (
    <>
      <PageHeader title="Announcements" description="Send an in-app notification to a group of users, such as a new feature, a policy change or planned downtime." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title="New announcement">
          <form
            className="space-y-4"
            noValidate
            onSubmit={handleSubmit((v) => {
              setServerError(null);
              setConfirming(v);
            })}
          >
            <FormAlert message={serverError} />
            <Field id="audience" label="Send to" required>
              <Controller
                control={control}
                name="audience"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="audience" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AUDIENCES) as Audience[]).map((a) => (
                        <SelectItem key={a} value={a}>
                          {AUDIENCES[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {cityApplies && (
              <Field id="city" label="Only providers in this city" error={errors.city} optional>
                <Input placeholder="e.g. Siliguri" {...fieldA11y("city", errors.city)} {...register("city")} />
              </Field>
            )}
            <Field id="title" label="Title" error={errors.title} required hint={`${title.length}/80`}>
              <Input placeholder="e.g. Scheduled maintenance on Sunday" maxLength={80} {...fieldA11y("title", errors.title, true)} {...register("title")} />
            </Field>
            <Field id="body" label="Message" error={errors.body} required hint={`${body.length}/500`}>
              <Textarea rows={5} maxLength={500} placeholder="Keep it short and say what, if anything, people need to do." {...fieldA11y("body", errors.body, true)} {...register("body")} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-primary" />
                {preview.data ? (
                  <span>
                    Reaches <strong>{preview.data.recipients.toLocaleString("en-IN")}</strong> active {preview.data.recipients === 1 ? "account" : "accounts"}
                  </span>
                ) : (
                  <Skeleton className="h-4 w-40" />
                )}
              </span>
              <Button type="submit" disabled={send.isPending || preview.data?.recipients === 0}>
                <Send /> Review and send
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Sent">
          {!history.data ? (
            <Skeleton className="h-40 w-full" />
          ) : history.data.broadcasts.length === 0 ? (
            <EmptyState icon={Megaphone} title="Nothing sent yet" text="Announcements you send show up here." />
          ) : (
            <ul className="divide-y">
              {history.data.broadcasts.map((b) => (
                <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="font-medium">{b.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{b.body}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {AUDIENCES[b.audience] ?? b.audience}
                    {b.city ? ` in ${b.city}` : ""} · {b.recipients?.toLocaleString("en-IN")} people · {b.sentBy}, {formatRelative(b.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      {confirming && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirming(null)}
          title={`Send to ${preview.data?.recipients.toLocaleString("en-IN") ?? "these"} people?`}
          description="Announcements cannot be recalled once sent."
          confirmLabel={send.isPending ? "Sending" : "Send now"}
          busy={send.isPending}
          onConfirm={() => send.mutate(confirming)}
        >
          <div className="rounded-xl border bg-muted/40 p-3 text-sm">
            <div className="font-semibold">{confirming.title}</div>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{confirming.body}</p>
          </div>
          {send.isPending && <Loader2 className="mx-auto size-5 animate-spin text-primary" />}
        </ConfirmDialog>
      )}
    </>
  );
}
