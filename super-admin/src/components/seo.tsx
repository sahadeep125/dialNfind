import { AlertTriangle, CheckCircle2, EyeOff, Lightbulb, XCircle } from "lucide-react";
import { type SeoAnalysis, type SeoCategory, type SeoStatus, seoGrade } from "@/lib/seo";
import { cn } from "@/lib/utils";

const GRADE_STYLE = {
  good: "bg-success-soft text-success",
  fair: "bg-warning-soft text-[oklch(0.45_0.1_60)]",
  poor: "bg-destructive/10 text-destructive",
} as const;
const GRADE_LABEL = { good: "Good", fair: "Needs work", poor: "Poor" } as const;

/** A compact score for tables. */
export function SeoScoreBadge({ score, className }: { score: number; className?: string }) {
  const grade = seoGrade(score);
  return (
    <span className={cn("inline-flex min-w-10 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", GRADE_STYLE[grade], className)} title={`SEO score ${score} of 100: ${GRADE_LABEL[grade]}`}>
      {score}
    </span>
  );
}

/** The score as a ring. */
export function SeoScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const grade = seoGrade(score);
  const r = 42;
  const c = 2 * Math.PI * r;
  const color = grade === "good" ? "var(--color-success)" : grade === "fair" ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`SEO score ${score} of 100, ${GRADE_LABEL[grade]}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className="transition-[stroke-dashoffset] duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold tabular-nums">{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">of 100</span>
      </div>
    </div>
  );
}

export function GradeLabel({ score }: { score: number }) {
  const grade = seoGrade(score);
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", GRADE_STYLE[grade])}>{GRADE_LABEL[grade]}</span>;
}

/** "18 of 23 checks pass", for the completion bar. */
export function SeoCompletion({ analysis }: { analysis: SeoAnalysis }) {
  const passed = analysis.checks.filter((c) => c.status === "pass").length;
  const total = analysis.checks.length;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">
          {passed} of {total} checks pass
        </span>
        <span className="text-muted-foreground tabular-nums">{Math.round((passed / total) * 100)}% complete</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={passed} aria-label="SEO checks passed">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(passed / total) * 100}%` }} />
      </div>
    </div>
  );
}

/** Why search engines cannot show the page, when they cannot. */
export function NotIndexedNote({ analysis }: { analysis: SeoAnalysis }) {
  if (analysis.indexable || !analysis.notIndexedReason) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-[oklch(0.42_0.1_60)]">
      <EyeOff className="mt-0.5 size-4 shrink-0" /> {analysis.notIndexedReason}
    </p>
  );
}

/** How the page shows up in Google: title, address and description, cut where Google cuts them. */
export function SearchPreview({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <div className="rounded-xl border bg-background p-4" aria-label="Search result preview">
      <div className="truncate text-xs text-muted-foreground">{url}</div>
      <div className="mt-1 line-clamp-1 text-lg leading-snug text-[#1a0dab]">{title}</div>
      <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}

/** "52 characters · good length", amber outside the ideal range and red past the hard limit. */
export function LengthHint({ length, min, max, hard, unit = "characters" }: { length: number; min: number; max: number; hard?: number; unit?: string }) {
  const tone = length === 0 ? "text-muted-foreground" : hard && length > hard ? "text-destructive" : length < min || length > max ? "text-[oklch(0.5_0.12_60)]" : "text-success";
  const advice = length === 0 ? "" : length < min ? ` · aim for ${min}-${max}` : length > max ? ` · search results cut after ${max}` : " · good length";
  return (
    <span className={tone}>
      {length} {unit}
      {advice}
    </span>
  );
}

const STATUS_ICON: Record<SeoStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Passed" />,
  warn: <AlertTriangle className="size-4 shrink-0 text-warning" aria-label="Could be better" />,
  fail: <XCircle className="size-4 shrink-0 text-destructive" aria-label="Missing" />,
};

const CATEGORY_LABEL: Record<SeoCategory, string> = {
  search: "How it looks in Google",
  keywords: "Keywords",
  content: "Content",
  media: "Photos",
  details: "Business details",
};

/** The suggestions worth the most points, then every check by category. */
export function SeoReport({ analysis, limit = 6, action, showChecks = true }: { analysis: SeoAnalysis; limit?: number; action?: (checkKey: string) => React.ReactNode; showChecks?: boolean }) {
  const categories = Object.keys(CATEGORY_LABEL) as SeoCategory[];
  return (
    <div className="space-y-5">
      {analysis.suggestions.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb className="size-4 text-warning" /> Do these next
          </h3>
          <ol className="space-y-2">
            {analysis.suggestions.slice(0, limit).map((s) => (
              <li key={s.key} className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 p-2.5 text-sm">
                <span>
                  {s.text} {action?.(s.key)}
                </span>
                <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">+{s.points}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-sm text-success">
          <CheckCircle2 className="size-4" /> Every check passes.
        </p>
      )}
      {showChecks &&
        categories.map((cat) => {
          const checks = analysis.checks.filter((c) => c.category === cat);
          if (!checks.length) return null;
          const earned = checks.reduce((a, c) => a + c.earned, 0);
          const total = checks.reduce((a, c) => a + c.weight, 0);
          return (
            <div key={cat}>
              <h3 className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABEL[cat]}
                <span className="tabular-nums">
                  {earned}/{total}
                </span>
              </h3>
              <ul className="divide-y rounded-lg border">
                {checks.map((c) => (
                  <li key={c.key} className="flex items-start gap-2.5 p-2.5 text-sm">
                    {STATUS_ICON[c.status]}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{c.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {c.earned}/{c.weight}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{c.message}</div>
                      {c.suggestion && <div className="mt-0.5 text-xs">{c.suggestion}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
    </div>
  );
}
