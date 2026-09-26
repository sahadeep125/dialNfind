# DialNFind build plan

DialNFind is a local service directory: tell us what you need, pick your location, see nearby
providers, call the one you prefer. This repository holds four independent apps that share one
PostgreSQL + PostGIS database through the API server.

```
dialNfind/
  server/     Node + Express + TypeScript + Prisma + PostgreSQL/PostGIS   (port 4000)
  web/        Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui (port 3000)
  provider/   React (Vite) + TypeScript + Tailwind CSS + shadcn/ui         (port 5173)
  super-admin/ React (Vite) + TypeScript + Tailwind CSS + shadcn/ui        (port 5174)
  mobile/     Expo SDK 57 + React Native + Expo Router + NativeWind          (customer app)
  provider-mobile/  same stack                                          (provider app)
  docs/       plan, API reference
```

The root is a pnpm workspace so `pnpm install` once installs all four, but each app has its own
`package.json`, build, and deploy target and never imports code from another app.

## Build order

1. **Schema** (server/prisma/schema.prisma) — the v2 architecture from the brief, all 7 groups.
2. **APIs** — every REST endpoint the two frontends need, with role checks.
3. **Seed data** — realistic demo directory so the web app is presentable on first run.
4. **Web** — customer-facing Next.js site.
5. **Provider** — provider onboarding and dashboard SPA.
6. **Super admin** — admin console for the DialNFind team, with roles per staff member.
7. **Mobile** — customer app for Android and iOS on the same API.

## 1. Schema

Follows the brief table-for-table (users, oauth accounts, addresses, providers, hours, service
areas, portfolio, verifications, badges, categories, subcategories, category attributes, provider
services, attribute values, search queries, leads, reviews, review photos, favorites, plans,
subscriptions, transactions, sponsored listings, notifications, admin logs,
reports/flags, settings). `BIGSERIAL` ids, `snake_case` columns via Prisma `@map`.

Small additions the pages need, which the brief does not cover:

| Addition | Why |
| --- | --- |
| `providers.slug` | readable profile URLs (`/providers/sharma-tv-repair-siliguri`) |
| `providers.phone` | the business number the Call button dials; unclaimed listings have no user |
| `providers.user_id` nullable | seeded or imported listings exist before the owner claims them |
| `providers.location geography(Point,4326)` | PostGIS column, kept in sync from lat/lng by a trigger; GiST index powers radius search and distance sort |
| `provider_claims` | "Claim business" flow: who claimed which listing, how it was verified, status |
| `contact_messages` | Contact page submissions from before the help desk; new ones become support tickets |
| `admin_roles`, `users.admin_role_id` | staff roles: `super_admin` sees everything, `admin` users see the sections listed on their role |
| `support_tickets`, `ticket_messages` | help desk for customers, providers and the contact form; messages can be internal notes |
| `provider_daily_stats` | profile views and search impressions per day for the provider dashboard |
| `leads.user_id` nullable | guests can tap Call without logging in; the lead is still counted |

## 2. APIs (server, `/api/v1`)

Auth is email + password, or Google / Apple sign-in (see [social-login.md](social-login.md)), with
JWT bearer tokens tied to a revocable `auth_sessions` row, plus email verification and password
reset links sent over SMTP.

- **auth**: register, login, Google and Apple sign-in, logout (also forgets the device's push token), me, update profile, change or set password, verify email, resend verification, forgot and reset password, delete account (customers and providers)
- **categories**: list (with subcategories and counts), get by slug with attributes; super_admin CRUD with audit logging
- **search**: provider search (text, category, lat/lng + radius, min rating, open now, verified, sort by relevance/distance/rating/reviews), autocomplete suggestions, location lookup; every search logged to `search_queries`
- **providers**: public profile by slug (hours with open and close times, open-now, areas, services, portfolio, badges, rating breakdown), reviews (paged), similar providers, report a listing
  - `GET /providers/sitemap?page=` lists every active listing's slug and last change for the website's sitemap
  - profile views: `GET /providers/:slug?view=false` skips counting (the website renders profiles from a shared cache) and `POST /providers/:slug/visit` counts one view per visit and returns the visitor's favorite and review
- **leads**: create call/WhatsApp lead (guest or user) with optional answers to the category's lead questions, "did they respond?" follow-up; a contact in a promoted category counts as a sponsored click
- **reviews**: create, edit own, delete own; provider reply; report
- **me**: overview, favorites (all, or paged with `page`), addresses, my reviews, recent contacts (paged), notifications (with unread count, mark some or all read), push tokens
- **provider (role=provider, own rows only)**: onboarding (create listing), claim search + claim with an ownership document, profile, hours, service areas, services, portfolio, verification submissions, service details (category attribute values, asked once per category), leads, reviews + reply, dashboard stats, plans, plan and campaign requests (they open billing tickets; there is no online payment), campaigns (pause, resume), lead reports
- **support (signed in)**: my tickets, open a ticket, reply, close
- **admin (super_admin, or admin with the section on their role)**: me and permissions, team and roles, support tickets (filter, assign, reply, internal notes), overview and analytics, leads, providers (create, CSV import, edit, owner, delete, bulk status) and detail, change plan with an offline payment, claims, verifications, reviews moderation (single and bulk), report flags (resolve, dismiss), users (detail, suspend, sign out, anonymise, bulk), lead disputes, activity log, search insights, badges (CRUD, award, revoke), subscription plans, transactions (record, refund), subscriptions, sponsored listings, CSV exports, announcements, settings; subcategory and attribute edit/delete under **categories**
- **notifications** are created for new leads and reviews, review replies, support replies, claim and verification decisions, listing status changes, badges and plan changes, and are pushed to every device the person registered (Expo push, `server/src/services/push.ts`)
- **contact**, **plans**, **stats**, **app-config** (support contacts and legal links from Settings), **health**
- **billing**: Razorpay subscriptions on the web and App Store / Google Play through RevenueCat for providers; see [billing.md](billing.md)

Ranking: `ranking_score` = Bayesian-smoothed rating + review volume + profile completeness +
verification + response signal + a small plan boost. `self_reported_completed_jobs` is excluded,
as the brief says. Recalculated on review/profile changes and by `pnpm --filter server rank`.

## 3. Seed data

~12 categories with subcategories and attributes, ~150 providers across Siliguri, Kolkata,
Bengaluru, Delhi and Mumbai with real-looking localities and coordinates, business hours,
services with prices, reviews with text, badges, plans, and demo logins:

- customer `demo@dialnfind.com` / `password123`
- provider `provider@dialnfind.com` / `password123`
- admin `admin@dialnfind.com` / `password123`
- admin team `ops@`, `support.agent@`, `finance@dialnfind.com` / `password123`

## 4. Web (Next.js)

Pages: Home, All services, Listing (`/services/[category]`, with `?sub=` pages per service), Search
(`/search`), Provider detail (`/providers/[slug]`), Contact, About, Help (FAQ), Terms, Privacy,
Login, Register, Forgot and reset password, Dashboard (overview, favorites, recent contacts, my
reviews, notifications, help and support tickets, account with addresses, password and account
deletion), Claim business (hands off to the provider app).

Design: modern SaaS + local marketplace. Inter type, spacious layout, rounded cards, subtle
shadows, one teal-indigo primary palette, lucide icons, hand-drawn SVG illustrations, no emoji,
mobile-first. Map/list toggle on listing and search uses Leaflet with OpenStreetMap tiles.

Auth: Next route handlers exchange credentials with the server and keep the JWT in an httpOnly
cookie; a same-origin proxy route attaches it to client-side calls.

Security: the auth routes and the proxy refuse cross-site requests (Origin and Sec-Fetch-Site
checks, `lib/same-origin.ts`); every call to the API forwards the visitor's IP so per-IP rate
limits apply per visitor (`lib/client-ip.ts`); sign-in redirects only go to same-site paths
(`lib/safe-redirect.ts`); security headers (HSTS, frame blocking, CSP frame-ancestors) are set in
`next.config.ts`; the image optimizer only fetches from `NEXT_PUBLIC_IMAGE_ORIGINS`.

Caching: public pages (home, services, categories' metadata, provider profiles, about, claim, help,
legal) are the same for everyone and served from Next's cache (`publicApi` in `lib/api.ts`,
revalidated every 5 to 60 minutes). Everything personal loads in the browser: the header asks
`/api/session`, a profile asks `POST /providers/:slug/visit` for the favorite and the visitor's
review, and the home page loads providers near the saved location. Saving a review rebuilds that
profile at once (`app/providers/[slug]/actions.ts`). Dashboard pages render per request.

SEO: every public page has its own title, description, canonical URL and social preview
(`lib/seo.ts`); generated Open Graph images for the site and each provider; JSON-LD for the
organisation and site search, each business (`LocalBusiness` or a more specific type, with address,
geo, hours, price range, rating and reviews), breadcrumbs, category result lists and the FAQ
(`lib/structured-data.ts`); `robots.txt`, a sitemap index at `/sitemap.xml` over
`/sitemaps/sitemap/<n>.xml`, and a web app manifest. Search results, sign-in pages and the dashboard
are `noindex`. `/.well-known/apple-app-site-association` and `assetlinks.json` let links to profiles
and categories open the mobile app.

Quality: `pnpm --filter web lint` (ESLint with Next's core-web-vitals and TypeScript rules),
`pnpm --filter web test` (Vitest unit tests) and `pnpm --filter web test:e2e` (Playwright smoke
tests against a running site and API). Errors go to Sentry when `NEXT_PUBLIC_SENTRY_DSN` is set.

## 5. Provider (React + Vite)

Pages: Login/Register, Get started (claim existing vs create new), Claim flow (find your business,
upload an ownership document for the admin team to review), Onboarding
wizard (business, services, location + areas, hours, contact preferences), Dashboard (leads,
views, rating, completeness, ranking tips, chart), Leads, Reviews (reply), Services, Profile,
Hours, Service areas, Portfolio, Verification, Promote (sponsored campaigns), Subscription, and a
notifications bell.

## 6. Super admin (React + Vite)

Only `super_admin` and `admin` accounts can sign in. Sections: Dashboard (queues and trends),
Analytics, Providers (detail, status, badges, grant plan), Listing claims, Verification,
Categories (subcategories, attributes, icons), Badges, Reviews and reports, Leads, Plans and
billing (plans, subscribers, payments), Promotions, Users, Support tickets, Announcements,
Settings, Team and roles, Audit log, My account. Lists export to CSV; providers, users and reviews support bulk actions. The sidebar only shows the sections
the member's role allows, and the API checks the same permission on every `/admin` path.

## 7. Mobile (Expo)

Customer app with the website's listings; guests can browse, search and call. Splash, then Home
with notifications and profile buttons (sign in for guests). Tabs: Home, Favorites, My reviews,
Settings. Also All services, Search (rating and distance filters), Category, Provider profile
(share, report, open in Maps, full-screen photos, similar providers), Write review (with photos),
Sign in, Create account, Forgot password, Profile (photo and password), Saved addresses (also
offered as search locations), Recent contacts ("did they respond?"), Notifications, Support
requests and Help. Push notifications for review and support replies; links to the website open
the matching screen (universal links / app links, `src/utils/links.ts`). The session token is kept
in the Keychain / Keystore. A store rating prompt appears after a posted review or a few calls.
Crash reporting through Sentry when `EXPO_PUBLIC_SENTRY_DSN` is set. English only for now.
Theme tokens drive both the `App*` design-system components and the NativeWind Tailwind config.
Standalone npm project in `mobile/`, outside the workspace; `eas.json` defines development,
preview and production builds.

## 8. Provider mobile (Expo)

DialNFind Business: the provider portal as a native app on the same `/provider` endpoints.
Sign in, then setup (new listing or claim) or the tabs Dashboard, Leads, Reviews, More. Listing
editors (profile, services, hours, areas, portfolio, verification), Promote, Plan, Support,
Notifications, Help and legal pages, push alerts for new leads, and account deletion. Plans can be
bought in the app through RevenueCat. Standalone npm project in `provider-mobile/`.

## Not built on purpose

SMS and WhatsApp alerts: email and push notifications are the outgoing channels. Product analytics
(page and event tracking) is not set up; Sentry covers errors only. The customer app is English
only; translations are planned for later. Plan limits are enforced by the server
([billing.md](billing.md)).

File uploads are live: images are stored on the API server's disk and documents in a private folder served only through signed links, behind a `Storage` interface
(`server/src/storage`) so an S3 implementation can replace it without touching routes or apps.

## Running locally

```
pnpm install
cp server/.env.example server/.env        # set DATABASE_URL (needs PostGIS)
pnpm --filter server db:migrate && pnpm --filter server db:seed
pnpm dev                                    # runs all four
```
