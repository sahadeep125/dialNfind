import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/config";
import { PROVIDER_IMAGE } from "@/lib/stock-images";

const PROVIDER_PERKS = ["Free listing, no commission on jobs", "Customers call and WhatsApp you directly", "Reply to reviews and see who contacted you"];

/** "Are you a service provider?" with a photo, then a slim "Get the app" strip when a store link is configured. */
export function PromoBanners() {
  const hasApp = Boolean(APP_STORE_URL || PLAY_STORE_URL);
  return (
    <div className="space-y-5">
      <div className="grid overflow-hidden rounded-xl bg-primary text-white md:grid-cols-[1.1fr_1fr]">
        <div className="p-7 sm:p-10 lg:p-14">
          <p className="eyebrow mb-3 text-[oklch(0.8_0.13_60)]">For professionals</p>
          <h2 className="text-2xl font-bold text-white md:text-[2rem] md:leading-tight">Grow your business with local customers</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">
            List your services for free and get found by people nearby who are ready to hire.
          </p>
          <ul className="mt-6 space-y-2.5">
            {PROVIDER_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2.5 text-[15px] text-white/90">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cta">
                  <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="cta" size="lg">
              <Link href="/claim">
                List your business <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white ring-1 ring-white/25 hover:bg-white/10 hover:text-white">
              <Link href="/about#providers">How listing works</Link>
            </Button>
          </div>
        </div>
        <div className="relative min-h-64 md:min-h-full">
          <Image src={PROVIDER_IMAGE.src} alt={PROVIDER_IMAGE.alt} fill sizes="(min-width: 768px) 38rem, 100vw" className="object-cover" />
        </div>
      </div>

      {hasApp && (
        <div className="flex flex-col items-start justify-between gap-5 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-xl font-bold">Get the DialNFind app</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">Find and call local professionals on the go, and keep your saved pros in one place.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            {APP_STORE_URL && (
              <StoreBadge href={APP_STORE_URL} caption="Download on the" name="App Store">
                <AppleLogo />
              </StoreBadge>
            )}
            {PLAY_STORE_URL && (
              <StoreBadge href={PLAY_STORE_URL} caption="GET IT ON" name="Google Play">
                <PlayLogo />
              </StoreBadge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreBadge({ href, caption, name, children }: { href: string; caption: string; name: string; children: React.ReactNode }) {
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

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 fill-white" aria-hidden>
      <path d="M16.37 12.64c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.96-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.51 1.25-2.58-.03-.01-2.4-.92-2.42-3.65ZM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27Z" />
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <path d="M3.6 2.3c-.2.2-.3.6-.3 1v17.4c0 .4.1.8.3 1l9.6-9.7-9.6-9.7Z" fill="#00d7fe" />
      <path d="m16.4 15.2-3.2-3.2L3.6 21.7c.4.4.9.4 1.6.1l11.2-6.6Z" fill="#f63448" />
      <path d="M16.4 8.8 5.2 2.2c-.7-.4-1.2-.3-1.6.1l9.6 9.7 3.2-3.2Z" fill="#00f076" />
      <path d="m20.1 10.9-3.7-2.1-3.2 3.2 3.2 3.2 3.7-2.1c1.1-.6 1.1-1.6 0-2.2Z" fill="#ffc900" />
    </svg>
  );
}
