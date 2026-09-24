# DialNFind

A hyperlocal service directory: customers find trusted local providers (TV repair, plumbers, tutors...) near them and call or WhatsApp them directly. Providers claim or create a listing and manage it from their own portal.

The repository is a pnpm workspace with three separate apps:

| Folder | App | Stack | Dev URL |
| --- | --- | --- | --- |
| `server/` | REST API | Node, Express 5, Prisma 6, PostgreSQL + PostGIS, Zod, JWT | http://localhost:4000/api/v1 |
| `web/` | Customer website | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui | http://localhost:3000 |
| `provider/` | Provider portal | React 19 + Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query | http://localhost:5173 |

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

# 3. Create the schema and load demo data
pnpm --filter server db:deploy
pnpm --filter server db:seed

# 4. Run all three apps
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
| Super admin | `admin@dialnfind.com` | Admin API: categories, moderation, verification |

The seed creates 220 providers across 5 cities and 12 categories, with reviews, leads and 45 days of analytics. The default location is Sevoke Road, Siliguri.

When claiming a listing by phone, the verification code in development is `123456` (set by `DEV_OTP_CODE`).

## What is stubbed

These have their schema and endpoints in place but no live integration yet:

- **Google and Apple sign-in**: `POST /auth/oauth/google` and `/auth/oauth/apple` return `501 Not configured` until `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` are set. The buttons are shown in both apps.
- **Payments**: plan checkout is simulated outside production when `PAYMENT_GATEWAY_KEY` is empty, recording a transaction with a `sim_` reference.
- **SMS**: claim codes are not sent; the development code is returned by the API and shown in the UI.
- **Push notifications**: device tokens are stored (`/me/device-tokens`) but nothing is sent.

## File uploads

Every image or document field (profile photo, business logo and cover, portfolio photos, review photos, verification and claim documents) is an upload field. The browser checks type and size, sends the file to `POST /api/v1/uploads?purpose=...`, and the returned URL is saved with the form.

- The server checks the file's real type from its first bytes, not its name. Images must be JPG, PNG or WebP; documents may also be PDF. Limits are 5 MB for avatars, logos and review photos, 8 MB for covers and portfolio photos, and 10 MB for documents.
- Files are written to `server/uploads/` (`UPLOAD_DIR`) and served from `PUBLIC_URL/uploads/...`. Replaced or deleted logos, covers, portfolio and review photos are removed from disk.
- Storage sits behind the small `Storage` interface in `server/src/storage/index.ts`. Moving to S3 or another object store means adding one class with `put` and `remove` and returning it from `createStorage()`.
- In production set `PUBLIC_URL` to the API's public origin so stored links resolve for customers.

## Form validation

All forms validate in the browser with the same rules the API enforces (`server/src/lib/rules.ts`, mirrored in `web/lib/validation.ts` and `provider/src/lib/validation.ts`): Indian mobile numbers (saved as `+91XXXXXXXXXX`), 6-digit PIN codes, full `https://` links, passwords of 8 or more characters with a letter and a number, and length limits on every text field. Errors show under each field as the user leaves it, and server errors show at the top of the form.

## Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs server, web and provider together |
| `pnpm build` | Builds all apps |
| `pnpm typecheck` | Type-checks all apps |
| `pnpm --filter server db:migrate` | Creates a new migration after schema changes |
| `pnpm --filter server db:seed` | Reloads demo data |
| `pnpm --filter server smoke` | Calls every API endpoint as each role against the running server (reseed afterwards) |
