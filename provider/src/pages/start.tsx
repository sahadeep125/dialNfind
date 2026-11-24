import { Link, Navigate } from "react-router";
import { ArrowRight, Clock, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export function StartPage() {
  const { user, providerState } = useAuth();
  if (providerState?.provider) return <Navigate to="/" replace />;
  const pending = providerState?.claims.filter((c) => c.status === "pending") ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-brand-deep md:text-4xl">Welcome, {user?.name.split(" ")[0]}. Let us get you listed.</h1>
      <p className="mt-3 text-muted-foreground">
        Plumbers, electricians, tutors, drivers and other independent professionals list themselves under their own name, with no business registration needed. Businesses are welcome too.
      </p>

      {pending.length > 0 && (
        <div className="mt-6 rounded-2xl border border-warning/50 bg-warning-soft p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="size-4" /> Claim in progress
          </div>
          {pending.map((c) => (
            <p key={c.id} className="mt-1 text-muted-foreground">
              {c.provider.businessName}, {c.provider.city}. {c.method === "document" ? "Our team is reviewing your documents." : "Enter the code we sent to finish."}
            </p>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link to="/onboarding" className="group flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]">
          <span className="flex size-12 items-center justify-center rounded-xl bg-success-soft text-success">
            <Sparkles className="size-6" />
          </span>
          <div className="mt-5 flex items-center gap-2">
            <h2 className="text-xl font-bold">Create a new listing</h2>
            <Badge variant="success">Free</Badge>
          </div>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            List yourself as an individual professional (Deep Saha – Plumber – Ghoraguli) or as a business. Services, areas and hours in a few short steps.
          </p>
          <span className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary">
            Start setup <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link to="/claim" className="group flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
            <Search className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-bold">Claim my existing listing</h2>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">Your shop or service is already on KaajVa with reviews. Send a document that shows it is yours and our team gives you access.</p>
          <span className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary">
            Find my listing <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
