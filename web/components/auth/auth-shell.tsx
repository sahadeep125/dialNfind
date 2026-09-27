import Image from "next/image";
import { BadgeCheck, PhoneCall, Star } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { AUTH_IMAGE } from "@/lib/stock-images";

const POINTS = [
  { icon: BadgeCheck, t: "Verified local professionals" },
  { icon: Star, t: "Honest ratings from real customers" },
  { icon: PhoneCall, t: "Call providers directly, no booking fees" },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="container-page grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-10 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <div className="relative isolate hidden h-full min-h-[560px] overflow-hidden rounded-xl bg-brand-deep p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Image src={AUTH_IMAGE.src} alt={AUTH_IMAGE.alt} fill sizes="40rem" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,oklch(0.22_0.055_252/0.55)_0%,oklch(0.22_0.055_252/0.2)_40%,oklch(0.22_0.055_252/0.92)_100%)]" />
        <Logo inverted />
        <div>
          <p className="max-w-sm text-2xl font-bold leading-snug">Find a trusted pro nearby, and call them directly.</p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((f) => (
              <li key={f.t} className="flex items-center gap-3 text-white/90">
                <f.icon className="size-5 text-[oklch(0.8_0.13_60)]" aria-hidden /> {f.t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
