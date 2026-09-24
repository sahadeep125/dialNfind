# DialNFind

A hyperlocal service directory: customers find trusted local providers (TV repair, plumbers, tutors...) near them and call or WhatsApp them directly. Providers claim or create a listing and manage it from their own portal.

The repository is a pnpm workspace with four separate apps:

| Folder | App | Stack | Dev URL |
| --- | --- | --- | --- |
| `server/` | REST API | Node, Express 5, Prisma 6, PostgreSQL + PostGIS, Zod, JWT | http://localhost:4000/api/v1 |
| `web/` | Customer website | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui | http://localhost:3000 |
| `provider/` | Provider portal | React 19 + Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query | http://localhost:5173 |
| `super-admin/` | Admin console for the DialNFind team | React 19 + Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Recharts | http://localhost:5174 |

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

`pnpm --filter server db:reset` drops and reseeds everything. `pnpm --filter server rank` recalculates ranking scores (meant to run on a schedule).

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

When claiming a listing by phone, the verification code in development is `123456` (set by `DEV_OTP_CODE`).

## Admin console

`super-admin/` is for the DialNFind team only. Customer and provider accounts are refused at sign-in. It covers:

- **Marketplace**: providers (approve, suspend, badges, grant a plan), listing claims, verification documents, categories with subcategories and attributes, badges, reviews and reports.
- **Revenue**: subscription plans with their features, subscribers and payments; promotions (sponsored listings) with budgets.
- **People**: customer and provider accounts, leads, support tickets, announcements.
- **System**: settings, plugins, team and roles, audit log. The dashboard and analytics pages show growth, leads, top categories and cities.

**Team and permissions.** `super_admin` can open everything. Everyone else has the `admin` role plus an admin role (Operations, Support agent, Finance, or any role the super admin creates) that lists the sections they can open. The API enforces this on every `/admin` path (`server/src/lib/permissions.ts`); the console hides what a member cannot open. Only the super admin can manage Team, so no one can widen their own access. Adding a member returns a temporary password once, since email is not wired yet.

**Support tickets.** Customers raise tickets from the website (Dashboard, Help and support, or the contact form) and providers from the provider portal. Staff reply from the console; customers see replies as "DialNFind Support", and internal notes are never shown to them. References look like `DNF-000123`.

**Plugins.** Razorpay, MSG91, WhatsApp Business, Google Maps, Google and Apple sign-in, SMTP email, Firebase Cloud Messaging and Google Analytics are configured from Plugins and stored in the `settings` table as `plugin.<name>.<field>`. Secret values are write-only: the API only returns them masked (`••••1234`) and the audit log records that a secret changed, never its value. Sign-in with Google or Apple turns on when either its environment variable or its plugin is set.

The console runs on port 5174, which is already in the API's default `CORS_ORIGINS`.

## What is stubbed

These have their schema and endpoints in place but no live integration yet:

- **Google and Apple sign-in**: `POST /auth/oauth/google` and `/auth/oauth/apple` return `501 Not configured` until `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` or the matching plugin is set. The buttons are shown in both apps.
- **Payments**: plan checkout is simulated outside production when `PAYMENT_GATEWAY_KEY` is empty, recording a transaction with a `sim_` reference.
- **SMS**: claim codes are not sent; the development code is returned by the API and shown in the UI.
- **Push notifications**: device tokens are stored (`/me/device-tokens`) but nothing is sent.
- **Plugin keys**: saved and masked in the console, but only sign-in reads them so far; the payment, SMS, WhatsApp, email and push senders still need to be written against them.
- **Team invites**: no email is sent; the super admin shares the temporary password shown once in the console.

## File uploads

Every image or document field (profile photo, business logo and cover, portfolio photos, review photos, verification and claim documents) is an upload field. The browser checks type and size, sends the file to `POST /api/v1/uploads?purpose=...`, and the returned URL is saved with the form.

- The server checks the file's real type from its first bytes, not its name. Images must be JPG, PNG or WebP; documents may also be PDF. Limits are 5 MB for avatars, logos and review photos, 8 MB for covers and portfolio photos, and 10 MB for documents.
- Files are written to `server/uploads/` (`UPLOAD_DIR`) and served from `PUBLIC_URL/uploads/...`. Replaced or deleted logos, covers, portfolio and review photos are removed from disk.
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
| `pnpm --filter server smoke` | Calls every API endpoint as each role against the running server (reseed afterwards) |
