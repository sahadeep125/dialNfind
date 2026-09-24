import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Eye, Flag, Scale, Search, ShieldCheck, Star, Store, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BusinessIllustration, TrustIllustration } from "@/components/illustrations/spots";
import { HeroIllustration } from "@/components/illustrations/hero-illustration";

export const metadata: Metadata = { title: "About DialNFind" };

export default async function AboutPage() {
  const stats = await api<{ providers: number; categories: number; cities: number; reviews: number }>("/stats");
  return (
    <div>
      <section className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">About us</span>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-brand-deep md:text-5xl">Local help should be one search away</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            DialNFind is a directory of local service professionals: electricians, plumbers, appliance technicians, cleaners, tutors and more. You tell us what you need and
            where you are. We show who is nearby, how others rated them, and how to reach them directly.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { v: `${stats.providers}+`, l: "Providers" },
              { v: stats.categories, l: "Categories" },
              { v: `${stats.reviews.toLocaleString("en-IN")}+`, l: "Reviews" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border bg-card p-4">
                <div className="font-display text-2xl font-bold text-brand-deep">{s.v}</div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <HeroIllustration className="mx-auto w-full max-w-lg" />
      </section>

      <section className="border-y bg-card py-16">
        <div className="container-page grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-brand-deep">Why we built it</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              When the TV goes black or a pipe bursts, most people ask neighbours, scroll through old directories, or call numbers that no longer work. Good local professionals
              are out there, but they are hard to find and harder to compare.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We wanted something faster and more honest: a clean search that understands the problem, knows where you are, and puts trustworthy people at the top.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-brand-deep">How it helps you</h2>
            <ul className="mt-4 space-y-4">
              {[
                { icon: Search, t: "Search the way you talk", d: "Type “TV repair” or “AC not cooling”. We map it to the right service." },
                { icon: Eye, t: "Compare at a glance", d: "Ratings, distance, starting prices and who is open right now, side by side." },
                { icon: UserCheck, t: "Contact directly", d: "Call or WhatsApp the provider. No booking fees, no middleman." },
              ].map((i) => (
                <li key={i.t} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <i.icon className="size-5" />
                  </span>
                  <div>
                    <div className="font-semibold">{i.t}</div>
                    <div className="text-sm text-muted-foreground">{i.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="providers" className="container-page grid scroll-mt-20 items-center gap-10 py-16 lg:grid-cols-2">
        <BusinessIllustration className="mx-auto w-full max-w-md" />
        <div>
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">For service providers</span>
          <h2 className="mt-2 text-3xl font-bold text-brand-deep">How providers get listed</h2>
          <ol className="mt-6 space-y-5">
            {[
              { t: "Create or claim a listing", d: "Sign up in the provider app. If your business is already listed, claim it by verifying the phone number on the listing." },
              { t: "Set up your profile", d: "Pick your services from our categories, set prices, hours and the areas you cover." },
              { t: "Get verified", d: "Upload a trade licence or ID. Verified businesses get a badge and rank higher." },
              { t: "Receive calls", d: "Customers call you directly. Track calls, WhatsApp enquiries and reviews from your dashboard." },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                <div>
                  <div className="font-semibold">{s.t}</div>
                  <div className="text-sm text-muted-foreground">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
          <Button asChild size="lg" className="mt-8">
            <Link href="/claim">
              <Store /> List your business
            </Link>
          </Button>
        </div>
      </section>

      <section id="trust" className="scroll-mt-20 bg-[linear-gradient(180deg,oklch(0.965_0.02_266),transparent)] py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">Trust and safety</span>
            <h2 className="mt-2 text-3xl font-bold text-brand-deep">Our approach to trust</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {[
                { icon: BadgeCheck, t: "Verification you can see", d: "Every profile lists which checks were done: phone, business documents, location or ID." },
                { icon: Star, t: "Reviews tied to real contact", d: "Reviews from people who contacted the provider through DialNFind carry a Verified contact tag." },
                { icon: Scale, t: "Fair ranking", d: "Ranking weighs ratings, verification, profile quality and responsiveness. Paid plans add only a small boost." },
                { icon: Flag, t: "Report and review", d: "Anyone can report a listing or review. Our team checks every report and removes abuse." },
                { icon: ShieldCheck, t: "Consent for phone numbers", d: "Providers agree to show their number publicly. We never sell customer data." },
                { icon: Eye, t: "Honest labels", d: "Self-reported numbers, like jobs completed, are labelled “as reported” and never used for ranking." },
              ].map((i) => (
                <div key={i.t} className="rounded-2xl border bg-card p-5">
                  <i.icon className="size-5 text-primary" />
                  <div className="mt-3 font-semibold">{i.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{i.d}</div>
                </div>
              ))}
            </div>
          </div>
          <TrustIllustration className="mx-auto w-full max-w-md" />
        </div>
      </section>

      <section className="container-page pt-8 text-center">
        <h2 className="text-3xl font-bold text-brand-deep">Ready to find help nearby?</h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/search">
            Start searching <ArrowRight />
          </Link>
        </Button>
      </section>
    </div>
  );
}
