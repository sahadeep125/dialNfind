import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Globe,
  Info,
  Mail,
  MapPin,
  Navigation,
  PenLine,
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react";
import Image from "next/image";
import { isOptimizableImage } from "@/lib/image-hosts";
import { PROVIDER_APP_URL } from "@/lib/config";
import type {
  Category,
  Paged,
  ProviderCard as ProviderCardType,
  ProviderDetail,
  Review,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrackView } from "@/components/site/track-view";
import { Button } from "@/components/ui/button";
import { ContactButtons } from "@/components/provider/contact-buttons";
import {
  ContactCard,
  directionsHref,
} from "@/components/provider/contact-card";
import { LocationAndHours } from "@/components/provider/location-hours";
import {
  ProfileHeader,
  type ProfileFact,
} from "@/components/provider/profile-header";
import { ReviewsList } from "@/components/provider/reviews-list";
import { ReviewsSummary } from "@/components/provider/reviews-summary";
import { ProfileSection } from "@/components/provider/section-card";
import { ServicesList } from "@/components/provider/services-list";
import { SimilarProviders } from "@/components/provider/similar-providers";
import {
  ProfileFavoriteButton,
  ProfileReviewForm,
  ProviderViewerState,
} from "@/components/provider/viewer-state";
import { ReportListing, ShareButton } from "@/components/provider/share-report";
import { PhotoGallery } from "@/components/provider/photo-gallery";
import {
  PhotoLightbox,
  PhotoTrigger,
  type LightboxPhoto,
} from "@/components/provider/photo-lightbox";
import { BackButton } from "@/components/provider/back-button"; 
import { StickyColumn } from "@/components/provider/sticky-column";
import { JsonLd } from "@/components/json-ld";
import { serviceHref } from "@/lib/service-href";
import { breadcrumbJsonLd, providerJsonLd } from "@/lib/structured-data";

/** A secondary action painted on the navy signboard. */
const BOARD_ACTION =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-md border-[1.5px] border-white/60 px-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10";

/** Reviews shown in the sidebar before "Show more reviews". */
export const REVIEWS_PAGE = 3;

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
  /** The service tree, to list what a whole-category listing covers. */
  categories?: Category[];
  /** Set on the owner/team preview of a listing that is not live: no analytics or structured data, and a notice. */
  previewStatus?: string;
};

/** The provider profile, shared by the public page and the preview of a listing that is not live yet. */
export function ProviderProfile({
  p,
  reviews,
  similar,
  minReviewLength,
  previewStatus,
  categories,
}: ProviderProfileProps) {
  const config = { min_review_length: minReviewLength };
  const primarySub =
    p.services.find((s) => s.isPrimary && s.subcategory)?.subcategory ?? null;

  // The primary chip names the main service; the rest follow as plain chips.
  const leadChip = primarySub?.name ?? p.primaryCategory?.name ?? null;
  const otherChips = p.subcategories.filter((s) => s !== leadChip);
  const visibleChips = otherChips.slice(0, 4);
  const extraChips = otherChips.length - visibleChips.length;

  // Cover first, then the portfolio: one list for the banner and the photo viewer. The cover's alt text names
  // the business, its service and the place, as image search reads it.
  const place = p.locality ? `${p.locality}, ${p.city}` : p.city;
  const coverAlt = `${p.businessName}, ${p.seo?.service ?? leadChip ?? "local services"} in ${place}`;
  const photos: LightboxPhoto[] = [
    ...(p.coverUrl
      ? [
          {
            id: "cover",
            title: p.businessName,
            imageUrl: p.coverUrl,
            altText: coverAlt,
          },
        ]
      : []),
    ...p.portfolio,
  ];
  const portfolioOffset = p.coverUrl ? 1 : 0;
  const portfolioShown = p.portfolio.slice(0, 8);
  const portfolioMore = p.portfolio.length - portfolioShown.length;

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

  const facts: ProfileFact[] = [
    ...(p.yearsExperience !== null
      ? [
          {
            icon: Briefcase,
            value: `${p.yearsExperience}+ years`,
            label: "Experience",
          },
        ]
      : []),
    ...(p.selfReportedCompletedJobs !== null
      ? [
          {
            icon: ClipboardCheck,
            value: `${p.selfReportedCompletedJobs.toLocaleString("en-IN")}+`,
            label: "Jobs completed",
          },
        ]
      : []),
    { icon: MapPin, value: `${p.serviceRadiusKm} km`, label: "Travels up to" },
    ...(p.is24x7
      ? [{ icon: Clock, value: "24x7", label: "Emergency calls" }]
      : []),
  ];
  // "Travels up to" alone is not worth a row of its own.
  const shownFacts = facts.length > 1 ? facts : [];

  // Phones: the bottom bar carries Call and WhatsApp, so the header row holds the next most useful actions.
  const mobileActions = (
    <div className="mt-5 flex flex-wrap gap-2 lg:hidden">
      <a
        href={directionsHref(p)}
        target="_blank"
        rel="noopener noreferrer"
        className={BOARD_ACTION}
      >
        <Navigation className="size-4" aria-hidden /> Directions
      </a>
      {p.website && (
        <a
          href={p.website}
          target="_blank"
          rel="noopener noreferrer"
          className={BOARD_ACTION}
        >
          <Globe className="size-4" aria-hidden /> Website
        </a>
      )}
      {p.email && (
        <a href={`mailto:${p.email}`} className={BOARD_ACTION}>
          <Mail className="size-4" aria-hidden /> Email
        </a>
      )}
    </div>
  );

  return (
    <ProviderViewerState slug={p.slug}>
      {previewStatus ? (
        <div
          role="status"
          className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900"
        >
          <strong>Preview.</strong>{" "}
          {previewStatus === "active"
            ? "This listing is live; this copy is never cached, so it always shows your latest changes."
            : `This listing is not live yet (status: ${previewStatus}). Only people with this link can see this page.`}
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
          <JsonLd
            data={[
              providerJsonLd(p, reviews.reviews),
              breadcrumbJsonLd(crumbs),
            ]}
          />
        </>
      )}
      <PhotoLightbox photos={photos} businessName={p.businessName}>
        <ProfileHeader
          p={p}
          chips={[...(leadChip ? [leadChip] : []), ...visibleChips]}
          extraChips={extraChips}
          facts={shownFacts}
          actions={mobileActions}
          top={
            // Breadcrumb and page actions, on the board.
            <div className="flex items-center gap-3 text-sm text-board-muted">
              <BackButton className="text-board-muted hover:bg-white/10 hover:text-white" />
              <span className="hidden h-5 w-px bg-board-rule sm:block" />
              <nav
                className="hidden min-w-0 flex-1 items-center gap-2 sm:flex"
                aria-label="Breadcrumb"
              >
                <Link href="/" className="shrink-0 hover:text-white">
                  Home
                </Link>
                {p.primaryCategory && (
                  <>
                    <span aria-hidden>/</span>
                    <Link
                      href={`/services/${p.primaryCategory.slug}`}
                      className="shrink-0 hover:text-white"
                    >
                      {p.primaryCategory.name}
                    </Link>
                  </>
                )}
                {p.primaryCategory && primarySub && (
                  <>
                    <span aria-hidden>/</span>
                    <Link
                      href={serviceHref(
                        p.primaryCategory.slug,
                        primarySub.slug,
                      )}
                      className="shrink-0 hover:text-white"
                    >
                      {primarySub.name}
                    </Link>
                  </>
                )}
                <span aria-hidden>/</span>
                <span
                  aria-current="page"
                  className="truncate font-medium text-white"
                >
                  {p.businessName}
                </span>
              </nav>
              <div className="ml-auto flex items-center gap-1 text-white">
                <ShareButton
                  title={p.businessName}
                  withLabel
                  className="text-white hover:bg-white/10"
                />
                <ProfileFavoriteButton
                  providerId={p.id}
                  className="h-9 rounded-md border-0 bg-transparent px-2.5 text-white hover:bg-white/10"
                />
              </div>
            </div>
          }
        />
        <div className="container-wide">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-12">
            {/* Main column */}
            <div className="min-w-0">
              {photos.length > 0 && (
                <div className="mt-8">
                  <PhotoGallery
                    photos={photos}
                    businessName={p.businessName}
                    categorySlug={p.primaryCategory?.slug}
                  />
                </div>
              )}

              
                <ProfileSection id="services" className="border-t-0">
                  <ServicesList
                    services={p.services}
                    businessName={p.businessName}
                    categories={categories}
                  />
                </ProfileSection>
             

              <ProfileSection title={`About ${p.businessName}`}>
                <p className="max-w-[70ch] whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">
                  {p.description || fallbackDescription(p)}
                </p>
              </ProfileSection>

              {p.portfolio.length > 0 && (
                <ProfileSection
                  title="Work photos"
                  id="photos"
                  action={
                    <PhotoTrigger
                      index={portfolioOffset}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      View all <ArrowRight className="size-4" />
                    </PhotoTrigger>
                  }
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {portfolioShown.map((item, i) => {
                      const showMore =
                        i === portfolioShown.length - 1 && portfolioMore > 0;
                      return (
                        <PhotoTrigger
                          key={item.id}
                          index={portfolioOffset + i}
                          className={cn(
                            "group relative aspect-[4/3] overflow-hidden rounded-md bg-muted",
                            i >= 4 && "hidden sm:block",
                          )}
                          aria-label={
                            showMore
                              ? `View all ${p.portfolio.length} photos`
                              : `Open photo: ${item.title || p.businessName}`
                          }
                        >
                          <Image
                            src={item.imageUrl}
                            alt={item.altText || item.title || p.businessName}
                            fill
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                            sizes="(min-width: 640px) 16vw, 45vw"
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
                            <dt className="text-sm text-muted-foreground">
                              {d.label}
                            </dt>
                            <dd className="mt-0.5 font-semibold">{d.value}</dd>
                          </div>
                        </div>
                      );
                    })}
                  </dl>
                </ProfileSection>
              )}

              <ProfileSection
                title={
                  p.is24x7 || p.hours.some((h) => h.openTime)
                    ? "Location and working hours"
                    : "Location"
                }
                id="location"
              >
                <LocationAndHours p={p} />
              </ProfileSection>

              {/* Reviews show only when there are some: an empty "No reviews yet" box tells a visitor nothing. */}
              {p.totalReviews > 0 && (
                <ProfileSection
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
                  <ReviewsSummary p={p} />
                  <div className="mt-6">
                    <ReviewsList
                      slug={p.slug}
                      initial={reviews}
                      providerName={p.businessName}
                      pageSize={REVIEWS_PAGE}
                    />
                  </div>
                </ProfileSection>
              )}

              {similar.length > 0 && (
                <ProfileSection
                  eyebrow="If they don't pick up"
                  title={`More ${(primarySub?.name ?? p.primaryCategory?.name ?? "professionals").toLowerCase()} near ${p.locality ?? p.city}`}
                  id="similar"
                  action={
                    p.primaryCategory && (
                      <Link
                        href={serviceHref(
                          p.primaryCategory.slug,
                          primarySub?.slug,
                        )}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        View all <ArrowRight className="size-4" />
                      </Link>
                    )
                  }
                >
                  <SimilarProviders providers={similar.slice(0, 6)} />
                </ProfileSection>
              )}

              {/* Housekeeping for people who know this business: review it, report a problem, or claim it. */}
              <div className="flex flex-col gap-4 border-t py-6 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                {p.totalReviews === 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <PenLine
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-foreground/80">
                      Used {p.businessName}?
                    </span>
                    <ProfileReviewForm
                      providerId={p.id}
                      providerName={p.businessName}
                      slug={p.slug}
                      minLength={config.min_review_length}
                    />
                  </div>
                )}
                {!p.isClaimed && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Store className="size-4 text-cta-strong" aria-hidden />
                    <span className="text-foreground/80">
                      Is this your business?
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <a href={`${PROVIDER_APP_URL}/claim?listing=${p.id}`} rel="nofollow">
                        Claim it for free
                      </a>
                    </Button>
                  </div>
                )}
                <ReportListing slug={p.slug} />
              </div>
            </div>

            {/* Sidebar */}
            <StickyColumn
              as="aside"
              className="relative z-10 hidden lg:-mt-56 lg:block"
            >
              <ContactCard p={p} />
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

/**
 * A plain summary for listings whose owner has not written one yet, built from facts on the listing, so the
 * page is not a near-empty template to visitors and search engines.
 */
export function fallbackDescription(p: ProviderDetail): string {
  const place = p.locality ? `${p.locality}, ${p.city}` : p.city;
  const category = p.primaryCategory?.name.toLowerCase() ?? "local services";
  const names = Array.from(
    new Set(p.services.map((s) => s.subcategory?.name ?? s.category.name)),
  ).slice(0, 4);
  const offers = names.length
    ? ` Services listed include ${names.join(", ").toLowerCase()}.`
    : "";
  const where = p.addressLine ? ` You can find them at ${p.addressLine}.` : "";
  const who =
    p.businessType === "individual"
      ? `${p.businessName} is an independent ${(p.profession ?? category).toLowerCase()} working in ${place}.`
      : `${p.businessName} is a ${category} business in ${place}.`;
  return `${who}${offers}${where} Call or WhatsApp ${p.businessName} directly from this page to ask about prices and availability; KaajVa adds no booking fee.`;
}
