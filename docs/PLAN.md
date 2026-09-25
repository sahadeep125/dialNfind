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

Auth is email + password with JWT bearer tokens tied to a revocable `auth_sessions` row, plus email
verification and password reset links sent over SMTP. There is no social sign-in.

- **auth**: register, login, logout, me, update profile, change password, verify email, resend verification, forgot and reset password
- **categories**: list (with subcategories and counts), get by slug with attributes; super_admin CRUD with audit logging
- **search**: provider search (text, category, lat/lng + radius, min rating, open now, verified, sort by relevance/distance/rating/reviews), autocomplete suggestions, location lookup; every search logged to `search_queries`
- **providers**: public profile by slug (hours, open-now, areas, services, portfolio, badges, rating breakdown), reviews (paged), similar providers, profile-view tracking
- **leads**: create call/WhatsApp lead (guest or user) with optional answers to the category's lead questions, "did they respond?" follow-up; a contact in a promoted category counts as a sponsored click
- **reviews**: create, edit own, delete own; provider reply; report
- **me**: favorites, addresses, my reviews, recent contacts, notifications (with unread count)
- **provider (role=provider, own rows only)**: onboarding (create listing), claim search + claim with an ownership document, profile, hours, service areas, services, portfolio, verification submissions, service details (category attribute values, asked once per category), leads, reviews + reply, dashboard stats, plans, plan and campaign requests (they open billing tickets; there is no online payment), campaigns (pause, resume), lead reports
- **support (signed in)**: my tickets, open a ticket, reply, close
- **admin (super_admin, or admin with the section on their role)**: me and permissions, team and roles, support tickets (filter, assign, reply, internal notes), overview and analytics, leads, providers (create, CSV import, edit, owner, delete, bulk status) and detail, change plan with an offline payment, claims, verifications, reviews moderation (single and bulk), report flags (resolve, dismiss), users (detail, suspend, sign out, anonymise, bulk), lead disputes, activity log, search insights, badges (CRUD, award, revoke), subscription plans, transactions (record, refund), subscriptions, sponsored listings, CSV exports, announcements, settings; subcategory and attribute edit/delete under **categories**
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
with a profile button (sign in for guests). Tabs: Home, Favorites, My reviews, Settings. Also
Search, Category, Provider profile, Write review, Sign in, Create account, Profile, Help. Theme
tokens drive both the `App*` design-system components and the NativeWind Tailwind config. The API
gained `GET /app-config` (support contacts and legal links from Settings) and `DELETE /auth/me`
(customer account deletion) for it. Standalone npm project in `mobile/`, outside the workspace.

## 8. Provider mobile (Expo)

DialNFind Business: the provider portal as a native app on the same `/provider` endpoints.
Sign in, then setup (new listing or claim) or the tabs Dashboard, Leads, Reviews, More. Listing
editors (profile, services, hours, areas, portfolio, verification), Promote, Plan, Support,
Notifications, Help and legal pages. Account closure goes through a support ticket because
`DELETE /auth/me` refuses providers. Standalone npm project in `provider-mobile/`.

## Not built on purpose

Online payments, SMS, WhatsApp alerts, push notifications, Google/Apple sign-in and analytics
plugins were removed: plans and promotions are arranged by the team and recorded as offline
payments, and email is the only outgoing channel. Enforcing plan limits (lead access, analytics) is
planned for later.

File uploads are live: images are stored on the API server's disk and documents in a private folder served only through signed links, behind a `Storage` interface
(`server/src/storage`) so an S3 implementation can replace it without touching routes or apps.

## Running locally

```
pnpm install
cp server/.env.example server/.env        # set DATABASE_URL (needs PostGIS)
pnpm --filter server db:migrate && pnpm --filter server db:seed
pnpm dev                                    # runs all four
```
