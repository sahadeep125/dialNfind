# DialNFind

A hyperlocal service directory: customers find trusted local providers (TV repair, plumbers, tutors...) near them and call or WhatsApp them directly. Providers claim or create a listing and manage it from their own portal.

The repository is a pnpm workspace with four separate apps, plus two mobile apps in `mobile/` and `provider-mobile/`:

| Folder | App | Stack | Dev URL |
| --- | --- | --- | --- |
| `server/` | REST API | Node, Express 5, Prisma 6, PostgreSQL + PostGIS, Zod, JWT | http://localhost:4000/api/v1 |
| `web/` | Customer website | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui | http://localhost:3000 |
| `provider/` | Provider portal | React 19 + Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query | http://localhost:5173 |
| `super-admin/` | Admin console for the DialNFind team | React 19 + Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Recharts | http://localhost:5174 |
| `mobile/` | Customer app for Android and iOS | Expo SDK 57, React Native 0.86, Expo Router, NativeWind, Zustand, MMKV, TanStack Query | Expo dev server on :8081 |
| `provider-mobile/` | Provider app (DialNFind Business) for Android and iOS | Same stack as `mobile/` | Expo dev server on :8081 |

The architecture, schema decisions and API list are in [docs/PLAN.md](docs/PLAN.md).

## Getting started

Requirements: Node 22+, pnpm 10, PostgreSQL 16 with the PostGIS extension available.

```bash
# 1. Database (any PostgreSQL with PostGIS works)
createuser -s dialnfind && psql -c "ALTER USER dialnfind PASSWORD 'dialnfind'"
createdb -O dialnfind dialnfind

# 2. Install and configure
pnpm install
cp server/.env.example server/.env
cp web/.env.example web/.env.local
cp provider/.env.example provider/.env
cp super-admin/.env.example super-admin/.env

# 3. Create the schema and load demo data
pnpm --filter server db:deploy
pnpm --filter server db:seed

# 4. Run all four apps
pnpm dev
```

## Checks

| App | Commands |
| --- | --- |
| `web/` | `pnpm --filter web typecheck`, `lint`, `test` (Vitest), `test:e2e` (Playwright; needs `pnpm dev` running, run `pnpm --filter web exec playwright install chromium` once) |
| `mobile/` | `npx tsc --noEmit`, `npx expo lint`, `npx jest` (unit tests always; the app walkthrough only when the API runs on :4000) |

## Website settings for production

Besides `API_URL`, set these in `web/.env.local` (see `web/.env.example`):

- `NEXT_PUBLIC_SITE_URL`: the public address, used for canonical links, the sitemap and social previews (defaults to `https://dialnfind.com`).
- `NEXT_PUBLIC_IMAGE_ORIGINS`: the API's upload origin and any image CDN, so Next can resize those images.
- `ANDROID_SHA256_CERT_FINGERPRINTS` (and `APPLE_TEAM_ID` if it changes): let links to the site open the mobile app.
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`: error reporting (optional).
- `GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_OFFICE_ADDRESS`, `NEXT_PUBLIC_OFFICE_REGION`: optional.

Support email, phone and hours, and links to published terms and privacy pages, come from the admin console (Settings).

`pnpm --filter server db:reset` drops and reseeds everything. `pnpm --filter server rank` recalculates ranking scores by hand; the nightly job does the same (see Scheduled jobs).

## Demo accounts

All demo accounts use the password `password123`.

| Account | Email | Use it for |
| --- | --- | --- |
| Customer | `demo@dialnfind.com` | Web dashboard: favourites, contact history, reviews |
| Provider | `provider@dialnfind.com` | Provider portal with data: owns Sharma TV & Electronics Care, Pro plan |
| New provider | `newprovider@dialnfind.com` | Provider portal empty state: onboarding or claiming a listing |
| Super admin | `admin@dialnfind.com` | Admin console with every section, including Team |
| Operations | `ops@dialnfind.com` | Admin console: providers, claims, verification, categories, reviews, support, leads |
| Support agent | `support.agent@dialnfind.com` | Admin console: support tickets, reviews and reports, users |
| Finance | `finance@dialnfind.com` | Admin console: plans, promotions, analytics |

The seed also creates six sample support tickets. It creates 220 providers across 5 cities and 12 categories, with reviews, leads and 45 days of analytics. The default location is Sevoke Road, Siliguri.

Claiming a listing needs an ownership document (trade licence, GST certificate, shop registration); the admin team approves it under Listing claims.

In development, emails (sign-up confirmation, password reset, decisions on listings and claims, plan reminders, support replies) are printed in the API's console instead of being sent. Set the `SMTP_*` variables in `server/.env` to send real email.

## Admin console

`super-admin/` is for the DialNFind team only. Customer and provider accounts are refused at sign-in. It covers:

- **Marketplace**: providers (add a listing, import listings from CSV, edit every part of a listing, approve, suspend, verify in bulk, badges, change plan, give a listing to an account or remove its owner, delete), listing claims, verification documents, categories with subcategories and attributes, badges, reviews (bulk publish or hide) and reports.
- **Revenue**: subscription plans with their features, subscribers and payments; payments received outside the app (UPI, bank transfer) are recorded with a reference, and can be marked refunded or failed; promotions (sponsored listings) with budgets.
- **People**: customer and provider accounts (detail page with activity and signed-in devices, suspend, sign out everywhere, resend the email confirmation, delete, bulk suspend), leads with provider reports of spam contacts, support tickets (plus old contact form messages), announcements.
- **System**: settings, team and roles, audit log. The dashboard and analytics pages show growth, leads, top categories and cities.
- **CSV export**: providers, users, leads, reviews, payments and subscribers download with the filters on screen (up to 50,000 rows).

**Team and permissions.** `super_admin` can open everything. Everyone else has the `admin` role plus an admin role (Operations, Support agent, Finance, or any role the super admin creates) that lists the sections they can open. The API enforces this on every `/admin` path (`server/src/lib/permissions.ts`); the console hides what a member cannot open. Only the super admin can manage Team, so no one can widen their own access. Adding a member returns a temporary password once; the member can change it, or use "Forgot password" on the website.

**Support tickets.** Customers raise tickets from the website (Dashboard, Help and support, or the contact form) and providers from the provider portal. Staff reply from the console; customers see replies as "DialNFind Support", and internal notes are never shown to them. References look like `DNF-000123`.

**Plans and promotions without online payment.** Providers do not pay in the apps. "Request this plan" and "Request campaign" open a billing support ticket; the team arranges payment, then uses Change plan on the provider page or New promotion, ticking "The provider paid" to record the amount and reference.

**Lead reports.** Providers can report a contact as spam, fake or a wrong number within 30 days (Leads, Report). Accepted reports stop counting in the provider's numbers and refund any promotion charge for that contact.

The console runs on port 5174, which is already in the API's default `CORS_ORIGINS`.

## Mobile app

`mobile/` is the customer app for Android and iOS. It shows the same listings as the website and works without an account: a branded splash, then Home. The profile button at the top right opens sign-in for guests and the profile for signed-in users. The bottom tabs are Home, Favorites, My reviews and Settings.

- **Screens**: Home (location picker, search, categories, top rated nearby), Search (suggestions, recent and popular searches, filters, sort, infinite list), Category (subcategory chips), Provider profile (services and prices, hours, areas, past work, reviews, Call and WhatsApp), Write or edit a review, Sign in, Create account, Profile, Help centre (FAQ, email and call support).
- **Settings**: light, dark or system theme; help and support; terms and privacy links (shown when set in the admin console's Settings, read from the public `GET /app-config`); sign out; delete account (`DELETE /auth/me`, customers only, confirmed with the password).
- **Design system**: tokens in `src/constants` (`colors.ts`, `spacing.ts`, `typography.ts`, `theme.ts`) drive the `App*` components in `src/components/design-system` through `useTheme()`, and the Tailwind config is generated from the same tokens, so NativeWind classes follow light and dark mode. Layout adapts from small phones to tablets (one to three columns).
- **State**: Zustand stores read MMKV synchronously on start (sign-in token, profile, theme, location, recent searches); server data goes through TanStack Query.
- **Version**: built on Expo SDK 57, the latest stable release. SDK 58 is still a preview; moving to it later is `npx expo install expo@^58 --fix`.

It is a standalone npm project (not part of the pnpm workspace) so Metro resolves packages normally:

```bash
cd mobile
npm install
cp .env.example .env      # EXPO_PUBLIC_API_URL must be reachable from the phone
npx expo run:android      # or run:ios; MMKV needs a development build, not Expo Go
npm run typecheck && npm run lint
npm test                  # renders every screen on the Android code path against the running API
```

After pulling changes to native packages, regenerate the native projects before running again: `npx expo prebuild --clean`. Add packages with `npx expo install`, not `npm install`, so native versions match the SDK; a mismatched native package (for example a newer `react-native-gesture-handler` pulled in as a peer) can crash the app at launch.

On a real phone, point `EXPO_PUBLIC_API_URL` at your computer's LAN address (for example `http://192.168.1.20:4000/api/v1`); the Android emulator reaches the host at `10.0.2.2`. Set the API's `PUBLIC_URL` to the same host so uploaded photos load on the device. `npx expo start --web` runs it in a browser; `http://localhost:8081` is in the API's default `CORS_ORIGINS` for that.

## Provider mobile app

`provider-mobile/` is DialNFind Business, the provider portal as an Android and iOS app on the same `/provider` API. Signing in leads to the dashboard when the account has a business, and to setup (add a new listing or claim an existing one) when it does not.

- **Tabs**: Dashboard (period stats, daily chart, profile checklist), Leads (channel filter, call or WhatsApp back), Reviews (filter and reply), More.
- **Screens**: Sign in, Create account, Start, Claim a listing (search, then an ownership document), Add your business (step by step), Edit profile, Services, Hours, Service areas, Portfolio, Verification, Promote, Plan, Support tickets and chat, Notifications, Help, Terms and Privacy.
- **Account**: providers cannot delete their account from the app because the API refuses it for businesses; the More tab's Close account row opens a support ticket instead.
- **Design system**: the same token files and `App*` components as `mobile/`, plus form parts in `src/components/forms` (select sheet, segmented control, switch row, progress bar, image and document upload fields).

```bash
cd provider-mobile
npm install
cp .env.example .env
npx expo run:android      # or run:ios; MMKV needs a development build, not Expo Go
npm run typecheck && npm run lint
npm test                  # walks the provider screens on the Android code path against the running API
```

Demo login: `provider@dialnfind.com` / `password123` (has a business); `newprovider@dialnfind.com` goes through setup. Run only one Expo dev server at a time, or start the second with `--port 8082`. The tests call the API on `EXPO_PUBLIC_API_URL` (default `http://localhost:4000/api/v1`) and sign in once per account, because sign-in is rate limited.

## Email, sign-in and security

- **Email** is sent by the API over SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `server/.env`; links point at `WEB_URL` and `PROVIDER_URL`). New accounts get a confirmation link (not required to use the apps; a banner asks until it is done). "Forgot password" on the website, provider portal, admin console and both mobile apps emails a one-hour reset link to `/reset-password` on the website. Links are single-use and only their SHA-256 hash is stored.
- **Sessions**: every sign-in is a row in `auth_sessions` and the token carries its id, so signing out ends it on the server. Customers and providers stay signed in for `SESSION_DAYS` (30); team members for `STAFF_SESSION_HOURS` (12). Changing or resetting a password, suspension, deletion and removal from the team sign the person out everywhere.
- **Rate limits** (`server/src/lib/rate-limit.ts`): sign-in, sign-up and password reset allow 10 attempts per 15 minutes per address and email; there are separate limits for contacts, the contact form, tickets, claims, billing requests, lead reports, reviews and reports, uploads and search, plus 600 requests per 15 minutes overall. `RATE_LIMIT_MULTIPLIER` scales them. Counters are kept in memory, so move them to Redis before running more than one API instance.
- **Documents** (ID proofs, ownership papers, support attachments) are stored in `UPLOAD_PRIVATE_DIR`, never served publicly. The API returns them as signed links that work for an hour; `GET /api/v1/files/...` refuses anything unsigned, expired or tampered with. `pnpm --filter server move-documents` moves documents uploaded before this change.

## Scheduled jobs

The API runs these itself when `RUN_JOBS=true` (set it in exactly one instance), in `APP_TIMEZONE`:

| Job | When | What it does |
| --- | --- | --- |
| `expire-subscriptions` | Hourly | Plans past their end date become expired; the ranking boost goes and the provider is emailed |
| `complete-campaigns` | Hourly | Promotions past their last day are marked completed |
| `remind-subscriptions` | 09:00 daily | Emails providers whose plan ends in 3 days |
| `recalculate-rankings` | 02:00 daily | Recalculates every provider's ranking score |
| `cleanup` | 03:30 daily | Removes old sessions, used email links and cached map lookups |

Run one by hand with `pnpm --filter server job <name>`.

## Maps and location

- Maps use Leaflet with OpenStreetMap tiles by default, with the required credit on every map. `NEXT_PUBLIC_MAP_TILE_URL` / `VITE_MAP_TILE_URL` (and `..._MAP_ATTRIBUTION`) switch to a hosted tile service, which you should do before heavy traffic.
- Location search lists cities and localities that have providers first, then fills up with places from OpenStreetMap Nominatim (`GEOCODER_*` in `server/.env`), so towns without providers can still be picked. "Use my location" names the area through `GET /locations/reverse`. Answers are cached for 30 days and requests are sent at most once a second, as the Nominatim policy asks; put a real contact email in `GEOCODER_USER_AGENT`.
- Search finds providers within the chosen radius and those who serve a locality inside it. When the customer has not picked a radius (the admin's default applies), it also includes providers who travel as far as the customer. Nobody more than 100 km away is shown.

## File uploads

Every image or document field (profile photo, business logo and cover, portfolio photos, review photos, verification and claim documents) is an upload field. The browser checks type and size, sends the file to `POST /api/v1/uploads?purpose=...`, and the returned URL is saved with the form.

- The server checks the file's real type from its first bytes, not its name. Images must be JPG, PNG or WebP; documents may also be PDF. Limits are 5 MB for avatars, logos and review photos, 8 MB for covers and portfolio photos, and 10 MB for documents.
- Images are written to `server/uploads/` (`UPLOAD_DIR`) and served from `PUBLIC_URL/uploads/...`; documents go to the private folder described above. Replaced or deleted logos, covers, portfolio and review photos are removed from disk.
- Storage sits behind the small `Storage` interface in `server/src/storage/index.ts`. Moving to S3 or another object store means adding one class with `put` and `remove` and returning it from `createStorage()`.
- In production set `PUBLIC_URL` to the API's public origin so stored links resolve for customers.

## Form validation

All forms validate in the browser with the same rules the API enforces (`server/src/lib/rules.ts`, mirrored in `web/lib/validation.ts`, `provider/src/lib/validation.ts` and `super-admin/src/lib/validation.ts`): Indian mobile numbers (saved as `+91XXXXXXXXXX`), 6-digit PIN codes, full `https://` links, passwords of 8 or more characters with a letter and a number, and length limits on every text field. Errors show under each field as the user leaves it, and server errors show at the top of the form.

## Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs server, web, provider and super-admin together |
| `pnpm build` | Builds all apps |
| `pnpm typecheck` | Type-checks all apps |
| `pnpm --filter server db:migrate` | Creates a new migration after schema changes |
| `pnpm --filter server db:seed` | Reloads demo data |
| `pnpm --filter server smoke` | Calls every API endpoint as each role against the running server (reseed afterwards; restart the API first if you ran it recently, since it signs in often) |
| `pnpm --filter server job <name>` | Runs one scheduled job now |
| `pnpm --filter server move-documents` | Moves documents uploaded before they became private |
