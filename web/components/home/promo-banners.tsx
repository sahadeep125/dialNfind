import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessIllustration } from "@/components/illustrations/spots";
import { LogoMark } from "@/components/site/logo";
import { CategoryGlyph } from "@/components/site/category-icon";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/config";
import { DEFAULT_LOCATION } from "@/lib/default-location";
import { cn } from "@/lib/utils";

/** "Get the app" beside "Are you a service provider?"; the app banner only shows when a store link is configured. */
export function PromoBanners({ providerImage }: { providerImage: string | null }) {
  const hasApp = Boolean(APP_STORE_URL || PLAY_STORE_URL);
  return (
    <section className="container-page pt-2">
      <div className={cn("grid gap-5", hasApp && "lg:grid-cols-[1.55fr_1fr]")}>
        {hasApp && <AppBanner />}
        <ProviderBanner image={providerImage} wide={!hasApp} />
      </div>
    </section>
  );
}

function AppBanner() {
  return (
    <div className="relative isolate flex min-h-64 overflow-hidden rounded-xl border bg-[linear-gradient(110deg,oklch(0.975_0.012_255),oklch(0.94_0.035_262))] p-7 md:p-9">
      <div className="max-w-sm md:max-w-[55%]">
        <h2 className="text-2xl font-bold text-foreground md:text-[1.75rem]">Get the DialNFind App</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground/70">Find and connect with local service professionals on the go. Faster, easier and always at your fingertips.</p>
        <div className="mt-6 flex flex-wrap gap-3">
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
      <div className="pointer-events-none absolute -bottom-16 right-4 hidden md:block lg:right-6" aria-hidden>
        <div className="relative h-72 w-[19rem]">
          <PhoneMock className="absolute left-0 top-0 -rotate-6" />
          <PhoneMock className="absolute left-36 top-8 rotate-6 scale-90" compact />
        </div>
      </div>
    </div>
  );
}

function ProviderBanner({ image, wide }: { image: string | null; wide: boolean }) {
  return (
    <div className="relative isolate flex min-h-64 items-center overflow-hidden rounded-xl border bg-[linear-gradient(110deg,oklch(0.985_0.012_75),oklch(0.965_0.03_70))] p-7 md:p-9">
      <div className={cn("relative z-10", wide ? "max-w-xl" : "max-w-[60%]")}>
        <h2 className="text-2xl font-bold text-foreground md:text-[1.75rem]">Are you a service provider?</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground/70">Grow your business, get more customers and build your reputation.</p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/claim">
            Join as a Provider <ArrowRight />
          </Link>
        </Button>
      </div>
      {image ? (
        <div className={cn("absolute bottom-0 right-0 top-0", wide ? "w-[40%]" : "w-[42%]")}>
          <Image src={image} alt="" fill className="object-cover object-top" sizes="(min-width: 1024px) 18rem, 40vw" />
        </div>
      ) : (
        <BusinessIllustration className={cn("pointer-events-none absolute -right-6 bottom-0 w-[46%] max-w-72 opacity-95", wide && "right-8 w-[34%]")} />
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
      className="inline-flex h-14 items-center gap-2.5 rounded-xl bg-black px-4 text-white shadow-sm transition-transform hover:-translate-y-0.5"
      aria-label={`${caption} ${name}`}
    >
      {children}
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-medium tracking-wide text-white/80">{caption}</span>
        <span className="mt-1 text-lg font-semibold">{name}</span>
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

/** A small drawn phone showing the app's home screen, so the banner needs no screenshot. */
function PhoneMock({ className, compact = false }: { className?: string; compact?: boolean }) {
  const categories = [
    { slug: "home-appliances", label: "AC Repair" },
    { slug: "electricians", label: "Electrician" },
    { slug: "plumbing", label: "Plumber" },
  ];
  return (
    <div className={cn("w-40 overflow-hidden rounded-[1.75rem] border-[6px] border-[oklch(0.22_0.03_262)] bg-card shadow-[0_24px_48px_-16px_rgb(16_24_40/0.35)]", className)}>
      <div className="flex h-72 flex-col px-2.5 pt-2">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[oklch(0.22_0.03_262)]" />
        <div className="mt-2.5 flex items-center justify-center gap-1">
          <LogoMark className="size-4" />
          <span className="text-[10px] font-bold text-brand-deep">
            Dial<span className="text-primary">N</span>Find
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-1 rounded-md border px-1.5 py-1 text-[7px] text-muted-foreground">
          <Search className="size-2.5" /> Search for a service...
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[7px] font-medium">
          <MapPin className="size-2.5 text-primary" /> {DEFAULT_LOCATION.city}
        </div>
        {compact ? (
          <div className="mt-2 flex-1 rounded-md bg-[linear-gradient(135deg,oklch(0.92_0.05_200),oklch(0.9_0.06_150))]" />
        ) : (
          <>
            <div className="mt-2.5 grid grid-cols-3 gap-1">
              {categories.map((c) => (
                <div key={c.slug} className="flex flex-col items-center gap-0.5 rounded-md border py-1">
                  <CategoryGlyph slug={c.slug} className="size-3 text-primary" />
                  <span className="text-[6px] text-foreground/70">{c.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md border p-1.5">
              <div className="size-6 shrink-0 rounded bg-[oklch(0.93_0.04_225)]" />
              <div className="min-w-0">
                <div className="truncate text-[7px] font-semibold">AC Repair Experts</div>
                <div className="flex items-center gap-0.5 text-[6px] text-muted-foreground">
                  <Star className="size-2 text-warning" fill="currentColor" strokeWidth={0} /> 4.8 · Open now
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
