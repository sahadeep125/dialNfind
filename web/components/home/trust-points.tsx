import Link from "next/link";
import { BadgeCheck, PhoneCall, Scale, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const POINTS = [
  { icon: BadgeCheck, title: "Verification you can see", text: "Every profile lists which checks were done: phone, business documents, location or ID." },
  { icon: Star, title: "Honest reviews", text: "Reviews from people who contacted a pro through DialNFind carry a Verified contact tag." },
  { icon: Scale, title: "Fair ranking", text: "Results weigh ratings, verification and distance. Paid plans add only a small boost." },
  { icon: PhoneCall, title: "Zero commission", text: "You agree the job and the price with the pro directly. We never add fees." },
];

/** "Why DialNFind": the trust promises, written to match the About page. */
export function TrustPoints() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-16">
      <div>
        <p className="eyebrow mb-2">Why DialNFind</p>
        <h2 className="text-2xl font-bold md:text-3xl">A local directory built on trust, not ads</h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          We show you who a professional is, what has been checked and what customers say, so you can choose with confidence and deal with them directly.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/about#trust">How we keep listings trustworthy</Link>
        </Button>
      </div>
      <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
        {POINTS.map((p) => (
          <li key={p.title} className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
              <p.icon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
