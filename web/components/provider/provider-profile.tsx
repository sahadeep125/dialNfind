import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  CreditCard,
  Info,
  MapPin,
  Minus,
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react";
import Image from "next/image";
import { isOptimizableImage } from "@/lib/image-hosts";
import { PROVIDER_APP_URL } from "@/lib/config";
import type { Paged, ProviderCard as ProviderCardType, ProviderDetail, Review } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrackView } from "@/components/site/track-view";
import { Button } from "@/components/ui/button";
import { ContactButtons } from "@/components/provider/contact-buttons";
import { ContactCard } from "@/components/provider/contact-card";
import { OpeningHours } from "@/components/provider/opening-hours";
import { ProfileHeader, type ProfileFact } from "@/components/provider/profile-header";
import { ReviewsList } from "@/components/provider/reviews-list";
import { ReviewsSummary } from "@/components/provider/reviews-summary";
import { ProfileSection, SideCard } from "@/components/provider/section-card";
import { ServicesList } from "@/components/provider/services-list";
import { SimilarProviders } from "@/components/provider/similar-providers";
import { ProfileFavoriteButton, ProfileReviewForm, ProviderViewerState } from "@/components/provider/viewer-state";
import { ReportListing, ShareButton } from "@/components/provider/share-report";
import { LocationMap } from "@/components/provider/location-map";
import { PhotoGallery } from "@/components/provider/photo-gallery";
import { PhotoLightbox, PhotoTrigger, type LightboxPhoto } from "@/components/provider/photo-lightbox";
import { ExpandableChips } from "@/components/provider/expandable";
import { BackButton } from "@/components/provider/back-button";
import { SectionNav } from "@/components/provider/section-nav";
import { StickyColumn } from "@/components/provider/sticky-column";
import { JsonLd } from "@/components/json-ld";
import { serviceHref } from "@/lib/service-href";
import { breadcrumbJsonLd, providerJsonLd } from "@/lib/structured-data";

/** Reviews shown in the sidebar before "Show more reviews". */
export const REVIEWS_PAGE = 3;

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

type ProviderProfileProps = {
  p: ProviderDetail;
  reviews: { reviews: Review[] } & Paged;
  similar: ProviderCardType[];
  minReviewLength: number;
  /** Set on the owner/team preview of a listing that is not live: no analytics or structured data, and a notice. */
  previewStatus?: string;
};

/** The provider profile, shared by the public page and the preview of a listing that is not live yet. */
export function ProviderProfile({ p, reviews, similar, minReviewLength, previewStatus }: ProviderProfileProps) {
  const config = { min_review_length: minReviewLength };
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  const verifiedTypes = new Set(p.verifications.map((v) => v.type));
  const primarySub = p.services.find((s) => s.isPrimary && s.subcategory)?.subcategory ?? null;

  // The primary chip names the main service; the rest follow as plain chips.
  const leadChip = primarySub?.name ?? p.primaryCategory?.name ?? null;
  const otherChips = p.subcategories.filter((s) => s !== leadChip);
  const visibleChips = otherChips.slice(0, 4);
  const extraChips = otherChips.length - visibleChips.length;

  // Cover first, then the portfolio: one list for the banner and the photo viewer.
  const photos: LightboxPhoto[] = [...(p.coverUrl ? [{ id: "cover", title: p.businessName, imageUrl: p.coverUrl }] : []), ...p.portfolio];
  const portfolioOffset = p.coverUrl ? 1 : 0;
  const portfolioShown = p.portfolio.slice(0, 8);
  const portfolioMore = p.portfolio.length - portfolioShown.length;

  const crumbs = [
    { name: "Home", path: "/" },
    ...(p.primaryCategory ? [{ name: p.primaryCategory.name, path: `/services/${p.primaryCategory.slug}` }] : []),
    { name: p.businessName, path: `/providers/${p.slug}` },
  ];

  const facts: ProfileFact[] = [
    ...(p.yearsExperience !== null ? [{ icon: Briefcase, value: `${p.yearsExperience}+ years`, label: "Experience" }] : []),
    ...(p.selfReportedCompletedJobs !== null
      ? [{ icon: ClipboardCheck, value: `${p.selfReportedCompletedJobs.toLocaleString("en-IN")}+`, label: "Jobs completed" }]
      : []),
    {
      icon: CalendarDays,
      value: new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(p.memberSince)),
      label: "Member since",
    },
    { icon: MapPin, value: `${p.serviceRadiusKm} km`, label: "Service radius" },
    ...(p.is24x7 ? [{ icon: Clock, value: "24x7", label: "Emergency calls" }] : []),
  ];

  return (
    <ProviderViewerState slug={p.slug}>
      {previewStatus ? (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
          <strong>Preview.</strong>{" "}
          {previewStatus === "active" ? "This listing is live; this copy is never cached, so it always shows your latest changes." : `This listing is not live yet (status: ${previewStatus}). Only people with this link can see this page.`}
        </div>
      ) : (
        <>
      <TrackView
        event="provider_viewed"
        properties={{
          provider_id: p.id,
          provider_slug: p.slug,
          category: p.primaryCategory?.slug ?? null,
          provider_city: p.city,
          avg_rating: p.avgRating,
          total_reviews: p.totalReviews,
          verification_status: p.verificationStatus,
          is_claimed: p.isClaimed,
        }}
      />
      <JsonLd data={[providerJsonLd(p, reviews.reviews), breadcrumbJsonLd(crumbs)]} />
        </>
      )}
      <PhotoLightbox photos={photos} businessName={p.businessName}>
        <div className="container-wide pt-3">
          {/* Breadcrumb and page actions */}
          <div className="flex items-center gap-3 text-sm">
            <BackButton />
            <span className="hidden h-5 w-px bg-border sm:block" />
            <nav className="hidden min-w-0 flex-1 items-center gap-2 text-muted-foreground sm:flex" aria-label="Breadcrumb">
              <Link href="/" className="shrink-0 hover:text-foreground">
                Home
              </Link>
              {p.primaryCategory && (
                <>
                  <span aria-hidden>/</span>
                  <Link href={`/services/${p.primaryCategory.slug}`} className="shrink-0 hover:text-foreground">
                    {p.primaryCategory.name}
                  </Link>
                </>
              )}
              {p.primaryCategory && primarySub && (
                <>
                  <span aria-hidden>/</span>
                  <Link href={serviceHref(p.primaryCategory.slug, primarySub.slug)} className="shrink-0 hover:text-foreground">
                    {primarySub.name}
                  </Link>
                </>
              )}
              <span aria-hidden>/</span>
              <span aria-current="page" className="truncate font-medium text-foreground">
                {p.businessName}
              </span>
            </nav>
            <div className="ml-auto flex items-center gap-1">
              <ShareButton title={p.businessName} withLabel />
              <ProfileFavoriteButton providerId={p.id} className="h-9 rounded-md border-0 bg-transparent px-2.5 text-foreground/80 hover:bg-muted" />
            </div>
          </div>

          <div className="mt-3">
            <PhotoGallery photos={photos} businessName={p.businessName} categorySlug={p.primaryCategory?.slug} />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-12">
            {/* Main column */}
            <div className="min-w-0">
              <ProfileHeader p={p} chips={[...(leadChip ? [leadChip] : []), ...visibleChips]} extraChips={extraChips} facts={facts} />

              <div className="mt-8">
                <SectionNav reviewCount={p.totalReviews} photoCount={p.portfolio.length} hidden={similar.length > 0 ? [] : ["similar"]} />
              </div>

              <ProfileSection title={`About ${p.businessName}`} className="border-t-0">
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">{p.description ?? "This provider has not added a description yet."}</p>
              </ProfileSection>

              <ProfileSection id="services">
                <ServicesList services={p.services} />
              </ProfileSection>

              {p.portfolio.length > 0 && (
                <ProfileSection
                  title="Work photos"
                  id="photos"
                  action={
                    <PhotoTrigger index={portfolioOffset} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      View all <ArrowRight className="size-4" />
                    </PhotoTrigger>
                  }
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {portfolioShown.map((item, i) => {
                      const showMore = i === portfolioShown.length - 1 && portfolioMore > 0;
                      return (
                        <PhotoTrigger
                          key={item.id}
                          index={portfolioOffset + i}
                          className={cn("group relative aspect-[4/3] overflow-hidden rounded-md bg-muted", i >= 4 && "hidden sm:block")}
                          aria-label={showMore ? `View all ${p.portfolio.length} photos` : `Open photo: ${item.title || p.businessName}`}
                        >
                          <Image
                            src={item.imageUrl}
                            alt={item.title || p.businessName}
                            fill
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                            sizes="(min-width: 640px) 16vw, 45vw"
                            unoptimized={!isOptimizableImage(item.imageUrl)}
                          />
                          {showMore && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">+{portfolioMore} more</span>
                          )}
                        </PhotoTrigger>
                      );
                    })}
                  </div>
                </ProfileSection>
              )}

              {p.serviceDetails.length > 0 && (
                <ProfileSection title="Service details">
                  <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {p.serviceDetails.map((d) => {
                      const Icon = serviceDetailIcon(d.label);
                      return (
                        <div key={d.label} className="flex items-start gap-3">
                          <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <dt className="text-sm text-muted-foreground">{d.label}</dt>
                            <dd className="mt-0.5 font-semibold">{d.value}</dd>
                          </div>
                        </div>
                      );
                    })}
                  </dl>
                </ProfileSection>
              )}

              <ProfileSection
                title="Reviews"
                id="reviews"
                action={<ProfileReviewForm providerId={p.id} providerName={p.businessName} slug={p.slug} minLength={config.min_review_length} />}
              >
                {p.totalReviews > 0 ? (
                  <>
                    <ReviewsSummary p={p} />
                    <div className="mt-6">
                      <ReviewsList slug={p.slug} initial={reviews} providerName={p.businessName} pageSize={REVIEWS_PAGE} />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
                    <p className="font-semibold">No reviews yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Hired {p.businessName}? Your review helps neighbours choose.</p>
                  </div>
                )}
              </ProfileSection>

              {similar.length > 0 && (
                <ProfileSection
                  title="Similar pros nearby"
                  id="similar"
                  action={
                    p.primaryCategory && (
                      <Link href={`/services/${p.primaryCategory.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        View all <ArrowRight className="size-4" />
                      </Link>
                    )
                  }
                >
                  <SimilarProviders providers={similar.slice(0, 3)} />
                </ProfileSection>
              )}
            </div>

            {/* Sidebar */}
            <StickyColumn as="aside" className="space-y-4">
              <ContactCard p={p} />

              <OpeningHours p={p} />

              <SideCard title="Location" id="location">
                <div className="relative h-44 overflow-hidden rounded-md border">
                  <LocationMap lat={p.latitude} lng={p.longitude} radiusKm={p.serviceRadiusKm} label={p.businessName} />
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-md transition-colors hover:bg-muted"
                  >
                    <MapPin className="size-4" /> Directions
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
                        <Clock className="size-4 shrink-0 text-muted-foreground" /> Serves within {p.serviceRadiusKm} km
                      </span>
                    }
                    chips={p.serviceAreas.map((a) => a.areaName)}
                    initial={3}
                    noun="areas"
                    linkLabel="View service areas"
                  />
                </div>
              </SideCard>

              <SideCard title="Verifications" action={<ReportListing slug={p.slug} />}>
                <ul className="space-y-3 text-sm">
                  {VERIFICATION_TYPES.map((type) => {
                    const done = verifiedTypes.has(type);
                    return (
                      <li key={type} className="flex items-center gap-2.5">
                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", done ? "bg-success text-white" : "bg-muted text-muted-foreground")}>
                          {done ? <Check className="size-3" strokeWidth={3} /> : <Minus className="size-3" strokeWidth={3} />}
                        </span>
                        <span className={done ? "" : "text-muted-foreground"}>
                          {VERIFICATION_LABEL[type]} {done ? "verified" : "not verified"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </SideCard>

              {!p.isClaimed && (
                <div className="rounded-lg border border-dashed bg-card p-5">
                  <div className="flex items-center gap-2 font-semibold">
                    <Store className="size-4 text-cta" /> Is this your business?
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">Claim it for free to update details, reply to reviews and see who is calling.</p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <a href={`${PROVIDER_APP_URL}/claim?listing=${p.id}`}>Claim this listing</a>
                  </Button>
                </div>
              )}
            </StickyColumn>
          </div>
        </div>
      </PhotoLightbox>

      {/* Mobile sticky call-to-action */}
      <div
        data-sticky-cta
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 shadow-[0_-4px_16px_-4px_rgb(20_28_45/0.12)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <ContactButtons provider={p} source="profile" categorySlug={p.primaryCategory?.slug} size="lg" layout="row" variant="profile" />
      </div>
    </ProviderViewerState>
  );
}
