import Image from "next/image";
import { STEP_IMAGES } from "@/lib/stock-images";

const STEPS = [
  {
    image: STEP_IMAGES.search,
    title: "Tell us what you need",
    text: "Search a service like AC repair or a plumber and choose your area. We show professionals who serve it.",
  },
  {
    image: STEP_IMAGES.compare,
    title: "Compare local pros",
    text: "Check ratings, reviews, verification, starting prices and who is open right now, side by side.",
  },
  {
    image: STEP_IMAGES.call,
    title: "Call or WhatsApp directly",
    text: "Contact the pro you prefer straight from their profile. No middleman, no booking fees, no commission.",
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
      {STEPS.map((step, i) => (
        <li key={step.title}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <Image src={step.image.src} alt={step.image.alt} fill sizes="(min-width: 768px) 26rem, 100vw" className="object-cover" />
            <span className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-md bg-cta font-display text-base font-bold text-white shadow-sm">
              {i + 1}
            </span>
          </div>
          <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
