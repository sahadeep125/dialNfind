import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import { api, apiOrNull } from "@/lib/api";
import { getSession } from "@/lib/session";
import { PROVIDER_APP_URL } from "@/lib/config";
import type { Paged, ProviderCard as ProviderCardType, ProviderDetail, Review } from "@/lib/types";
import { formatDate, formatPhone, formatPrice, telHref } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { categoryTone } from "@/components/site/category-icon";
import { ProviderAvatar } from "@/components/provider/provider-avatar";
import { RatingStars } from "@/components/provider/rating";
import { ContactButtons } from "@/components/provider/contact-buttons";
import { FavoriteButton } from "@/components/provider/favorite-button";
import { OpenStatus, ProviderCard } from "@/components/provider/provider-card";
import { ReviewsList } from "@/components/provider/reviews-list";
import { ReviewForm } from "@/components/provider/review-form";
import { ReportListing, ShareButton } from "@/components/provider/share-report";
import { LocationMap } from "@/components/provider/location-map";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await apiOrNull<{ provider: ProviderDetail }>(`/providers/${slug}`, { auth: false });
  if (!data) return { title: "Provider not found" };
  const p = data.provider;
  return {
    title: `${p.businessName} - ${p.primaryCategory?.name ?? "Services"} in ${p.locality ?? p.city}`,
    description: p.description?.slice(0, 155),
  };
}

const VERIFICATION_LABEL: Record<string, string> = {
  phone: "Phone number verified",
  business: "Business documents verified",
  location: "Business location verified",
  id_proof: "Owner ID verified",
};

export default async function ProviderPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = await apiOrNull<{ provider: ProviderDetail }>(`/providers/${slug}`);
  if (!data) notFound();
  const p = data.provider;
  const [reviews, { results: similar }, user] = await Promise.all([
    api<{ reviews: Review[] } & Paged>(`/providers/${slug}/reviews`, { query: { pageSize: 6 } }),
    api<{ results: ProviderCardType[] }>(`/providers/${slug}/similar`),
    getSession(),
  ]);

  const tone = categoryTone(p.primaryCategory?.slug);
  const maxBreakdown = Math.max(1, ...p.ratingBreakdown.map((b) => b.count));
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;

  return (
    <div className="pb-8">
      {/* Cover */}
      <div className="relative h-40 overflow-hidden md:h-56" style={{ background: `linear-gradient(120deg, ${tone.hex}, oklch(0.27 0.09 268))` }}>
        {p.coverUrl ? (
          <Image src={p.coverUrl} alt="" fill className="object-cover opacity-80" priority />
        ) : (
          <div className="bg-grid absolute inset-0 opacity-40 [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        )}
      </div>

      <div className="container-page">
        {/* Header card */}
        <div className="relative -mt-16 rounded-3xl border bg-card p-6 shadow-[var(--shadow-lift)] md:-mt-20 md:p-8">
          <nav className="mb-5 hidden items-center gap-1.5 text-sm text-muted-foreground md:flex" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="size-3.5" />
            {p.primaryCategory && (
              <>
                <Link href={`/services/${p.primaryCategory.slug}`} className="hover:text-foreground">
                  {p.primaryCategory.name}
                </Link>
                <ChevronRight className="size-3.5" />
              </>
            )}
            <span className="truncate text-foreground">{p.businessName}</span>
          </nav>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <ProviderAvatar name={p.businessName} logoUrl={p.logoUrl} categorySlug={p.primaryCategory?.slug} size="xl" className="-mt-2 ring-4 ring-card" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-brand-deep md:text-3xl">{p.businessName}</h1>
                {p.verificationStatus === "verified" && (
                  <Badge className="gap-1 bg-accent text-accent-foreground">
                    <BadgeCheck /> Verified
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-muted-foreground">
                {p.primaryCategory?.name}
                {p.subcategories.length > 0 && ` · ${p.subcategories.slice(0, 3).join(", ")}`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {p.totalReviews > 0 ? (
                  <span className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold">{p.avgRating.toFixed(1)}</span>
                    <RatingStars value={p.avgRating} size="md" />
                    <a href="#reviews" className="text-muted-foreground underline-offset-4 hover:underline">
                      {p.totalReviews} reviews
                    </a>
                  </span>
                ) : (
                  <span className="text-muted-foreground">No reviews yet</span>
                )}
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4 text-primary" /> {p.locality ? `${p.locality}, ${p.city}` : p.city}
                </span>
                <OpenStatus provider={p} className="text-sm" />
              </div>
              {p.badges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.badges.map((b) => (
                    <Badge key={b.id} variant="warning" className="gap-1">
                      <Award /> {b.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-72">
              <ContactButtons provider={p} source="profile" categorySlug={p.primaryCategory?.slug} size="lg" layout="stack" />
              <div className="flex items-center justify-center gap-2">
                <FavoriteButton providerId={p.id} initial={p.isFavorite} withLabel />
                <ShareButton title={p.businessName} />
                <Button asChild variant="outline" size="icon" className="rounded-full" aria-label="Get directions">
                  <a href={directions} target="_blank" rel="noopener noreferrer">
                    <Navigation />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          {/* Main column */}
          <div className="min-w-0 space-y-8">
            <Section title="About">
              <p className="whitespace-pre-line leading-relaxed text-foreground/85">{p.description ?? "This provider has not added a description yet."}</p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <Fact icon={Briefcase} label="Experience" value={p.yearsExperience !== null ? `${p.yearsExperience} years` : "Not shared"} />
                <Fact icon={p.businessType === "company" ? Building2 : Wrench} label="Business type" value={p.businessType === "company" ? "Company" : "Individual professional"} />
                <Fact icon={CalendarDays} label="On DialNFind since" value={formatDate(p.memberSince)} />
                {p.selfReportedCompletedJobs !== null && (
                  <Fact icon={Award} label="Jobs completed" value={`${p.selfReportedCompletedJobs.toLocaleString("en-IN")}+ (as reported)`} />
                )}
              </dl>
            </Section>

            <Section title="Services offered">
              <ul className="divide-y rounded-xl border">
                {p.services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                        <Wrench className="size-4" />
                      </span>
                      <div>
                        <div className="font-medium">{s.subcategory?.name ?? s.category.name}</div>
                        {s.isPrimary && <div className="text-xs text-primary">Main service</div>}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {s.startingPrice ? (
                        <>
                          <div className="font-semibold">{formatPrice(s.startingPrice)}</div>
                          <div className="text-xs text-muted-foreground">{s.priceUnit === "per_hour" ? "per hour" : s.priceUnit === "fixed" ? "starting price" : "visit charge"}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">On request</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {p.serviceDetails.length > 0 && (
                <dl className="mt-4 grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                  {p.serviceDetails.map((d) => (
                    <div key={d.label}>
                      <dt className="text-xs text-muted-foreground">{d.label}</dt>
                      <dd className="mt-0.5 text-sm font-medium">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Prices are indicative starting rates set by the provider. Confirm the final price on the call.</p>
            </Section>

            {p.portfolio.length > 0 && (
              <Section title="Photos">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {p.portfolio.map((item) => (
                    <figure key={item.id} className="group overflow-hidden rounded-xl border bg-muted">
                      <div className="relative aspect-[4/3]">
                        <Image src={item.imageUrl} alt={item.title} fill className="object-cover transition-transform group-hover:scale-105" sizes="(min-width: 768px) 33vw, 50vw" />
                      </div>
                      <figcaption className="px-3 py-2 text-sm font-medium">{item.title}</figcaption>
                    </figure>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Ratings and reviews" id="reviews" action={<ReviewForm providerId={p.id} providerName={p.businessName} signedIn={!!user} existing={p.myReview} />}>
              {p.totalReviews > 0 && (
                <div className="mb-8 grid gap-6 rounded-2xl bg-muted/60 p-5 sm:grid-cols-[10rem_1fr]">
                  <div className="text-center sm:border-r sm:pr-6">
                    <div className="font-display text-5xl font-extrabold text-brand-deep">{p.avgRating.toFixed(1)}</div>
                    <RatingStars value={p.avgRating} size="md" className="mt-2" />
                    <div className="mt-1 text-sm text-muted-foreground">{p.totalReviews} reviews</div>
                  </div>
                  <div className="space-y-2">
                    {p.ratingBreakdown.map((b) => (
                      <div key={b.rating} className="flex items-center gap-3 text-sm">
                        <span className="w-3 font-medium">{b.rating}</span>
                        <Progress value={(b.count / maxBreakdown) * 100} indicatorClassName="bg-warning" className="h-2.5 bg-card" />
                        <span className="w-8 text-right text-muted-foreground">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ReviewsList slug={p.slug} initial={reviews} providerName={p.businessName} />
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <SideCard title="Contact">
              <div className="space-y-3 text-sm">
                <a href={telHref(p.phone)} className="flex items-center gap-3 rounded-xl bg-accent p-3 font-display text-lg font-bold text-brand-deep">
                  <Phone className="size-5 text-primary" /> {formatPhone(p.phone)}
                </a>
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground">
                    <Mail className="size-4" /> <span className="truncate">{p.email}</span>
                  </a>
                )}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-foreground">
                    <Globe className="size-4" /> <span className="truncate">{p.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
              </div>
            </SideCard>

            <SideCard title="Working hours" icon={Clock}>
              <ul className="space-y-1.5 text-sm">
                {p.hours.map((h) => (
                  <li key={h.dayOfWeek} className={`flex justify-between rounded-lg px-2 py-1 ${h.isToday ? "bg-accent font-semibold text-accent-foreground" : ""}`}>
                    <span>{h.day}</span>
                    <span className={h.label === "Closed" ? "text-muted-foreground" : ""}>{h.label}</span>
                  </li>
                ))}
              </ul>
            </SideCard>

            <SideCard title="Location and service area" icon={MapPin}>
              <div className="h-44 overflow-hidden rounded-xl border">
                <LocationMap lat={p.latitude} lng={p.longitude} radiusKm={p.serviceRadiusKm} label={p.businessName} />
              </div>
              {p.addressLine && <p className="mt-3 text-sm">{p.addressLine}, {p.city} {p.pincode}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Serves customers within about {p.serviceRadiusKm} km</p>
              {p.serviceAreas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.serviceAreas.map((a) => (
                    <Badge key={a.areaName} variant="secondary" className="font-normal">
                      {a.areaName}
                    </Badge>
                  ))}
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <a href={directions} target="_blank" rel="noopener noreferrer">
                  <Navigation /> Get directions
                </a>
              </Button>
            </SideCard>

            <SideCard title="Trust and verification" icon={ShieldCheck}>
              {p.verifications.length ? (
                <ul className="space-y-2 text-sm">
                  {p.verifications.map((v) => (
                    <li key={v.type} className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-success" /> {VERIFICATION_LABEL[v.type] ?? v.type}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">This provider has not completed verification yet.</p>
              )}
              <div className="mt-4 border-t pt-3">
                <ReportListing slug={p.slug} />
              </div>
            </SideCard>

            {!p.isClaimed && (
              <div className="rounded-2xl border border-dashed border-primary/40 bg-accent/60 p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <Store className="size-4 text-primary" /> Is this your business?
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">Claim it for free to update details, reply to reviews and see who is calling.</p>
                <Button asChild size="sm" className="mt-3">
                  <a href={`${PROVIDER_APP_URL}/claim?listing=${p.id}`}>Claim this listing</a>
                </Button>
              </div>
            )}
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-brand-deep">Similar providers nearby</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {similar.map((s) => (
                <ProviderCard key={s.id} provider={s} source="search" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Section({ title, id, action, children }: { title: string; id?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SideCard({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        {Icon && <Icon className="size-4 text-primary" />} {title}
      </h3>
      {children}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3.5">
      <Icon className="mt-0.5 size-4 text-primary" />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
      </div>
    </div>
  );
}
