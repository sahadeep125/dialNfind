import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  CreditCard,
  Globe,
  Info,
  Mail,
  MapPin,
  Megaphone,
  Minus,
  ShieldCheck,
  Star,
  Store,
  Tag,
  User,
  Wrench,
} from "lucide-react";
import { publicApi, publicApiOrNull } from "@/lib/api";
import { isOptimizableImage } from "@/lib/image-hosts";
import { PROVIDER_APP_URL } from "@/lib/config";
import type {
  Paged,
  ProviderCard as ProviderCardType,
  ProviderDetail,
  Review,
} from "@/lib/types";
import { formatDistance, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { categoryTone } from "@/components/site/category-icon";
import { ProviderAvatar } from "@/components/provider/provider-avatar";
import { ContactButtons } from "@/components/provider/contact-buttons";
import { OpenStatus } from "@/components/provider/provider-card";
import { ReviewsList } from "@/components/provider/reviews-list";
import {
  ProfileFavoriteButton,
  ProfileReviewForm,
  ProviderViewerState,
} from "@/components/provider/viewer-state";
import { ReportListing, ShareButton } from "@/components/provider/share-report";
import { LocationMap } from "@/components/provider/location-map";
import {
  PLAN_BADGES,
  PlanTierBadge,
} from "@/components/provider/plan-tier-badge";
import { PhotoGallery } from "@/components/provider/photo-gallery";
import {
  PhotoLightbox,
  PhotoTrigger,
  type LightboxPhoto,
} from "@/components/provider/photo-lightbox";
import {
  ExpandableChips,
  ExpandableGrid,
} from "@/components/provider/expandable";
import { BackButton } from "@/components/provider/back-button";
import { SectionNav } from "@/components/provider/section-nav";
import { StickyColumn } from "@/components/provider/sticky-column";
import { JsonLd } from "@/components/json-ld";
import { serviceHref } from "@/lib/service-href";
import { clip, pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, providerJsonLd } from "@/lib/structured-data";

type Params = { slug: string };

/** Profiles are cached for everyone and rebuilt every few minutes, or at once after a review (actions.ts). */
export const revalidate = 300;
export async function generateStaticParams(): Promise<Params[]> {
  return [];
}

const PROVIDER_TTL = 300;
/** Reviews shown in the sidebar before "Show more reviews". */
const REVIEWS_PAGE = 3;
const tagsFor = (slug: string) => [`provider:${slug}`];

/** One request per render for both the metadata and the page; views are counted in the browser (viewer-state.tsx). */
const getProvider = cache(async (slug: string) => {
  const data = await publicApiOrNull<{ provider: ProviderDetail }>(
    `/providers/${encodeURIComponent(slug)}`,
    {
      query: { view: "false" },
      revalidate: PROVIDER_TTL,
      tags: tagsFor(slug),
    },
  );
  return data?.provider ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider)
    return {
      title: "Provider not found",
      robots: { index: false, follow: true },
    };
  const p = provider;
  const place = p.locality ? `${p.locality}, ${p.city}` : p.city;
  const service = p.primaryCategory?.name ?? "Local services";
  const rating =
    p.totalReviews > 0
      ? `Rated ${p.avgRating.toFixed(1)}/5 from ${p.totalReviews} reviews. `
      : "";
  const about = (p.description || p.shortDescription || "")
    .replace(/\s+/g, " ")
    .trim();
  return pageMetadata({
    title: `${p.businessName}: ${service} in ${place}`,
    description: clip(
      `${rating}${about || `${service} in ${place}.`} Call ${p.businessName} directly on DialNFind.`,
    ),
    path: `/providers/${p.slug}`,
    type: "profile",
  });
}

const VERIFICATION_TYPES = [
  "phone",
  "business",
  "location",
  "id_proof",
] as const;
const VERIFICATION_LABEL: Record<string, string> = {
  phone: "Phone",
  business: "Business",
  location: "Location",
  id_proof: "ID Proof",
};

const PRICE_UNIT_LABEL = {
  per_visit: "per visit",
  per_hour: "per hour",
  fixed: "fixed",
} as const;

/** A generic icon per service-detail row, guessed from its label so the grid doesn't look flat. No icon field exists on the data itself. */
function serviceDetailIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("warranty")) return ShieldCheck;
  if (l.includes("payment")) return CreditCard;
  if (l.includes("area")) return MapPin;
  if (l.includes("response") || l.includes("time")) return Clock;
  if (l.includes("brand")) return Tag;
  if (l.includes("amc") || l.includes("available")) return CalendarCheck2;
  return Info;
}

export default async function ProviderPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const p = await getProvider(slug);
  if (!p) notFound();
  const [reviews, { results: similar }, { config }] = await Promise.all([
    publicApi<{ reviews: Review[] } & Paged>(
      `/providers/${encodeURIComponent(slug)}/reviews`,
      {
        query: { pageSize: REVIEWS_PAGE },
        revalidate: PROVIDER_TTL,
        tags: tagsFor(slug),
      },
    ),
    publicApi<{ results: ProviderCardType[] }>(
      `/providers/${encodeURIComponent(slug)}/similar`,
      { revalidate: PROVIDER_TTL, tags: tagsFor(slug) },
    ),
    publicApi<{ config: { min_review_length: number } }>("/app-config", {
      revalidate: 600,
      tags: ["app-config"],
    }),
  ]);

  const tone = categoryTone(p.primaryCategory?.slug);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  const verifiedTypes = new Set(p.verifications.map((v) => v.type));
  const primarySub =
    p.services.find((s) => s.isPrimary && s.subcategory)?.subcategory ?? null;

  // The primary chip names the main service; the rest follow as plain chips.
  const leadChip = primarySub?.name ?? p.primaryCategory?.name ?? null;
  const otherChips = p.subcategories.filter((s) => s !== leadChip);
  const visibleChips = otherChips.slice(0, 4);
  const extraChips = otherChips.length - visibleChips.length;

  // Cover first, then the portfolio: one list for the banner and the photo viewer.
  const photos: LightboxPhoto[] = [
    ...(p.coverUrl
      ? [{ id: "cover", title: p.businessName, imageUrl: p.coverUrl }]
      : []),
    ...p.portfolio,
  ];
  const portfolioOffset = p.coverUrl ? 1 : 0;
  const portfolioShown = p.portfolio.slice(0, 5);
  const portfolioMore = p.portfolio.length - portfolioShown.length;

  const reviewTotal = p.ratingBreakdown.reduce((sum, b) => sum + b.count, 0);
  const breakdown = [...p.ratingBreakdown].sort((a, b) => b.rating - a.rating);

  const crumbs = [
    { name: "Home", path: "/" },
    ...(p.primaryCategory
      ? [
          {
            name: p.primaryCategory.name,
            path: `/services/${p.primaryCategory.slug}`,
          },
        ]
      : []),
    { name: p.businessName, path: `/providers/${p.slug}` },
  ];

  const facts: {
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    label: string;
    labelFirst?: boolean;
  }[] = [
    ...(p.yearsExperience !== null
      ? [
          {
            icon: Briefcase,
            value: `${p.yearsExperience}+`,
            label: "Years Experience",
          },
        ]
      : []),
    {
      icon: p.businessType === "company" ? Building2 : User,
      value: p.businessType === "company" ? "Company" : "Individual",
      label: "Business Type",
    },
    ...(p.selfReportedCompletedJobs !== null
      ? [
          {
            icon: ClipboardCheck,
            value: `${p.selfReportedCompletedJobs.toLocaleString("en-IN")}+`,
            label: "Jobs Completed",
          },
        ]
      : []),
    {
      icon: CalendarDays,
      value: new Intl.DateTimeFormat("en-IN", {
        month: "short",
        year: "numeric",
      }).format(new Date(p.memberSince)),
      label: "Member since",
      labelFirst: true,
    },
    ...(p.is24x7
      ? [{ icon: Clock, value: "Available 24x7", label: "Emergency Service" }]
      : []),
  ];

  return (
    <ProviderViewerState slug={p.slug}>
      <JsonLd
        data={[providerJsonLd(p, reviews.reviews), breadcrumbJsonLd(crumbs)]}
      />
      <PhotoLightbox photos={photos} businessName={p.businessName}>
        <div className="container-wide pb-28 pt-3 lg:pb-12">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_31rem]">
            {/* Main column */}
            <StickyColumn className="min-w-0 space-y-5">
              {/* 1. Breadcrumb */}
              <div className="flex items-center gap-3 text-sm">
                <BackButton />
                <span className="hidden h-6 w-px bg-border sm:block" />
                <nav
                  className="hidden min-w-0 flex-1 items-center gap-2 text-muted-foreground sm:flex"
                  aria-label="Breadcrumb"
                >
                  <Link href="/" className="shrink-0 hover:text-foreground">
                    Home
                  </Link>
                  {p.primaryCategory && (
                    <>
                      <span aria-hidden>/</span>
                      <Link
                        href={`/services/${p.primaryCategory.slug}`}
                        className="shrink-0 hover:text-foreground"
                      >
                        {p.primaryCategory.name}
                      </Link>
                    </>
                  )}
                  {p.primaryCategory && primarySub && (
                    <>
                      <span aria-hidden>/</span>
                      <Link
                        href={serviceHref(p.primaryCategory.slug, primarySub.slug)}
                        className="shrink-0 hover:text-foreground"
                      >
                        {primarySub.name}
                      </Link>
                    </>
                  )}
                  <span aria-hidden>/</span>
                  <span
                    aria-current="page"
                    className="truncate font-medium text-foreground"
                  >
                    {p.businessName}
                  </span>
                </nav>
                <div className="ml-auto flex items-center gap-1">
                  <ShareButton title={p.businessName} withLabel />
                  <ProfileFavoriteButton
                    providerId={p.id}
                    className="h-9 rounded-lg border-0 bg-transparent px-2.5 text-foreground/80 hover:bg-accent"
                  />
                </div>
              </div>

              {/* 2. Cover photos */}
              {photos && photos.length > 0 && (
                <PhotoGallery
                  photos={photos}
                  businessName={p.businessName}
                  toneHex={tone.hex}
                />
              )}

              {/* 3. Business info */}
              <div
                id="overview"
                className="flex scroll-mt-32 flex-col gap-5 sm:flex-row sm:items-start"
              >
                <ProviderAvatar
                  name={p.businessName}
                  logoUrl={p.logoUrl}
                  categorySlug={p.primaryCategory?.slug}
                  size="xl"
                  className="rounded-full border bg-card shadow-[var(--shadow-card)] md:size-28"
                  style={{ bottom: "0.5rem", right: "0.2rem" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="text-2xl font-bold text-foreground md:text-[2rem]">
                      {p.businessName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.verificationStatus === "verified" && (
                        <Badge variant="success" className="gap-1 py-1">
                          <BadgeCheck /> Verified
                        </Badge>
                      )}
                      {p.planTier && (
                        <PlanTierBadge
                          tier={p.planTier}
                          size="md"
                          className="py-1"
                        />
                      )}
                      {p.isSponsored && (
                        <Badge variant="soft" className="gap-1 py-1">
                          <Megaphone /> Sponsored
                        </Badge>
                      )}
                    </div>
                    {p.badges.some((b) => !PLAN_BADGES.has(b.name)) && (
                      <div className="flex flex-wrap gap-2">
                        {p.badges
                          .filter((b) => !PLAN_BADGES.has(b.name))
                          .map((b) => (
                            <Badge
                              key={b.id}
                              variant="warning"
                              className="gap-1 py-1"
                            >
                              {b.name}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-lg">
                    {p.totalReviews > 0 ? (
                      <>
                        <Star
                          className="size-5 text-warning"
                          fill="currentColor"
                          strokeWidth={0}
                        />
                        <span className="font-semibold">
                          {p.avgRating.toFixed(1)}
                        </span>
                        <a
                          href="#reviews"
                          className="text-muted-foreground hover:underline"
                        >
                          ({p.totalReviews.toLocaleString("en-IN")}{" "}
                          {p.totalReviews === 1 ? "review" : "reviews"})
                        </a>
                      </>
                    ) : (
                      <span className="text-base text-muted-foreground">
                        No reviews yet
                      </span>
                    )}
                  </div>

                  {(leadChip || visibleChips.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {leadChip && (
                        <Badge variant="default" className="py-1.5">
                          <ShieldCheck className="size-4" /> {leadChip}
                        </Badge>
                      )}
                      {visibleChips.map((s) => (
                        <Badge key={s} variant="soft" className="py-1.5">
                          {s}
                        </Badge>
                      ))}
                      {extraChips > 0 && (
                        <span className="rounded-lg border border-primary/30 px-3 py-1.5 text-[13px] font-semibold text-primary">
                          +{extraChips}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <MapPin className="size-4 text-muted-foreground" />{" "}
                      {p.locality ? `${p.locality}, ${p.city}` : p.city}
                    </span>
                    <OpenStatus
                      provider={p}
                      className="text-[15px] [&>span:first-child]:size-2.5"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Section tabs */}
              <SectionNav
                reviewCount={p.totalReviews}
                photoCount={p.portfolio.length}
                hidden={similar.length > 0 ? [] : ["similar"]}
              />

              {/* 5. About */}
              <Section title="About">
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/75">
                  {p.description ??
                    "This provider has not added a description yet."}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))]">
                  {facts.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <span className="icon-tile size-10 text-[oklch(0.55_0.12_170)]">
                        <f.icon className="size-5" />
                      </span>
                      <div
                        className={cn(
                          "flex min-w-0",
                          f.labelFirst ? "flex-col-reverse" : "flex-col",
                        )}
                      >
                        <dd className="truncate text-[15px] font-semibold">
                          {f.value}
                        </dd>
                        <dt className="truncate text-xs text-muted-foreground">
                          {f.label}
                        </dt>
                      </div>
                    </div>
                  ))}
                </dl>
              </Section>

              {/* 6. Services offered */}
              <section
                id="services"
                className="card-surface scroll-mt-32 p-5 md:p-6"
              >
                <ExpandableGrid
                  title="Services Offered"
                  initial={4}
                  moreLabel="View all services"
                  className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]"
                  items={p.services.map((s, i) => {
                    const name = s.subcategory?.name ?? s.category.name;
                    const image =
                      p.portfolio.length > 0
                        ? p.portfolio[i % p.portfolio.length]
                        : null;
                    return (
                      <div
                        key={s.id}
                        className="flex gap-3 rounded-lg border p-2.5 transition-shadow hover:shadow-[var(--shadow-lift)]"
                      >
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                          {image ? (
                            <Image
                              src={image.imageUrl}
                              alt={name}
                              fill
                              className="object-cover"
                              sizes="80px"
                              unoptimized={!isOptimizableImage(image.imageUrl)}
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center bg-accent">
                              <Wrench className="size-7 text-primary/60" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-sm font-semibold leading-snug">
                            {name}
                          </div>
                          {s.isPrimary && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-[oklch(0.42_0.1_165)]">
                              <BadgeCheck className="size-3" /> Primary Service
                            </span>
                          )}
                          {s.startingPrice ? (
                            <>
                              <div className="mt-1 text-lg font-bold leading-tight">
                                {formatPrice(s.startingPrice)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {PRICE_UNIT_LABEL[s.priceUnit]}
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Price on request
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Prices are indicative starting rates set by the provider.
                  Confirm the final price on the call.
                </p>
              </section>

              {/* 7. Portfolio / work photos */}
              {p.portfolio.length > 0 ? (
                <Section
                  title="Portfolio / Work Photos"
                  id="photos"
                  action={
                    p.portfolio.length > 0 && (
                      <PhotoTrigger
                        index={portfolioOffset}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        View all photos <ArrowRight className="size-4" />
                      </PhotoTrigger>
                    )
                  }
                >
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {portfolioShown.map((item, i) => {
                      const showMore =
                        i === portfolioShown.length - 1 && portfolioMore > 0;
                      return (
                        <PhotoTrigger
                          key={item.id}
                          index={portfolioOffset + i}
                          className={cn(
                            "group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted",
                            i >= 3 && "hidden sm:block",
                          )}
                          aria-label={
                            showMore
                              ? `View all ${p.portfolio.length} photos`
                              : `Open photo: ${item.title || p.businessName}`
                          }
                        >
                          <Image
                            src={item.imageUrl}
                            alt={item.title || p.businessName}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(min-width: 640px) 18vw, 33vw"
                            unoptimized={!isOptimizableImage(item.imageUrl)}
                          />
                          {showMore && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                              +{portfolioMore} more
                            </span>
                          )}
                        </PhotoTrigger>
                      );
                    })}
                  </div>
                </Section>
              ) : null}

              {/* 8. Service details */}
              {p.serviceDetails.length > 0 && (
                <Section title="Service Details">
                  <dl className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
                    {p.serviceDetails.map((d) => {
                      const Icon = serviceDetailIcon(d.label);
                      return (
                        <div
                          key={d.label}
                          className="flex items-center gap-3 rounded-lg border p-3.5"
                        >
                          <span className="icon-tile size-10 text-foreground/60">
                            <Icon className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <dt className="text-xs text-muted-foreground">
                              {d.label}
                            </dt>
                            <dd className="mt-0.5 truncate text-sm font-semibold">
                              {d.value}
                            </dd>
                          </div>
                        </div>
                      );
                    })}
                  </dl>
                </Section>
              )}
              {/* 14. Similar providers */}
              {similar.length > 0 && (
                <SideCard
                  title="Similar Providers"
                  id="similar"
                  action={
                    p.primaryCategory && (
                      <Link
                        href={`/services/${p.primaryCategory.slug}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        View all similar <ArrowRight className="size-4" />
                      </Link>
                    )
                  }
                >
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {similar.slice(0, 3).map((s) => {
                      const distance = formatDistance(s.distanceKm)?.replace(
                        " away",
                        "",
                      );
                      return (
                        <li key={s.id}>
                          <Link
                            href={`/providers/${s.slug}`}
                            className="group block overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-[var(--shadow-lift)]"
                          >
                            <div className="relative aspect-[4/3] bg-muted">
                              {s.coverUrl ? (
                                <Image
                                  src={s.coverUrl}
                                  alt=""
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                  sizes="(min-width: 768px) 240px, 100vw"
                                  unoptimized={!isOptimizableImage(s.coverUrl)}
                                />
                              ) : (
                                <div
                                  className={cn(
                                    "flex size-full items-center justify-center",
                                    tone.bg,
                                  )}
                                >
                                  <ProviderAvatar
                                    name={s.businessName}
                                    logoUrl={s.logoUrl}
                                    categorySlug={s.primaryCategory?.slug}
                                    className="rounded-full ring-4 ring-white/70"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="p-2.5">
                              <div className="truncate text-[13px] font-semibold">
                                {s.businessName}
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-xs">
                                <Star
                                  className="size-3.5 text-warning"
                                  fill="currentColor"
                                  strokeWidth={0}
                                />
                                {s.totalReviews > 0 ? (
                                  <>
                                    <span className="font-medium">
                                      {s.avgRating.toFixed(1)}
                                    </span>
                                    <span className="text-muted-foreground">
                                      ({s.totalReviews})
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    New
                                  </span>
                                )}
                              </div>
                              {distance && (
                                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="size-3" /> {distance}
                                </div>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </SideCard>
              )}
            </StickyColumn>

            {/* Sidebar */}
            <StickyColumn as="aside" className="space-y-5">
              {/* 11 & 12. Opening hours + verifications */}

              <SideCard
                title="Verifications"
                action={<ReportListing slug={p.slug} />}
              >
                <ul className="space-y-3.5 text-sm">
                  {VERIFICATION_TYPES.map((type) => {
                    const done = verifiedTypes.has(type);
                    return (
                      <li key={type} className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full",
                            done
                              ? "bg-success text-white"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <Check className="size-3.5" strokeWidth={3} />
                          ) : (
                            <Minus className="size-3.5" strokeWidth={3} />
                          )}
                        </span>
                        <span className={done ? "" : "text-muted-foreground"}>
                          {VERIFICATION_LABEL[type]}{" "}
                          {done ? "Verified" : "Not Verified"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </SideCard>

              {/* 9. Contact actions */}
              <div className="card-surface p-4">
                {/* On small screens the sticky bar at the bottom carries Call and WhatsApp. */}
                <ContactButtons
                  provider={p}
                  source="profile"
                  categorySlug={p.primaryCategory?.slug}
                  size="lg"
                  layout="row"
                  variant="profile"
                  className="mb-3 hidden lg:flex"
                />
                <div className="flex gap-3">
                  {p.email && (
                    <a href={`mailto:${p.email}`} className={OUTLINE_ACTION}>
                      <Mail className="size-4" /> Email
                    </a>
                  )}
                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={OUTLINE_ACTION}
                    >
                      <Globe className="size-4" /> Website
                    </a>
                  )}
                  <ProfileFavoriteButton
                    providerId={p.id}
                    className={cn(OUTLINE_ACTION, "rounded-lg")}
                  />
                </div>
              </div>

              {/* 10. Location */}
              <SideCard title="Location" id="location">
                <div className="relative h-44 overflow-hidden rounded-lg border">
                  <LocationMap
                    lat={p.latitude}
                    lng={p.longitude}
                    radiusKm={p.serviceRadiusKm}
                    label={p.businessName}
                  />
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-primary shadow-md transition-colors hover:bg-accent"
                  >
                    <MapPin className="size-4" /> View on Map
                  </a>
                </div>
                {p.addressLine && (
                  <p className="mt-4 flex items-start gap-2.5 text-sm">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      {p.addressLine}, {p.city}, {p.state} {p.pincode}
                    </span>
                  </p>
                )}
                <div className="mt-3">
                  <ExpandableChips
                    header={
                      <span className="flex items-center gap-2.5 text-sm">
                        <Clock className="size-4 shrink-0 text-muted-foreground" />{" "}
                        Serves within {p.serviceRadiusKm} km
                      </span>
                    }
                    chips={p.serviceAreas.map((a) => a.areaName)}
                    initial={3}
                    noun="areas"
                    linkLabel="View service areas"
                  />
                </div>
              </SideCard>

              {/* 11 & 12. Opening hours + verifications */}

              <SideCard
                title="Opening Hours"
                action={
                  p.isAvailable ? (
                    <OpenStatus
                      provider={p}
                      className="[&>span:last-child]:hidden"
                    />
                  ) : undefined
                }
              >
                <table className="w-full text-[13px]">
                  <tbody className="divide-y">
                    {p.hours.map((h) => (
                      <tr
                        key={h.dayOfWeek}
                        className={cn(h.isToday && "font-semibold")}
                      >
                        <td className="py-1.5 pr-2">{h.day}</td>
                        <td
                          className={cn(
                            "py-1.5 text-right",
                            h.label === "Closed" && "text-muted-foreground",
                          )}
                        >
                          {h.label}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SideCard>

              {!p.isClaimed && (
                <div className="rounded-xl border border-dashed border-primary/40 bg-accent/60 p-5">
                  <div className="flex items-center gap-2 font-semibold">
                    <Store className="size-4 text-primary" /> Is this your
                    business?
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Claim it for free to update details, reply to reviews and
                    see who is calling.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <a href={`${PROVIDER_APP_URL}/claim?listing=${p.id}`}>
                      Claim this listing
                    </a>
                  </Button>
                </div>
              )}

              {/* 13. Reviews */}
              <SideCard
                title="Reviews"
                id="reviews"
                action={
                  <ProfileReviewForm
                    providerId={p.id}
                    providerName={p.businessName}
                    slug={p.slug}
                    minLength={config.min_review_length}
                  />
                }
              >
                {p.totalReviews > 0 ? (
                  <>
                    <div className="flex items-center gap-6">
                      <div className="shrink-0 text-center">
                        <div className="flex items-center gap-2">
                          <Star
                            className="size-8 text-warning"
                            fill="currentColor"
                            strokeWidth={0}
                          />
                          <span className="text-[2.5rem] font-bold leading-none">
                            {p.avgRating.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {p.totalReviews.toLocaleString("en-IN")} reviews
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        {breakdown.map((b) => {
                          const pct =
                            reviewTotal > 0
                              ? Math.round((b.count / reviewTotal) * 100)
                              : 0;
                          return (
                            <div
                              key={b.rating}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="flex w-6 items-center gap-0.5 font-medium">
                                {b.rating}
                                <Star
                                  className="size-3 text-warning"
                                  fill="currentColor"
                                  strokeWidth={0}
                                />
                              </span>
                              <Progress
                                value={pct}
                                indicatorClassName="bg-warning"
                                className="h-1.5 bg-muted"
                                aria-label={`${b.rating} stars: ${pct}%`}
                              />
                              <span className="w-8 text-right text-muted-foreground">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-5 border-t pt-4">
                      <ReviewsList
                        slug={p.slug}
                        initial={reviews}
                        providerName={p.businessName}
                        pageSize={REVIEWS_PAGE}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No reviews yet. Be the first to review.
                  </p>
                )}
              </SideCard>
            </StickyColumn>
          </div>
        </div>
      </PhotoLightbox>

      {/* Mobile sticky call-to-action */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 shadow-[0_-4px_16px_-4px_rgb(16_24_40/0.12)] backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <ContactButtons
          provider={p}
          source="profile"
          categorySlug={p.primaryCategory?.slug}
          size="lg"
          layout="row"
          variant="profile"
        />
      </div>
    </ProviderViewerState>
  );
}

const OUTLINE_ACTION =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

function Section({
  title,
  id,
  action,
  children,
}: {
  title: string;
  id?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card-surface scroll-mt-32 p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SideCard({
  title,
  id,
  action,
  children,
}: {
  title: string;
  id?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card-surface scroll-mt-32 p-4 md:p-5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="truncate text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
