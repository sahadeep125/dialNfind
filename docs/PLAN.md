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
subscriptions, transactions, sponsored listings, notifications, device tokens, admin logs,
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

Auth is email + password with JWT bearer tokens. Google and Apple endpoints exist and validate
input, but return `501 not configured` until client ids are supplied.

- **auth**: register, login, me, update profile, change password, google (stub), apple (stub)
- **categories**: list (with subcategories and counts), get by slug with attributes; super_admin CRUD with audit logging
- **search**: provider search (text, category, lat/lng + radius, min rating, open now, verified, sort by relevance/distance/rating/reviews), autocomplete suggestions, location lookup; every search logged to `search_queries`
- **providers**: public profile by slug (hours, open-now, areas, services, portfolio, badges, rating breakdown), reviews (paged), similar providers, profile-view tracking
- **leads**: create call/WhatsApp lead (guest or user) with optional answers to the category's lead questions, "did they respond?" follow-up; a contact in a promoted category counts as a sponsored click
- **reviews**: create, edit own, delete own; provider reply; report
- **me**: favorites, addresses, my reviews, recent contacts, notifications (with unread count), device tokens (add, remove)
- **provider (role=provider, own rows only)**: onboarding (create listing), claim search + claim start + OTP verify, profile, hours, service areas, services, portfolio, verification submissions, service details (category attribute values, asked once per category), leads, reviews + reply, dashboard stats, plans, subscription checkout (payment stubbed), sponsored campaigns (buy, pause, resume; payment stubbed)
- **support (signed in)**: my tickets, open a ticket, reply, close
- **admin (super_admin, or admin with the section on their role)**: me and permissions, team and roles, support tickets (filter, assign, reply, internal notes), overview and analytics, leads, providers moderation and detail, grant plan, claims, verifications, reviews moderation, report flags (resolve, dismiss), users (role, suspend), activity log, search insights, badges (CRUD, award, revoke), subscription plans, transactions, subscriptions, sponsored listings, announcements, settings and plugins (secrets masked); subcategory and attribute edit/delete under **categories**
- **notifications** are created for new leads and reviews, review replies, claim and verification decisions, listing status changes, badges and plan changes
- **contact**, **plans**, **health**

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

Pages: Home, Listing (`/services/[category]`), Search (`/search`), Provider detail
(`/providers/[slug]`), Contact, About, Login, Register, Dashboard, Account (profile + addresses),
Favorites, My reviews, Claim business (hands off to the provider app).

Design: modern SaaS + local marketplace. Inter type, spacious layout, rounded cards, subtle
shadows, one teal-indigo primary palette, lucide icons, hand-drawn SVG illustrations, no emoji,
mobile-first. Map/list toggle on listing and search uses Leaflet with OpenStreetMap tiles.

Auth: Next route handlers exchange credentials with the server and keep the JWT in an httpOnly
cookie; a same-origin proxy route attaches it to client-side calls.

## 5. Provider (React + Vite)

Pages: Login/Register, Get started (claim existing vs create new), Claim flow (find your business,
verify with a code sent to the listed number, stubbed as `123456` in development), Onboarding
wizard (business, services, location + areas, hours, contact preferences), Dashboard (leads,
views, rating, completeness, ranking tips, chart), Leads, Reviews (reply), Services, Profile,
Hours, Service areas, Portfolio, Verification, Promote (sponsored campaigns), Subscription, and a
notifications bell.

## 6. Super admin (React + Vite)

Only `super_admin` and `admin` accounts can sign in. Sections: Dashboard (queues and trends),
Analytics, Providers (detail, status, badges, grant plan), Listing claims, Verification,
Categories (subcategories, attributes, icons), Badges, Reviews and reports, Leads, Plans and
billing (plans, subscribers, payments), Promotions, Users, Support tickets, Announcements,
Settings, Plugins, Team and roles, Audit log, My account. The sidebar only shows the sections
the member's role allows, and the API checks the same permission on every `/admin` path.

## 7. Mobile (Expo)

Customer app with the website's listings; guests can browse, search and call. Splash, then Home
with a profile button (sign in for guests). Tabs: Home, Favorites, My reviews, Settings. Also
Search, Category, Provider profile, Write review, Sign in, Create account, Profile, Help. Theme
tokens drive both the `App*` design-system components and the NativeWind Tailwind config. The API
gained `GET /app-config` (support contacts and legal links from Settings) and `DELETE /auth/me`
(customer account deletion) for it. Standalone npm project in `mobile/`, outside the workspace.

## Stubbed until credentials exist

Google/Apple sign-in, payment gateway (checkout returns a simulated success in development),
push notifications (tokens stored, nothing sent), SMS OTP (fixed dev code).

File uploads are live: files are stored on the API server's disk behind a `Storage` interface
(`server/src/storage`) so an S3 implementation can replace it without touching routes or apps.

## Running locally

```
pnpm install
cp server/.env.example server/.env        # set DATABASE_URL (needs PostGIS)
pnpm --filter server db:migrate && pnpm --filter server db:seed
pnpm dev                                    # runs all four
```
