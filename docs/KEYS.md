# Keys and accounts needed for launch

Everything DialNFind needs from outside services before it can go live: what each key is, where to get it, and which app it goes into. Work down the checklist; the sections after it explain each item.

Two docs go further for two of the services:
- [social-login.md](social-login.md) covers Google and Apple sign-in step by step.
- [billing.md](billing.md) covers Razorpay and RevenueCat step by step.

This doc tells you what to collect, and points to those two for the detailed setup.

**Where values go:**
- **API**: `server/.env`, or your host's secret settings.
- **Web**: `web/.env.local` (the `NEXT_PUBLIC_*` values are Docker build arguments).
- **Provider** and **Admin**: `provider/.env` and `super-admin/.env` (Docker build arguments).
- **Apps**: EAS environment variables for `mobile/` and `provider-mobile/`, set with `eas env:create` or on expo.dev.

## Checklist

| # | What | Needed for | Goes into |
|---|---|---|---|
| 1 | Domains and https addresses | Launch | API, Web, Provider, Admin, Apps |
| 2 | PostgreSQL 16 with PostGIS (`DATABASE_URL`) | Launch | API |
| 3 | `JWT_SECRET` | Launch | API |
| 4 | First admin login (`BOOTSTRAP_ADMIN_*`) | First deploy only | API |
| 5 | Email sending (SMTP) | Launch: sign-up codes and password resets | API |
| 6 | Apple Developer account | iOS apps, Apple sign-in | Apps, API, Web, Provider |
| 7 | Google Play Console account | Android apps | Apps |
| 8 | Expo (EAS) account and project ids | Building apps, push notifications | Apps |
| 9 | Google sign-in client IDs | Google sign-in (optional; the button is hidden without it) | API, Web, Provider, Apps |
| 10 | Sign in with Apple IDs and key | Apple sign-in (required on iOS when Google sign-in is offered) | API, Web, Provider, Apps |
| 11 | Razorpay keys | Plan and promotion payments on the website | API |
| 12 | RevenueCat keys | Plan purchases in the business app | API, business app |
| 13 | Sentry DSNs and token | Crash and error reports (optional, strongly advised) | Web, Apps |
| 14 | Android signing fingerprint | Links on the website opening the Android app | Web |
| 15 | Seller and support details | GST invoices, support contacts, legal links | Admin console → Settings (not a key) |
| 16 | Optional extras | Search Console, map tiles, store links | Web, Provider, Admin |

---

## 1. Domains

**Pick the addresses first; almost every other step asks for them.** Suggested:

| App | Address |
|---|---|
| Website | `https://dialnfind.com` |
| Provider portal | `https://business.dialnfind.com` |
| Admin console | `https://admin.dialnfind.com` |
| API | `https://api.dialnfind.com` |

All four must be https. Where each address goes:

| Setting | Value |
|---|---|
| API `PUBLIC_URL` | API address |
| API `WEB_URL` | Website address |
| API `PROVIDER_URL` | Provider portal address |
| API `ADMIN_URL` | Admin console address |
| API `CORS_ORIGINS` | Website, provider and admin addresses, comma-separated |
| Web `API_URL` | `https://api.dialnfind.com/api/v1` |
| Web `NEXT_PUBLIC_SITE_URL` | Website address |
| Web `NEXT_PUBLIC_IMAGE_ORIGINS` | API address |
| Web `NEXT_PUBLIC_PROVIDER_APP_URL` | Provider portal address |
| Provider and Admin `VITE_API_URL` | `https://api.dialnfind.com/api/v1` |
| Provider and Admin `VITE_WEB_URL` | Website address |
| Apps `EXPO_PUBLIC_API_URL` | `https://api.dialnfind.com/api/v1` |
| Apps `EXPO_PUBLIC_WEB_URL` | Website address |
| Business app `EXPO_PUBLIC_PROVIDER_URL` | Provider portal address |

## 2. Database: `DATABASE_URL` (API)

You need PostgreSQL 16 with the **PostGIS** extension. Any managed Postgres that offers PostGIS works (for example Supabase, Neon, AWS RDS or DigitalOcean), or run it yourself.

The value looks like `postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public`. Turn on daily backups.

## 3. `JWT_SECRET` (API)

It signs sign-in sessions and private file links. Generate it once and keep it secret:

```bash
openssl rand -base64 48
```

The API will not start in production unless this is at least 32 characters long. If you change it later, everyone is signed out.

## 4. First admin: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (API)

- Pick the email and a password of at least 12 characters for the first super admin.
- The first release step (`pnpm release`) creates that account.
- After you sign in, change the password and delete both values.

## 5. Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SUPPORT_EMAIL` (API)

Without these, nobody can finish signing up, because the confirmation code is emailed. Use a transactional email service such as Amazon SES, Brevo, Postmark, Mailgun or Zoho ZeptoMail. A personal Gmail account hits sending limits quickly.

1. Create an account with the service and add your domain (`dialnfind.com`).
2. Add the DNS records it gives you (SPF, DKIM, and ideally DMARC), so mail does not land in spam.
3. Create SMTP credentials. The service shows the host, port (587 or 465), username and password.
4. Set these:
   - `SMTP_FROM="DialNFind <no-reply@dialnfind.com>"`
   - `SUPPORT_EMAIL`: the inbox that should get replies, for example `support@dialnfind.com`
5. Also put a real contact email in `GEOCODER_USER_AGENT`, for example `DialNFind/1.0 (support@dialnfind.com)`. OpenStreetMap's place search requires it.

## 6. Apple Developer account

1. Enrol at [developer.apple.com/programs](https://developer.apple.com/programs/). The fee is USD 99 a year. Enrol as an organisation, which needs a D-U-N-S number, so the store shows your company name.
2. Note the **Team ID** from Membership details: `APPLE_TEAM_ID` (API and Web). The repo currently uses `9HH33XNTUX`; replace it if your team is different.
3. In **App Store Connect → Apps**, create two apps:
   - DialNFind, bundle `com.dialnfind.app`
   - DialNFind Business, bundle `com.dialnfind.business`
4. For each app, open **App Information** and copy the numeric **Apple ID**. It goes into `submit.production.ios.ascAppId` in that app's `eas.json`.
5. Accept the **Paid Apps agreement** and add bank and tax details under Agreements. Without them, in-app purchases do not work.

## 7. Google Play Console account

1. Sign up at [play.google.com/console](https://play.google.com/console). The fee is USD 25, once. It asks for identity verification and, for an organisation, a D-U-N-S number.
2. Create two apps, with packages `com.dialnfind.app` and `com.dialnfind.business`.
3. Set up a merchant (payments) profile. The business app sells subscriptions, so it needs one.
4. Create a **service account** for uploading builds:
   1. Google Cloud Console → IAM → Service accounts → create one, then Keys → add a JSON key.
   2. Play Console → Users and permissions → invite the service account's email, with release permissions.
   3. Save the JSON file. Its path goes into `submit.production.android.serviceAccountKeyPath` in `eas.json`. Keep the file out of git.

## 8. Expo / EAS: project ids (Apps)

1. Create an account (or organisation) at [expo.dev](https://expo.dev).
2. Link each app to the account:

   ```bash
   cd mobile && npx eas-cli login && npx eas-cli init
   cd ../provider-mobile && npx eas-cli init
   ```

   `eas init` writes the project id and owner into `app.json`. Push notifications stay off until then.
3. Enable over-the-air updates: run `npx eas-cli update:configure` in each app.
4. Add each app's `EXPO_PUBLIC_*` values from this doc as EAS environment variables for `production` and `preview`.
5. Leave Expo's "enhanced push security" off. The API sends push notifications without an access token.

## 9. Google sign-in

Full steps are in [social-login.md](social-login.md) § 1. All of this lives in one Google Cloud project, under APIs & Services → Credentials.

| Credential | Setting |
|---|---|
| OAuth consent screen (published, not in "Testing") | — |
| **Web client ID** | Web `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, Provider `VITE_GOOGLE_CLIENT_ID`, both apps' `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| **iOS client ID** for `com.dialnfind.app` | Customer app `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| **iOS client ID** for `com.dialnfind.business` | Business app `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| **Android clients**, one per package and per signing certificate SHA-1 (debug, EAS upload key, Play App Signing) | No value to copy; Google matches on package and SHA-1 |
| All three client IDs above, comma-separated | API `GOOGLE_CLIENT_IDS` |

## 10. Sign in with Apple

Full steps are in [social-login.md](social-login.md) § 2. All of this is done at developer.apple.com → Certificates, Identifiers & Profiles.

| What | How to get it | Setting |
|---|---|---|
| Sign in with Apple on both App IDs | Identifiers → App IDs → enable the capability | — |
| **Services ID**, e.g. `com.dialnfind.signin` | Identifiers → Services IDs → create one; add your domains and return URLs | API `APPLE_SERVICES_ID`, Web `NEXT_PUBLIC_APPLE_SERVICES_ID`, Provider `VITE_APPLE_SERVICES_ID`, both apps' `EXPO_PUBLIC_APPLE_SERVICES_ID` |
| Accepted IDs | Both bundle IDs plus the Services ID | API `APPLE_CLIENT_IDS="com.dialnfind.app,com.dialnfind.business,com.dialnfind.signin"` |
| **Key ID** and **.p8 key** | Keys → create a key with Sign in with Apple enabled, then download the `.p8`. You can only download it once. | API `APPLE_KEY_ID`, and API `APPLE_PRIVATE_KEY` (the file contents on one line, with `\n` for each line break) |
| Return URLs | Web: `https://dialnfind.com/login`. Provider: `https://business.dialnfind.com/login` | Web `NEXT_PUBLIC_APPLE_REDIRECT_URI`, Provider `VITE_APPLE_REDIRECT_URI` |

App Review checks that deleting an account revokes Apple access. That only works when `APPLE_PRIVATE_KEY` is set.

## 11. Razorpay (payments on the website)

Full steps are in [billing.md](billing.md), "Razorpay (web)".

1. Sign up at [razorpay.com](https://razorpay.com) and complete KYC. You need a business PAN, GSTIN, bank account and website. Live keys only work after KYC is approved.
2. Turn on **Subscriptions** in the dashboard.
3. Under Settings → API Keys, generate the keys. Use test mode first (`rzp_test_…`), and switch to live keys at launch.

| Value | How to get it | Setting |
|---|---|---|
| Key ID | Settings → API Keys | API `RAZORPAY_KEY_ID` |
| Key Secret | Shown once when the key is generated | API `RAZORPAY_KEY_SECRET` |
| Webhook secret | A long random string you make up (`openssl rand -hex 32`). Enter it when you add the webhook `https://api.dialnfind.com/api/v1/webhooks/razorpay` with the events listed in billing.md. | API `RAZORPAY_WEBHOOK_SECRET` |

After the API is live, go to Admin console → Plans and billing → **Sync to Razorpay**.

## 12. RevenueCat (purchases in the business app)

Full steps are in [billing.md](billing.md), "RevenueCat (business app)". Do sections 6 and 7 first: RevenueCat needs both store accounts.

1. **Create the subscription products in both stores.** Use these product ids:
   - Pro: `dnf_pro_monthly`, `dnf_pro_yearly`
   - Business: `dnf_business_monthly`, `dnf_business_yearly`
   - On Android, the format is `dnf_pro:monthly`, and so on.
2. **Create a RevenueCat project** at [revenuecat.com](https://www.revenuecat.com) and add both apps.
3. **Give RevenueCat store access:**
   - App Store: an **In-App Purchase key**. In App Store Connect → Users and Access → Integrations → In-App Purchase, create it and upload the `.p8` to RevenueCat.
   - Google Play: a **service account** JSON with financial permissions, uploaded to RevenueCat.
4. **Set up entitlements and an offering:**
   - Entitlement `provider_pro`: all four products.
   - Entitlement `provider_business`: the two Business products.
   - One current offering that contains all four packages.

| Value | Where | Setting |
|---|---|---|
| iOS public SDK key (`appl_…`) | Project → API keys | Business app `EXPO_PUBLIC_REVENUECAT_IOS_KEY` |
| Android public SDK key (`goog_…`) | Project → API keys | Business app `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` |
| Secret API key, v1 (`sk_…`) | Project → API keys → new secret key | API `REVENUECAT_SECRET_KEY` |
| Webhook authorization | A long random string you make up. Enter it as the Authorization header on the webhook `https://api.dialnfind.com/api/v1/webhooks/revenuecat`. | API `REVENUECAT_WEBHOOK_AUTH` |
| Project ID | In the dashboard URL | API `REVENUECAT_PROJECT_ID` (only for links from the admin console) |

Without the two public keys, the business app cannot sell plans.

## 13. Sentry (error reports)

Optional, but without it you won't hear about crashes. The free tier is enough to start.

1. Create an organisation at [sentry.io](https://sentry.io), with three projects: `dialnfind-web` (Next.js), `dialnfind-app` (React Native) and `dialnfind-business` (React Native).
2. Copy each project's **DSN** (Project settings → Client Keys):
   - `dialnfind-web` → Web `NEXT_PUBLIC_SENTRY_DSN`
   - `dialnfind-app` → customer app `EXPO_PUBLIC_SENTRY_DSN`
   - `dialnfind-business` → business app `EXPO_PUBLIC_SENTRY_DSN`
3. Set these for readable stack traces:
   - `SENTRY_ORG` (the organisation slug) and `SENTRY_PROJECT` (each project's slug) in Web and in each app's EAS environment.
   - An **auth token** (Settings → Auth Tokens, with project write scope) as `SENTRY_AUTH_TOKEN`. In EAS, make it a secret.

The API, provider portal and admin console do not report to Sentry yet.

## 14. Android signing fingerprint: `ANDROID_SHA256_CERT_FINGERPRINTS` (Web)

This lets links to `dialnfind.com/providers/...` open the Android app.

1. Upload the first build to Play Console.
2. Go to Play Console → your app → Test and release → **App integrity** → App signing.
3. Copy the **SHA-256** certificate fingerprint of the app signing key.
4. Put it in Web `ANDROID_SHA256_CERT_FINGERPRINTS`. If there are several, separate them with commas.
5. The **SHA-1** from the same page goes into the Google Android OAuth client (section 9).

## 15. Set in the admin console, not as keys

Sign in as the super admin and fill in **Settings**:

- **Invoicing:**
  - legal business name, GSTIN, address and state code
  - SAC code, invoice number prefix and GST rate
- Do this before the first Razorpay payment. Invoices keep the details they were issued with.
- **Support:** support email, **support phone** (the apps show a placeholder number until it is set) and support hours.
- **Legal:** links to your published Terms and Privacy pages. The app stores require a privacy policy URL.

## 16. Optional

| What | How to get it | Setting |
|---|---|---|
| Google Search Console token | [search.google.com/search-console](https://search.google.com/search-console) → add property → HTML tag method → copy the `content` value | Web `GOOGLE_SITE_VERIFICATION` |
| Hosted map tiles | OpenStreetMap's own tile servers are not for heavy traffic. Sign up with a tile service (MapTiler, Stadia Maps, Thunderforest) and copy its tile URL and attribution. | `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` (Web); `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` (Provider and Admin) |
| Store links | After both apps are live | Web `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL` |
| Office address | Your office address | Web `NEXT_PUBLIC_OFFICE_ADDRESS`, `NEXT_PUBLIC_OFFICE_REGION` |

## Keep secret

Never put these in the apps or in git:
- `JWT_SECRET`, `DATABASE_URL`, `SMTP_PASS`
- `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`
- `APPLE_PRIVATE_KEY`, `SENTRY_AUTH_TOKEN`
- the Google Play service account JSON

Every `NEXT_PUBLIC_*`, `VITE_*` and `EXPO_PUBLIC_*` value ends up inside the website or app, where anyone can read it. That is fine for client IDs, public SDK keys and DSNs, but never for secrets.
