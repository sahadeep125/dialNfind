import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTH_IMAGE } from "@/lib/stock-images";

const PROVIDER_PERKS = [
  { title: "Free listing", text: "No sign-up fee and no commission on the jobs you take." },
  { title: "Direct contact", text: "Customers call or WhatsApp your own number." },
  { title: "Your own dashboard", text: "Reply to reviews and see who contacted you." },
];

/** "For businesses": list or claim a listing. The app has its own band (app-promo.tsx). */
export function PromoBanners() {
  return (
    <div className="space-y-5">
      <div className="grid overflow-hidden rounded-lg bg-primary text-white lg:grid-cols-2">
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
          <h2 className="text-3xl font-bold leading-tight text-white md:text-[2.5rem]">List your business on KaajVa for free</h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
            Already in our directory? Claim the listing and keep your phone number, hours and prices up to date. New here? Add your business in a few minutes.
          </p>
          <dl className="mt-8 grid gap-5 border-t border-white/15 pt-6 sm:grid-cols-3">
            {PROVIDER_PERKS.map((perk) => (
              <div key={perk.title}>
                <dt className="text-[15px] font-semibold text-white">{perk.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-white/70">{perk.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="cta" size="lg" className="w-full sm:w-auto">
              <Link href="/claim">
                List your business <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="w-full text-white ring-1 ring-white/30 hover:bg-white/10 hover:text-white sm:w-auto">
              <Link href="/about#providers">See how listing works</Link>
            </Button>
          </div>
        </div>
        <div className="relative min-h-72 overflow-hidden lg:min-h-[34rem]">
          <Image src={AUTH_IMAGE.src} alt={AUTH_IMAGE.alt} fill sizes="(min-width: 1024px) 40rem, 100vw" className="object-cover object-[50%_40%]" />
        </div>
      </div>

    </div>
  );
}
export function StoreBadge({ href, caption, name, children }: { href: string; caption: string; name: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-black px-4 text-white transition-opacity hover:opacity-85"
      aria-label={`${caption} ${name}`}
    >
      {children}
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-medium tracking-wide text-white/80">{caption}</span>
        <span className="mt-0.5 text-base font-semibold">{name}</span>
      </span>
    </a>
  );
}

export function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 fill-white" aria-hidden>
      <path d="M16.37 12.64c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.96-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.51 1.25-2.58-.03-.01-2.4-.92-2.42-3.65ZM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27Z" />
    </svg>
  );
}

export function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <path d="M3.6 2.3c-.2.2-.3.6-.3 1v17.4c0 .4.1.8.3 1l9.6-9.7-9.6-9.7Z" fill="#00d7fe" />
      <path d="m16.4 15.2-3.2-3.2L3.6 21.7c.4.4.9.4 1.6.1l11.2-6.6Z" fill="#f63448" />
      <path d="M16.4 8.8 5.2 2.2c-.7-.4-1.2-.3-1.6.1l9.6 9.7 3.2-3.2Z" fill="#00f076" />
      <path d="m20.1 10.9-3.7-2.1-3.2 3.2 3.2 3.2 3.7-2.1c1.1-.6 1.1-1.6 0-2.2Z" fill="#ffc900" />
    </svg>
  );
}
