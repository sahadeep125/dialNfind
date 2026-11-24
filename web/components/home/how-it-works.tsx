const STEPS = [
  { title: "Say what broke", text: "Type the appliance or the job, such as mixer grinder or plumber, and pick your para, or let the site find you." },
  { title: "See who is closest", text: "Pros line up nearest first, with their address, hours and what they fix. Open any of them for the full picture." },
  { title: "Call or WhatsApp them", text: "You talk to the pro directly and agree the job and the price. KaajVa adds no booking fee or commission." },
];

/** The three steps as one line of the journey, each step a short sentence under a large numeral. */
export function HowItWorks() {
  return (
    <ol className="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
      {STEPS.map((step, i) => (
        <li key={step.title} className="md:px-8 md:first:pl-0 md:last:pr-0">
          <span className="font-display text-5xl font-extrabold leading-none tabular-nums text-cta-strong md:text-6xl" aria-hidden>
            {i + 1}
          </span>
          <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
          <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
