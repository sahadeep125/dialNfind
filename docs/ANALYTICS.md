# Product analytics (PostHog)

Every DialNFind surface sends events to **one PostHog project** (US cloud):
- customer website (`web/`)
- provider portal (`provider/`)
- customer app (`mobile/`)
- business app (`provider-mobile/`)
- API (`server/`)

One project means one person is followed from the website to the app and back. The admin console (`super-admin/`) sends nothing.

Each app is off until its key is set. All of them use the same project token (`phc_…`, a public value):

| App | Key | Host |
|---|---|---|
| Website | `NEXT_PUBLIC_POSTHOG_KEY` | `/ingest` on the site, rewritten to `POSTHOG_INGEST_HOST` in `web/next.config.ts` |
| Provider portal | `VITE_POSTHOG_KEY` | `VITE_POSTHOG_HOST=/ingest`, proxied by `deploy/spa-nginx.conf` (and by the Vite dev server) |
| Both apps | `EXPO_PUBLIC_POSTHOG_KEY` | `EXPO_PUBLIC_POSTHOG_HOST`, default `https://us.i.posthog.com` |
| API | `POSTHOG_KEY` | `POSTHOG_HOST`, default `https://us.i.posthog.com` |

The code lives in:
- `web/lib/analytics.ts`
- `provider/src/lib/analytics.ts`
- `mobile/src/services/analytics.ts` and `provider-mobile/src/services/analytics.ts`
- `server/src/services/analytics.ts`

The four client modules have the same shape: `track`, `identifyUser` and `resetUser`.

## Identity

- **distinct id:** the account's database id (`String(user.id)`), in every app and the API. Customers and providers share one `users` table, and a customer who starts a business keeps their id, so one person is one PostHog person.
- **Identify** runs whenever a signed-in account is loaded (sign-in, sign-up, session restore). It runs again when the role, name, email or plan changes, for example after onboarding.
  - Person properties: `email`, `name`, `role`, `provider_id`, `plan` (provider apps) and `signed_up_at` (set once).
  - Phone numbers are never sent.
- **Reset** runs on sign-out, on account deletion and when a session expires (401). The next person on the device starts as a new anonymous visitor.
- **Before sign-in**, activity is anonymous and is merged into the person on identify.
  - The website and the provider portal share a cookie on the parent domain, so the anonymous id carries over from `dialnfind.com` to `business.dialnfind.com`.
  - Persons are only created for identified users (`person_profiles: "identified_only"`).

## Properties on every event

| Property | Values |
|---|---|
| `app_type` | `customer_web`, `provider_web`, `customer_mobile`, `provider_mobile`, `backend` |
| `platform` | `web`, `ios`, `android`, `server` |
| `environment` | `production`, `staging`, `development` (from `*_APP_ENV`; mobile dev builds are always `development`) |
| `app_version` | app version from `app.json`, or the web package version (`NEXT_PUBLIC_APP_VERSION` / `VITE_APP_VERSION` override) |
| `user_type` | `customer`, `provider`, `anonymous` |
| `city` | the city being browsed (customer website and app) |

Example filters: `app_type = customer_mobile`, `user_type = provider`, `platform = ios`.

## Automatic capture

- **Web:**
  - Page views and page leaves, using `defaults: "2026-08-30"`, which records client-side navigation.
  - Autocapture of clicks.
  - `token` and `code` query parameters are masked in URLs.
- **Apps:**
  - `$screen` per Expo Router path (`AnalyticsSync`).
  - Taps.
  - App lifecycle events: installed, updated, opened, backgrounded.
- **Session replay** in all four apps. Every text input is masked; in the apps, all text is masked too. Web replays never record network request or response bodies or headers.
  - App replay needs a native build (`@posthog/react-native-plugin`), not an OTA update onto an old build.
  - Sampling and minimum duration are set in the PostHog project settings.

## Events

Client events describe what someone did. Server events (`source: "server"`) describe what was recorded, and cannot be skipped by ad blockers or closed apps. Use the server events for counting outcomes.

### Accounts (all apps)

| Event | Properties |
|---|---|
| `signed_up` | `method` (`password`, `google`, `apple`), `role` |
| `logged_in` | `method` |
| `logged_out` | none |
| `account_deleted` | `had_store_subscription` (provider apps) |
| `user_signed_up` (server) | `role`, `method` |
| `account_deleted` (server) | `role` |

### Customer (website, customer app)

| Event | Properties |
|---|---|
| `search_submitted` | `query`, `suggestion_type` (`service`, `category`, `provider` or null), `slug`, `source` (app: `search_bar`, `suggestion`, `popular`), `city` |
| `category_viewed` | `category`, `subcategory` |
| `provider_viewed` | `provider_id`, `provider_slug`, `category`, `provider_city`, `avg_rating`, `total_reviews`, `verification_status`, `is_claimed` |
| `contact_clicked` | `provider_id`, `channel` (`call`, `whatsapp`), `source` (`search`, `category_browse`, `profile`) |
| `phone_number_revealed` | `provider_id`, `source` (desktop web shows the number instead of dialing) |
| `lead_created` (server) | `lead_id`, `provider_id`, `channel`, `lead_source`, `category_id` (signed-in customers only) |
| `favorite_toggled` | `provider_id`, `favorited` |
| `review_submitted` / `review_updated` | `provider_id`, `rating`, `photo_count` |
| `review_deleted` | `review_id` |
| `review_created` (server) | `review_id`, `provider_id`, `rating`, `photo_count` |
| `provider_shared` | `method`, `provider_slug` or `path`, `completed` (app) |
| `report_submitted` | `target` (`listing`, `review`) |
| `location_changed` | `city`, `location_kind`, `previous_city` (app) |
| `onboarding_completed` | `app: "customer"` (app intro screens) |
| `claim_search_submitted` / `claim_clicked` | website claim page, app settings link |

### Provider (provider portal, business app)

| Event | Properties |
|---|---|
| `onboarding_step_completed` | `step`, `step_name`, `total_steps` |
| `onboarding_completed` | counts of services and areas |
| `provider_onboarded` (server) | `provider_id`, `status`, `was_customer` |
| `claim_submitted` | `provider_id`, `claim_id`, `was_customer` |
| `profile_saved` | none |
| `listing_section_saved` | `section` (`services`, `hours`, `serviceAreas`, `attributes`), `item_count` |
| `portfolio_photo_added` / `_updated` / `_removed`, `portfolio_cover_set`, `portfolio_reordered` | none |
| `verification_submitted` | `verification_type` |
| `availability_toggled` | `is_available` (app) |
| `lead_received` (server) | the same as `lead_created`, plus `over_limit`, sent as the business owner |
| `lead_updated` | `lead_id`, `status`, `has_note` |
| `lead_contacted` | `channel` (call-back from the leads list) |
| `lead_reported` | `lead_id` |
| `review_replied` / `review_reply_removed` / `review_reported` | `review_id` |

### Plans and promotion (provider apps and server)

| Event | Properties |
|---|---|
| `checkout_started` → `subscription_purchased`, or `checkout_dismissed` / `checkout_failed` | web: `plan`, `billing_cycle`, `payment_source: razorpay`; app: `product_id`, `package_type`, `price`, `currency`, `payment_source` (`app_store`, `play_store`), `is_plan_change` |
| `plan_changed`, `subscription_cancelled`, `subscription_resumed`, `purchases_restored` | self-serve plan management |
| `subscription_activated` / `subscription_plan_changed` / `subscription_ended` (server) | `plan_before`, `plan_after`, `billing_cycle`, `payment_source`, `end_status`. Sent from `applySubscriptionChange`, so admin grants and both gateways' webhooks are covered |
| `subscription_payment_failed` (server) | a renewal went past due |
| `promotion_requested`, `promotion_checkout_started` → `promotion_purchased`, or `promotion_checkout_dismissed` / `promotion_checkout_failed`, `promotion_toggled` | `category_id`, `days`, `budget`, `amount` |
| `sponsored_order_paid` (server) | `campaign_id`, `category`, `days`, `amount` |

### Everywhere

| Event | Properties |
|---|---|
| `support_ticket_created` | `ticket_id`, `category`, `attachment_count` |
| `notification_opened` | `notification_type`, `source` (`push`, `inbox`) |
| `push_permission_answered` | `status` (apps) |

## Adding an event

1. Call `track("object_verb", { snake_case_props })` from the app's analytics module, at the point where the action succeeded. A mutation's `onSuccess` is usually the right place.
2. Never put phone numbers, message text, passwords or document links in properties.
3. Add the event to this file.
