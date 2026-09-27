# Deploying DialNFind

The hosting platform is not chosen yet, so this guide covers what every setup needs: the images, the release step, the settings for each app, and the one-time setup with Google, Apple, Razorpay, RevenueCat and the app stores. CI (`.github/workflows/ci.yml`) typechecks, lints, tests and runs the API smoke test on every push.

## What runs where

| Part | Image | Listens on | Notes |
| --- | --- | --- | --- |
| API | `server/Dockerfile` | 4000 | Needs PostgreSQL 16 with PostGIS and a persistent disk at `/app/uploads` |
| Website | `web/Dockerfile` | 3000 | `NEXT_PUBLIC_*` are build arguments |
| Provider portal | `deploy/spa.Dockerfile`, `APP=provider` | 8080 | Static files behind nginx, with the SPA fallback |
| Admin console | `deploy/spa.Dockerfile`, `APP=super-admin` | 8080 | Same image recipe; keep it on its own subdomain |

Build every image from the repository root, because the pnpm lockfile lives there. The build commands are at the top of each Dockerfile. These images have not been built yet: CI checks the apps, not the Dockerfiles, so build each one once before the first deploy.

Suggested addresses: `dialnfind.com` (website), `business.dialnfind.com` (provider portal), `admin.dialnfind.com` (admin console) and `api.dialnfind.com` (API). Put every one on https; the mobile apps refuse plain http in release builds.

## Rules for running the API

- **One instance for now.** Uploads are on local disk and rate-limit counters are in memory, so a second instance would miss files and double the limits. Moving to several instances means an object store (a new class behind `server/src/storage/index.ts`) and Redis for `server/src/lib/rate-limit.ts`.
- **Uploads:** mount a persistent volume at `/app/uploads`, which holds `public/` and `private/`. Back it up together with the database; either one without the other is incomplete.
- **Jobs:** set `RUN_JOBS=true` on the instance, and on one instance only.
- **Proxies:** set `TRUST_PROXY_HOPS` to the number of proxies in front of the API: 1 for nginx or a load balancer, 2 with a CDN in front of that.
- **Health:** `GET /api/v1/health` checks the database and is not rate limited, so point uptime checks and load balancers at it.
- **Shutdown:** on SIGTERM the API stops taking requests, waits up to 10 seconds for requests in flight, then exits.

## Release step (every deploy)

Run this once per release, before the new API version starts:

```bash
docker run --rm --env-file api.env dialnfind-api pnpm release
# = prisma migrate deploy && tsx prisma/bootstrap.ts
```

`bootstrap.ts` only adds what is missing: the Free, Pro and Business plans, default settings, the starting categories and admin roles, and the first super admin. On the first deploy, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (12 or more characters). Sign in, change the password, then remove both variables.

Never run `db:seed` against production. It empties every table, and it refuses to run when `NODE_ENV=production`.

## Settings

### API (`server/.env.example` has every variable)

With `NODE_ENV=production`, which the image sets, the API refuses to start unless all of these hold:
- `JWT_SECRET` is 32 or more random characters;
- `PUBLIC_URL`, `WEB_URL`, `PROVIDER_URL` and `ADMIN_URL` are https addresses that are not localhost;
- `CORS_ORIGINS` is set;
- `SMTP_HOST` is set.

Also set:
- `DATABASE_URL`
- `CORS_ORIGINS`: the website, provider and admin origins
- `SMTP_*` and `SUPPORT_EMAIL`
- `GEOCODER_USER_AGENT`, with a real contact email
- `RUN_JOBS=true`
- `TRUST_PROXY_HOPS`
- Social sign-in: `GOOGLE_CLIENT_IDS`, `APPLE_*` ([social-login.md](social-login.md))
- Payments: `RAZORPAY_*`, `REVENUECAT_*` ([billing.md](billing.md))
- Analytics: `POSTHOG_KEY`, `APP_ENV` ([ANALYTICS.md](ANALYTICS.md))

### Website

**Build arguments:**
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_IMAGE_ORIGINS` (the API origin)
- `NEXT_PUBLIC_PROVIDER_APP_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_APPLE_*`
- `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY` ([ANALYTICS.md](ANALYTICS.md)); events go through `/ingest` on the site
- `API_URL`: prerendered pages call the API during the build, so the builder must be able to reach it

**Runtime:**
- `API_URL`
- `CLIENT_IP_HEADER`, only when your proxy always overwrites that header (for example `x-real-ip` behind nginx)
- `ANDROID_SHA256_CERT_FINGERPRINTS` (Play Console → App integrity), so links open the Android app
- `APPLE_TEAM_ID`, `GOOGLE_SITE_VERIFICATION`

### Provider portal and admin console

Build arguments:
- `VITE_API_URL` (required; the build stops without it) and `VITE_WEB_URL`
- Provider portal only: `VITE_GOOGLE_CLIENT_ID`, `VITE_APPLE_*` and `VITE_POSTHOG_KEY` (analytics go through `/ingest`, proxied by `deploy/spa-nginx.conf`)

These apps keep the sign-in token in the browser. Before launch, add a Content-Security-Policy header at the proxy, in report-only mode first. It must allow Razorpay Checkout, Google Identity and Sign in with Apple, then be tightened.

## Outside services (one time)

- **Webhooks:**
  - Razorpay → `https://api.dialnfind.com/api/v1/webhooks/razorpay`
  - RevenueCat → `https://api.dialnfind.com/api/v1/webhooks/revenuecat`
  - Apple server notifications → `https://api.dialnfind.com/api/v1/auth/apple/notifications`
- **Razorpay:** live keys, then Admin → Plans and billing → Sync to Razorpay. Set the seller GSTIN and address under Settings → Invoicing before the first payment.
- **Google and Apple:** follow the release checklist in [social-login.md](social-login.md).

## Mobile apps (`mobile/`, `provider-mobile/`)

Once per app:
1. **Link the project to EAS.** `eas init` adds the EAS project id. Push notifications stay off until it exists.
2. **Set up over-the-air updates.** `eas update:configure` installs `expo-updates` and sets the update URL. Also set `runtimeVersion: { "policy": "appVersion" }` in `app.json`.
3. **Add the EAS environment variables** for `production` and `preview`:
   - `EXPO_PUBLIC_API_URL=https://api.dialnfind.com/api/v1` and `EXPO_PUBLIC_WEB_URL`
   - the Google, Apple, Sentry and PostHog (`EXPO_PUBLIC_POSTHOG_KEY`) keys
   - business app only: `EXPO_PUBLIC_PROVIDER_URL` and the RevenueCat keys
   - secret: `SENTRY_AUTH_TOKEN`. Leave Expo's enhanced push security off: the API sends pushes without an access token.
4. **Fill in store submission.** Add `submit.production` in `eas.json`: `ascAppId` for iOS, and the Play service account and track for Android.
5. **Fill in the store listings.**
   - App Store Connect privacy label: account (name, email, phone), location (searches), photos (reviews and listings), crash data (Sentry), purchases (business app), product interaction and usage data (PostHog analytics and session replay, linked to the account, not used for tracking across other companies' apps).
   - Play Data safety form: the same data.
   - iPad screenshots, because `supportsTablet` is on.
6. **Business app only: have the purchase path ready.** Store purchases need the RevenueCat keys in the build. Without them the app has no way to buy a plan and only says upgrades are not available.

The full list of keys and where to get each one is in [KEYS.md](KEYS.md).

Then build and release: `eas build --profile production` and `eas submit --profile production`.
