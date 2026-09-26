import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getAppConfig } from "@/lib/app-config";
import { LEGAL_DOCS, type LegalDocKey } from "@/lib/legal";

/** Terms or privacy for customers, with a link to the published version when one is set in the admin console. */
export async function LegalPage({ doc }: { doc: LegalDocKey }) {
  const config = await getAppConfig();
  const content = LEGAL_DOCS[doc];
  const latest = doc === "terms" ? config.terms_url : config.privacy_url;
  const other: LegalDocKey = doc === "terms" ? "privacy" : "terms";

  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-brand-deep md:text-4xl">{content.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {content.updated}</p>
      {latest && (
        <a href={latest} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Read the latest version online <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
      <p className="mt-6 leading-relaxed">{content.intro}</p>
      <div className="mt-8 space-y-7">
        {content.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">
        See also our{" "}
        <Link href={`/${other}`} className="font-medium text-primary hover:underline">
          {LEGAL_DOCS[other].title.toLowerCase()}
        </Link>
        , or{" "}
        <Link href="/contact" className="font-medium text-primary hover:underline">
          contact us
        </Link>{" "}
        with any questions.
      </p>
    </article>
  );
}
