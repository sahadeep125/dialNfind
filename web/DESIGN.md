# KaajVa design system

KaajVa is a directory of repair technicians and local service pros in Siliguri. People arrive with
something broken, often on a phone, and want one thing: the nearest person who can fix it, and a way
to call them. The design keeps that path short and calm.

## 1. Principles

- **Clean and fresh.** A white page, cool light-grey bands, generous side padding. Nothing beige.
- **Soft depth, not outlines.** Separate things with small, soft shadows and very light hairlines.
  No dark borders around cards, fields or chips.
- **Navy for identity, orange for action.** Navy (logo) carries the search header, the profile
  signboard and the footer. Orange marks the one main action on a screen: Search, Call.
- **Honest content.** Ratings and reviews only when real ones exist, never "No reviews yet". No
  "Member since". A business shows only its own logo and photos; no stock pictures stand in for it.
- **Distance first.** "How far?" is the question people compare on, so distance is set large on every
  result card. No timeline or rail graphics.

## 2. Colour

Tokens live in `app/globals.css` (`:root`, mapped to Tailwind in `@theme inline`).

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#ffffff` | Page |
| `--surface` / `--muted` | `#f7f9fc` / `#f3f5f9` | Quiet bands, tag fills, skeletons |
| `--card` | `#ffffff` | Cards, fields, sheets |
| `--foreground` | `#16181d` | Text and headings (17:1) |
| `--muted-foreground` | `#5d626c` | Secondary text (6:1) |
| `--border` | `#e7eaf0` | Hairlines and card edges, always light |
| `--input` | `#dde1e9` | Field edges where a shadow is not enough |
| `--primary` / `--board` | `#042161` | Logo navy: header bands, signboard, footer, primary buttons |
| `--board-deep` | `#021440` | Deeper navy for panels on the board |
| `--board-muted` | `#b9c3dc` | Secondary text on navy (8:1) |
| `--board-rule` | white 16% | Rules on navy |
| `--cta` | `#fd8003` | Orange fill, always with navy text (5.9:1) |
| `--cta-strong` | `#ae5600` | Orange text and icons on white (5.1:1) |
| `--success-ink` / `--danger-ink` | `#127a43` / `#b42318` | Open now / Closed text |
| `--whatsapp` | `#25d366` | WhatsApp icon only; the label uses `--whatsapp-ink` |

`.dark-band` (a navy header) flips the text tokens to white and `--board-muted`. White controls inside
it (`[role=search]`, `.on-light`) keep the light tokens.

## 3. Typography

Hanken Grotesk for text and UI (`--font-sans`) and Schibsted Grotesk for headings
(`--font-display`), both through `next/font`. Swap the two in `app/layout.tsx` to change the type
everywhere.

| Role | Size (mobile → desktop) | Weight |
| --- | --- | --- |
| Home H1 (centred) | 2.25 → 3.5rem, leading 1.06, -0.03em | 800 |
| Page H1 (search, category) | 1.5 → 2rem (2.75rem large) | 700 |
| Profile name (signboard) | 2 → 3.5rem, -0.035em | 800 |
| Section H2 | 1.75 → 2.5rem home, 1.375 → 1.5rem profile | 700 |
| Card title | 1.0625–1.25rem | 600–700 |
| Body | 15–16px, leading 1.6 | 400 |
| Small / meta | 13–14px | 500 |

## 4. Space, shape and depth

- **Containers:** `container-page` (80rem) and `container-wide` (96rem), with side padding of 20px
  on phones, 32px from 640px, 48px from 1024px and 64px from 1536px.
- **Section rhythm:** `section-y`, 56px / 80px.
- **Radius:** 6px controls, 8–12px cards and sheets, full pills for chips.
- **Shadows:** `--shadow-card` (1–3px, 4–5% opacity) at rest; `--shadow-soft` for fields on navy;
  `--shadow-lift` (12px offset, 28px blur, 16%) on hover and for floating things (popovers, the
  contact ticket).

## 5. Buttons

`components/ui/button.tsx`.

| Variant | Look | Use |
| --- | --- | --- |
| `cta` | Orange fill, navy text, bold | Search, Call: the one action |
| `default` | Navy fill, white text | Sign up, apply |
| `whatsapp` | White, green edge, green label | WhatsApp, always beside Call |
| `outline` | White, light edge, soft shadow | Directions, View all professionals, filters |
| `ghost` / `link` | No fill until hover / navy text | Toolbars, inline links |

Hover lifts 1px; focus-visible shows a 3px ring; disabled is 50% opacity.

## 6. Search and forms

- **Home search:** a white panel with a light edge and a soft shadow: service field ("What do you
  need?"), location field, orange Search. Stacks on phones.
- **Search header:** navy band with the title, white fields with soft shadows, and white-tint popular
  chips.
- **Location picker:** area search, "Use my current location" first, then areas with counts. If
  location permission is refused, a message explains and the area list stays one tap away.
- **Filter chips:** 36px, white with a light edge and soft shadow; chosen ones fill.

## 7. Navigation

- **Header:** white bar with a hairline. Logo, compact search on inner pages, Services, Guides, How it
  works, Help, "List your business", account. Guides and Help step aside between 1280px and 1400px
  when the header search is shown.
- **Footer:** navy, with popular services, company links, contact and the data credit line.
- **Breadcrumbs:** above the H1 on navy headers, on the signboard on profiles.

## 8. Home

1. **Hero, centred:** H1 "Something to fix? Find a local pro near you in {city}.", subtitle, the
   search panel, popular-search pills and three facts, over a faint navy-tint glow. No photo.
2. **What's the problem?:** a minimal two-column list. A round tinted icon, the problem in plain words
   ("AC not cooling"), the service under it, and an arrow, with light hairlines only. It ends with a
   "View all professionals" outline button.
3. Then the existing sections: popular pros, all services, app, how it works, reviews, popular
   searches, listing promo.

## 9. Provider components

- **Avatar:** the business logo; otherwise initials with the trade glyph. Never a stock face.
- **Result card (`ProviderCard`):** white, rounded 12px, soft shadow, lifts on hover. Avatar, name and
  verified tick, account type, trade and area, matched service tag, address, status line; on the right
  the distance in large type, then Call and WhatsApp.
- **Signboard (`ProfileHeader`):** navy band with the breadcrumb row, an orange strip naming the trade
  and area, the logo or initials, the name set large, account type and verification, then address,
  status line, distance from the visitor and rating (only when real). Extra chips and a facts row
  appear only when they add something.
- **Contact ticket (`ContactCard`):** white, rounded 12px, light edge, soft deep shadow; "Get in
  touch", Call, WhatsApp, Directions, a dashed tear line, then address, email, website, save and
  verification checks. Sticky on desktop, pulled up to overlap the signboard. Phones use the fixed
  bottom bar.
- **Services (`ServicesList`):** ruled rows with light hairlines, price only when set; listings for a
  whole category list what they cover as pills.
- **Nearby pros (`SimilarProviders`):** a grid of compact cards with distance, Call and WhatsApp,
  under the eyebrow "If they don't pick up".
- **Status line:** `● Open now · 10 AM – 8 PM` / `● Closed`. No hours listed: nothing.

## 10. Category and service pages

- Navy header with breadcrumb, H1, description, location switcher, count and service pills.
- Results and map, as on search.
- **Guide (`CategoryGuide`)**, counted from KaajVa's own listings and dated "Last updated":
  - how many are listed (individuals and businesses)
  - where to find them (top areas with counts, linking to area pages)
  - services people look for (with counts)
  - what it costs (only when prices are listed)
  Nothing is estimated.
- **About and FAQs:** written copy, plus questions answered from the same counts (how many, which
  areas, individuals or businesses, cost, booking fee). All of them go into the FAQ structured data.
- Related services, area links and guides.

## 11. Icons and imagery

Lucide at 16/20/24px, 1.75–2px stroke, in round tinted tiles (`icon-tile`). No emoji. Search,
category and profile pages show only a business's own photos.

## 12. Responsive behaviour

- Phones: one column, stacked search fields, filters on a scroller and in a sheet, a fixed
  Call/WhatsApp bar on profiles, a floating Map button on results.
- Tablet: two-column lists; cards lay out by their own width (container queries).
- Desktop: results beside a sticky map; profiles with the overlapping sticky ticket.
- No horizontal scroll at any width from 320px (checked at 360, 390, 820, 1280 and 1440).

## 13. States

- **Loading:** skeletons in `--muted` that match each page (navy header for search, signboard for
  profiles).
- **Empty search:** says why, plus nearby alternatives when the service is known.
- **Error:** a plain message and a way back.
- **Location refused:** a message and the area list.
- **Unavailable business:** "Currently unavailable" in place of hours; it stays listed.

## 14. Accessibility

Text ≥ 4.5:1 (pairs above). Tap targets ≥ 44px. Icon-only buttons carry `aria-label`. Visible focus
rings. `prefers-reduced-motion` turns off entrance motion.
