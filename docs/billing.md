# Plans, payments and invoices

Providers can be on one of three plans: **Free**, **Pro** and **Business**. They can pay on the web through Razorpay Subscriptions, or in the business app through the App Store or Google Play (handled by RevenueCat). The DialNFind team can also grant a plan by hand after an offline payment. Every one of these writes to the same subscription tables, and the server alone decides what a provider can use.

```
                 provider_subscriptions (server = source of truth)
                       │
             ┌─────────┴──────────┐
        RevenueCat           Razorpay Subscriptions      Admin grant
        ┌────┴────┐             (web)                   (offline payment)
     App Store  Google Play
```

## Entitlements

Apps never check plan names. They check two entitlements, the same identifiers RevenueCat uses:

| Plan | Entitlements |
|---|---|
| Free | none |
| Pro | `provider_pro` |
| Business | `provider_pro`, `provider_business` |

The mapping lives in `server/src/lib/plans.ts`. A plan's **code** (`free`, `pro`, `business`) decides its entitlements and never changes. Its numeric limits are edited in the admin console under Plans and billing → Plans.

| Feature | Needs | Enforced in |
|---|---|---|
| Leads with full customer details | limit per month on the plan (Free: 10) | `/provider/leads`, `/provider/dashboard`. Leads over the limit arrive with `locked: true` and no customer details. |
| Analytics (views, impressions, conversion, ranking) | `provider_pro` | `/provider/dashboard` returns `analyticsLocked` and leaves those fields null |
| WhatsApp button on the public profile | `provider_pro` | public provider payloads and `POST /leads` |
| Portfolio photos | limit on the plan (Free 3, Pro 30, Business unlimited) | `POST /provider/portfolio` and the public profile |
| Sponsored campaigns | `provider_business` | `/provider/sponsored/*` |
| Priority support | `provider_business` | new tickets are opened as priority high |
| Partner badge and ranking boost | plan `badgeId` and `rankingBoost` | given or taken away on every plan change |

A gated request answers **402** with `{ error: { code: "upgrade_required", details: { entitlement, feature } } }`. The provider web app opens its upgrade dialog and the business app opens `/paywall` when they get this response.

Every app reads the plan from `GET /provider/me` → `plan`: code, entitlements, features, the live subscription and usage against limits.

## How a subscription changes

`applySubscriptionChange()` in `server/src/services/entitlements.ts` is the only code that writes subscriptions. The admin grant, the Razorpay webhooks and the RevenueCat sync all go through it. It:

- keeps one live subscription per provider (`active` or `past_due`)
- gives or removes the plan's badge
- recalculates ranking
- notifies the provider

**Buying in two places.** Plans bought in a store must be changed in that store, so web checkout answers 409. When the plan was bought on the web, the app hides its buy buttons. An admin grant replaces a web subscription (Razorpay is told to stop charging) but is refused while a store subscription is live.

**Failed renewals.** A subscription goes to `past_due` and keeps working for 3 days: `graceUntil`, or the store's own grace period. The hourly `expire-subscriptions` job then checks with Razorpay or RevenueCat, in case a webhook was missed, before moving the provider to Free.

## Razorpay (web)

1. Create API keys in the Razorpay dashboard: test mode first (`rzp_test_…`).
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the server.
3. Add a webhook:
   - **URL:** `https://<api host>/api/v1/webhooks/razorpay`
   - **Secret:** any long random string, also set as `RAZORPAY_WEBHOOK_SECRET`.
   - **Events:** `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.paused`, `refund.processed`.
4. In the admin console, open **Plans and billing → Plans → Sync to Razorpay**. This creates a Razorpay plan for each price. Razorpay plans cannot change price, so after you change an amount, sync again. Current subscribers keep their old price.

Checkout flow in the provider portal:

1. `POST /provider/billing/razorpay/checkout` creates the subscription.
2. Razorpay Checkout opens with it.
3. `POST /provider/billing/razorpay/verify` checks the signature and switches the plan on.
4. `subscription.charged` webhooks record each renewal, issue its invoice and move `endDate` forward.

To test, use test cards or UPI id `success@razorpay`. For webhooks on localhost, forward them with a tunnel such as ngrok.

## RevenueCat (business app)

1. In RevenueCat, create a project with an App Store app (`com.dialnfind.business`) and a Play Store app (`com.dialnfind.business`).
2. Create the store products and add them in RevenueCat:

   | Plan | iOS product | Android subscription:base plan |
   |---|---|---|
   | Pro monthly / yearly | `dnf_pro_monthly` / `dnf_pro_yearly` | `dnf_pro:monthly` / `dnf_pro:yearly` |
   | Business monthly / yearly | `dnf_business_monthly` / `dnf_business_yearly` | `dnf_business:monthly` / `dnf_business:yearly` |

   Put all four iOS products in one subscription group, so moving between Pro and Business is an upgrade.
3. Entitlements:
   - `provider_pro` gets all Pro **and** Business products.
   - `provider_business` gets the Business products only.
4. Make an offering the current one and add the four packages to it.
5. Add a webhook:
   - **URL:** `https://<api host>/api/v1/webhooks/revenuecat`
   - **Authorization header:** any long random string, also set as `REVENUECAT_WEBHOOK_AUTH`.
6. Server settings:
   - `REVENUECAT_SECRET_KEY`: a v1 secret key (`sk_…`), used to read subscribers.
   - `REVENUECAT_PROJECT_ID`: for links from the admin console.
7. Business app settings:
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`).
   - Then make a new development build (`npx expo run:ios` / `run:android`). Store purchases do not work in Expo Go.

The product ids per price can be changed under Plans and billing → Plans. The app matches store packages on them.

Identity and syncing:

- The app user id is `provider_<providerId>`, because purchases belong to the business, not to the person signed in.
- The app calls `Purchases.logIn` once the session has a business, and `logOut` on sign-out.
- After a purchase or restore, the app calls `POST /provider/billing/revenuecat/sync`, so the plan switches on without waiting for the webhook.
- The webhook reads the subscriber again from RevenueCat on every event, so events arriving out of order do not matter.

To test, use a StoreKit configuration file or sandbox tester on iOS, and a license tester on an internal testing track on Android.

## Invoices (GST)

- **When:** an invoice is issued for every successful Razorpay charge and every payment the team records. It is emailed to the provider. Store purchases have no DialNFind invoice, because Apple and Google are the seller and send their own receipts.
- **Numbers:** `DNF/2026-27/00001`, sequential per Indian financial year, never reused. Void an invoice instead of deleting it.
- **Tax:** prices include GST, so taxable value = total ÷ (1 + rate). The rate defaults to 18%. It is split as CGST + SGST when the provider's state matches the seller's state, and as IGST otherwise.
- **Seller details:** set in the admin console under Settings → Invoicing: legal name, GSTIN, address, state code, SAC code, number prefix and rate. Issued invoices keep the details they were issued with.
- **Buyer details:** the provider sets name, address, state and an optional GSTIN in Plan and billing.
- **PDFs:** rendered on demand. Lists carry signed links that last an hour: `GET /api/v1/invoice-files/<id>.pdf?exp&sig`.

## Admin console

**Plans and billing** has these tabs:

- **Overview:** MRR, paying subscribers, subscribers per plan and per store, money collected, failed renewals and failed webhooks.
- **Plans:** limits, prices, store product ids, Sync to Razorpay.
- **Subscribers:** filter by status and by where they pay, with links to the Razorpay subscription or RevenueCat customer.
- **Payments:** Razorpay refunds, and issuing an invoice for older payments.
- **Invoices:** GST totals, PDFs, voiding and CSV export.
- **Webhooks:** every event received, with a Retry for failed ones.

The provider page shows the plan, entitlements, usage and invoices. It also has **Change plan** (a grant, optionally with a recorded payment) and **Move to Free now**.
