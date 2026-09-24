import { BadgeCheck, PhoneCall, Star } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { TrustIllustration } from "@/components/illustrations/spots";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="container-page grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-bold text-brand-deep">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <div className="relative hidden h-full min-h-[560px] overflow-hidden rounded-3xl bg-brand-deep p-10 text-white lg:flex lg:flex-col">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative [&_span]:text-white">
          <Logo className="[&_span]:!text-white" />
        </div>
        <TrustIllustration className="relative mx-auto my-auto w-80" />
        <div className="relative space-y-3">
          {[
            { icon: BadgeCheck, t: "Verified local professionals" },
            { icon: Star, t: "Honest ratings from real customers" },
            { icon: PhoneCall, t: "Call providers directly, no booking fees" },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-3 text-[oklch(0.88_0.03_266)]">
              <f.icon className="size-5 text-[oklch(0.8_0.1_200)]" /> {f.t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
