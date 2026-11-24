import Link from "next/link";

const POINTS = [
  { title: "Checks shown on every profile", text: "Each listing says which checks were done: phone, business documents, location or ID." },
  { title: "Reviews tied to real contact", text: "A review from someone who contacted the business through KaajVa carries a Verified contact tag." },
  { title: "Ranking nobody can buy", text: "Results weigh rating, verification and distance. There is no paid placement." },
  { title: "No commission on jobs", text: "You and the business agree the price. KaajVa never adds a fee." },
];

/** The listing rules, as a plain ruled list under "How it works". */
export function TrustPoints() {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 className="text-xl font-semibold">The rules every listing follows</h3>
        <Link href="/about#trust" className="link-draw text-sm font-semibold text-primary">
          Read how listings are checked
        </Link>
      </div>
      <ul className="mt-6 grid border-t sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p) => (
          <li key={p.title} className="border-b py-5 sm:pr-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
            <h4 className="text-[15px] font-semibold">{p.title}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
