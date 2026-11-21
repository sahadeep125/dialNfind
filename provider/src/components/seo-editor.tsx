import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import { type SeoAnalysis, SEO_LIMITS, seoFieldErrors, splitKeywords, squash } from "@/lib/seo";
import { useDebounced } from "@/lib/use-debounced";
import { Panel } from "@/components/page-header";
import { SaveBar } from "@/components/common";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { GradeLabel, LengthHint, NotIndexedNote, SearchPreview, SeoCompletion, SeoReport, SeoScoreRing } from "@/components/seo";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const L = SEO_LIMITS;

export interface SeoFields {
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  seoKeywords: string[];
  seoNoIndex?: boolean;
}

type Values = { seoTitle: string; seoDescription: string; focusKeyword: string; seoKeywords: string; seoNoIndex: boolean };
const toValues = (f: SeoFields): Values => ({
  seoTitle: f.seoTitle ?? "",
  seoDescription: f.seoDescription ?? "",
  focusKeyword: f.focusKeyword ?? "",
  seoKeywords: f.seoKeywords.join("\n"),
  seoNoIndex: f.seoNoIndex ?? false,
});

/**
 * The SEO editor shared by the business dashboard and the admin console: a Google preview, the search text, and
 * the live score with every check, re-scored on the server as the text changes (POST `checkPath`).
 */
export function SeoEditor({
  seo: saved,
  fields,
  slug,
  checkPath,
  onSave,
  saving,
  saveError,
  allowNoIndex = false,
  action,
  version,
}: {
  seo: SeoAnalysis;
  fields: SeoFields;
  slug: string;
  checkPath: string;
  onSave: (body: SeoFields) => void;
  saving: boolean;
  saveError?: string | null;
  /** Admin only: hide the profile from search engines. */
  allowNoIndex?: boolean;
  /** A link to the page that fixes a check. */
  action?: (checkKey: string) => React.ReactNode;
  /** Changes whenever the saved profile changes, so the live check starts again. */
  version?: string;
}) {
  const initial = useMemo(() => toValues(fields), [fields]);
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setValues(initial);
    setTouched(false);
  }, [initial]);
  const set = (patch: Partial<Values>) => (setValues((v) => ({ ...v, ...patch })), setTouched(true));
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const errors = touched ? seoFieldErrors(values) : {};

  const draft = useDebounced({ seoTitle: values.seoTitle, seoDescription: values.seoDescription, focusKeyword: values.focusKeyword, seoKeywords: splitKeywords(values.seoKeywords) }, 400);
  const live = useQuery({
    queryKey: ["seo-check", checkPath, draft, version],
    queryFn: () => api<{ seo: SeoAnalysis }>(checkPath, { method: "POST", json: draft }).then((r) => r.seo),
    placeholderData: keepPreviousData,
    enabled: dirty,
  });
  const seo = dirty && live.data ? live.data : saved;
  const keywordCount = splitKeywords(values.seoKeywords).length;

  function save() {
    setTouched(true);
    if (Object.keys(seoFieldErrors(values)).length) return;
    onSave({
      seoTitle: squash(values.seoTitle) || null,
      seoDescription: squash(values.seoDescription) || null,
      focusKeyword: squash(values.focusKeyword) || null,
      seoKeywords: splitKeywords(values.seoKeywords),
      ...(allowNoIndex ? { seoNoIndex: values.seoNoIndex } : {}),
    });
  }

  return (
    <div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Google preview" description={seo.titleSource === "automatic" ? "Leave a field empty and KaajVa writes it from your profile, with your service and city." : undefined}>
            <SearchPreview title={seo.title} url={`${WEB_URL.replace(/^https?:\/\//, "")} › providers › ${slug}`} description={seo.description} />
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="text-muted-foreground">Targets:</span>
              <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-primary">{seo.focusKeyword}</span>
              {seo.keywords
                .filter((k) => k.toLowerCase() !== seo.focusKeyword.toLowerCase())
                .slice(0, 5)
                .map((k) => (
                  <span key={k} className="rounded-full border px-2 py-0.5 text-muted-foreground">
                    {k}
                  </span>
                ))}
            </div>
          </Panel>
          <Panel title="Search engine text">
            <FormAlert message={saveError} />
            <div className="grid gap-4">
              <Field
                id="seoTitle"
                label="SEO title"
                optional
                error={errors.seoTitle}
                hint={
                  <>
                    <LengthHint length={squash(values.seoTitle).length} min={L.title.min} max={L.title.max} hard={L.title.hard} />. Start with your business name, then the service and the city, e.g. “Sharma Electricals: Electrician in Siliguri”. “ | KaajVa” is added when it fits.
                  </>
                }
              >
                <Input value={values.seoTitle} placeholder={seo.titleSource === "automatic" ? seo.title : ""} onChange={(e) => set({ seoTitle: e.target.value })} {...fieldA11y("seoTitle", errors.seoTitle, true)} />
              </Field>
              <Field
                id="seoDescription"
                label="Meta description"
                optional
                error={errors.seoDescription}
                hint={
                  <>
                    <LengthHint length={squash(values.seoDescription).length} min={L.description.min} max={L.description.max} hard={L.description.hard} />. What you do, where, and why customers should call you.
                  </>
                }
              >
                <Textarea rows={3} value={values.seoDescription} placeholder={seo.descriptionSource === "automatic" ? seo.description : ""} onChange={(e) => set({ seoDescription: e.target.value })} {...fieldA11y("seoDescription", errors.seoDescription, true)} />
              </Field>
              <Field id="focusKeyword" label="Focus keyword" optional error={errors.focusKeyword} hint={`The search your customers type. Leave it empty to target “${seo.focusKeywordSource === "automatic" ? seo.focusKeyword : `${seo.service.toLowerCase()} in your city`}”. Use it in the title, the meta description and the first sentence of your description.`}>
                <Input value={values.focusKeyword} placeholder={`${seo.service.toLowerCase()} in Siliguri`} onChange={(e) => set({ focusKeyword: e.target.value })} {...fieldA11y("focusKeyword", errors.focusKeyword, true)} />
              </Field>
              <Field id="seoKeywords" label="Secondary keywords" optional error={errors.seoKeywords} hint={`${keywordCount} / ${L.keywords}. One per line (or separated by commas): related searches such as “inverter repair Siliguri” or “electrician near Sevoke Road”.`}>
                <Textarea rows={4} value={values.seoKeywords} onChange={(e) => set({ seoKeywords: e.target.value })} {...fieldA11y("seoKeywords", errors.seoKeywords, true)} />
              </Field>
              {allowNoIndex && (
                <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 text-sm">
                  <span>
                    <span className="font-medium">Hide from search engines</span>
                    <span className="block text-xs text-muted-foreground">The page stays on KaajVa but tells Google not to show it, and leaves the sitemap. Use it for duplicates or listings under investigation.</span>
                  </span>
                  <Switch checked={values.seoNoIndex} onCheckedChange={(c) => set({ seoNoIndex: c })} aria-label="Hide from search engines" />
                </label>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:h-fit">
          <Panel>
            <div className="flex items-center gap-4">
              <SeoScoreRing score={seo.score} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">SEO score</span>
                  <GradeLabel score={seo.score} />
                  {live.isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Checking" />}
                </div>
                <p className="text-xs text-muted-foreground">{dirty ? "With your unsaved changes." : "As saved."} 80 or more is good.</p>
                <SeoCompletion analysis={seo} />
              </div>
            </div>
            <div className="mt-4">
              <NotIndexedNote analysis={seo} />
            </div>
          </Panel>
          <Panel>
            <SeoReport analysis={seo} action={action} />
          </Panel>
        </aside>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => (setValues(initial), setTouched(false))} />
    </div>
  );
}
