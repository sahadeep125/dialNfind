import Image from "next/image";
import { STEP_IMAGES } from "@/lib/stock-images";

const STEPS = [
  { title: "Search a service and your area", text: "Type what you need, such as AC repair or a home tutor, and pick your part of the city." },
  { title: "Compare the businesses", text: "Each listing shows the phone number, opening hours, which checks were done and what customers wrote." },
  { title: "Call or WhatsApp them yourself", text: "Agree the job and the price with the business directly. KaajVa adds no booking fee or commission." },
];

/** The three steps beside one photograph. */
export function HowItWorks() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <Image src={STEP_IMAGES.call.src} alt={STEP_IMAGES.call.alt} fill sizes="(min-width: 1024px) 36rem, 100vw" className="object-cover" />
      </div>
      <ol className="divide-y border-y">
        {STEPS.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 py-6">
            <span className="font-display text-2xl font-semibold tabular-nums text-cta-strong">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
