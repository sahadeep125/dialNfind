import { Link } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useAppConfig } from "@/lib/app-config";
import { LEGAL_DOCS, type LegalDocKey } from "@/lib/legal";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";

/** Terms and privacy for business accounts. Public, so they can be read before signing up. */
export function LegalPage({ doc }: { doc: LegalDocKey }) {
  const { user } = useAuth();
  const { data: config } = useAppConfig();
  const content = LEGAL_DOCS[doc];
  const latest = doc === "terms" ? config?.terms_url : config?.privacy_url;
  const other: LegalDocKey = doc === "terms" ? "privacy" : "terms";

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 md:px-6">
          <Logo />
          <Link to={user ? "/" : "/login"} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" /> {user ? "Back to dashboard" : "Log in"}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="text-3xl font-bold text-brand-deep">{content.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {content.updated}</p>
        {latest && (
          <a href={latest} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Read the latest version online <ExternalLink className="size-3.5" />
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
          See also the{" "}
          <Link to={`/${other}`} className="font-medium text-primary hover:underline">
            {LEGAL_DOCS[other].title.toLowerCase()}
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
