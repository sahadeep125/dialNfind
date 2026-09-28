import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BarChart3, BadgeCheck, Check, MessageSquareReply, PhoneCall, Sparkles, Store } from "lucide-react";
import { publicApi } from "@/lib/api";
import { PROVIDER_APP_URL } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PhotoFrame } from "@/components/site/photo-frame";
import { PROVIDER_IMAGE } from "@/lib/stock-images";
import { ClaimSearch } from "@/components/site/claim-search";
import { cn } from "@/lib/utils";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: "List or claim your business",
  description: "List your business on DialNFind for free or claim your existing listing. Get calls from customers nearby, reply to reviews and track leads.",
  path: "/claim",
});

interface Plan {
  id: number;
  name: string;
  price: number;
  leadAccessLimit: number | null;
  featuresJson: string[] | null;
}

export default async function ClaimPage() {
  const { plans } = await publicApi<{ plans: Plan[] }>("/plans", { revalidate: 600, tags: ["plans"] });
  return (
    <div>
      <section className="relative overflow-hidden border-b bg-card">
        <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Store className="size-3.5 text-cta" /> For service providers
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-brand-deep md:text-5xl">Get more calls from customers nearby</h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Thousands of people search DialNFind when something breaks. List your business for free, or claim your existing listing to take control of it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="cta">
                <a href={`${PROVIDER_APP_URL}/register`}>Create a free listing</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#claim">Claim an existing listing</a>
              </Button>
            </div>
          </div>
          <PhotoFrame image={PROVIDER_IMAGE} priority className="mx-auto max-w-xl" />
        </div>
      </section>

      <section className="container-page grid gap-4 pt-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: PhoneCall, t: "Direct calls", d: "Customers call your number. No commission on jobs." },
          { icon: BadgeCheck, t: "Verified badge", d: "Verify once and stand out in every search." },
          { icon: MessageSquareReply, t: "Reply to reviews", d: "Thank customers and answer concerns publicly." },
          { icon: BarChart3, t: "See your numbers", d: "Profile views, calls and WhatsApp enquiries, every day." },
        ].map((f) => (
          <div key={f.t} className="card-surface p-5">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent text-primary">
              <f.icon className="size-5" />
            </span>
            <div className="mt-4 font-semibold">{f.t}</div>
            <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
          </div>
        ))}
      </section>

      <section id="claim" className="container-page scroll-mt-20 py-16">
        <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6 shadow-[var(--shadow-lift)] md:p-10">
          <h2 className="text-2xl font-bold text-brand-deep md:text-3xl">Is your business already listed?</h2>
          <p className="mt-2 text-muted-foreground">
            Search for it below. To claim, we send a verification code to the phone number on the listing. It takes about a minute.
          </p>
          <div className="mt-6">
            <ClaimSearch providerAppUrl={PROVIDER_APP_URL} />
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Plans</span>
          <h2 className="mt-2 text-3xl font-bold text-brand-deep">Start free, upgrade when you grow</h2>
          <p className="mt-3 text-muted-foreground">Paid plans add more leads and insights. They give a small ranking boost, never enough to outrank better-rated providers.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.name === "Pro";
            return (
              <div key={plan.id} className={cn("relative flex flex-col rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]", featured && "border-primary shadow-[var(--shadow-lift)] ring-1 ring-primary")}>
                {featured && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Sparkles className="size-3" /> Most popular
                  </span>
                )}
                <div className="font-semibold">{plan.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">{plan.price ? formatPrice(plan.price) : "Free"}</span>
                  {plan.price > 0 && <span className="text-sm text-muted-foreground">/ month</span>}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {(plan.featuresJson ?? []).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={featured ? "default" : "outline"} className="mt-auto w-full" style={{ marginTop: "1.5rem" }}>
                  <a href={`${PROVIDER_APP_URL}/register`}>{plan.price ? `Choose ${plan.name}` : "Start free"}</a>
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
