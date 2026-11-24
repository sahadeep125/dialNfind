# KaajVa design system: "Para Board"

*Para* is what Siliguri calls a neighbourhood. People here give directions by landmarks and
localities ("basement of Planet Mall, Sevoke Road"), and they find a repairman by walking past his
painted signboard. The website should feel like the best-kept signboard on the street: big plain
words, a clear address, how far it is, and a phone number. Nothing decorative stands between
"my mixer stopped" and "I'm on the phone with someone".

Tokens live in `app/globals.css`, shared components in `components/ui`, `components/site` and
`components/provider`. Never hard-code a colour or a font in a component.

## 1. Who and where

- **People:** households and small shops in Siliguri. Mostly Android phones, often outdoors or in a
  bright kitchen, often in a hurry because something just broke. Many read English as a second language.
- **Questions they bring:** Who fixes this? Who is closest? How far? Are they open? Where exactly? How do
  I reach them? Who else, if they don't pick up?
- **Data reality:** most listings have no photo, no hours and no reviews yet. The design must look
  finished with only a name, a service, a locality, coordinates and a phone number. It never fills the
  gap with stock photos or invented trust signals.
- **Modes:** the home page persuades (explain, then search); search and profiles are *operate*
  surfaces where facts and tap targets come first.
- **Theme:** light paper surfaces for daylight use; navy blocks for the moments that carry identity
  (the home masthead, the profile signboard, the footer).

## 2. Signature ideas

1. **The distance rail.** Search results and "nearby" lists hang off a vertical rail, nearest first.
   Each stop on the rail shows the distance in large display type. Distance is the first thing people
   compare, so it gets the strongest typographic position on the page.
2. **The signboard.** A profile opens on a navy board: an orange strip with the trade and para (like
   the strip over a shop front), the logo or initials, the name set large, then address, hours and
   distance. On desktop the contact ticket overlaps the right edge of the board; on phones the
   secondary actions (Directions, Website, Email) sit on the board and Call/WhatsApp live in the bottom
   bar.
3. **The problem index.** Services are offered the way people describe them ("Mixer grinder stopped"),
   as a ruled index, not a wall of identical cards.
4. **One moving word.** The home masthead cycles the broken thing (mixer, AC, tap, fan, bike). That is the
   only authored motion; everything else is instant.

## 3. Colour

| Token | Value | Role |
| --- | --- | --- |
| `--primary` Board navy | `#042161` | Logo navy. Masthead, signboard, footer, primary buttons, links |
| `--primary-hover` | `#001755` | Hover / pressed navy |
| `--ink` / `--foreground` | `#0c1430` | Body text and headings on paper (15.9:1) |
| `--muted-foreground` Ink 2 | `#555c6b` | Secondary text, placeholders (5.9:1 on paper) |
| `--background` Paper | `#f4f0e7` | Page ground: warm newsprint, calmer than white in sunlight |
| `--card` Sheet | `#fffdf8` | Cards, inputs, sheets on paper |
| `--muted` Sunken | `#ebe5d8` | Tag fills, skeletons, quiet panels |
| `--border` Rule | `#dcd4c3` | Hairlines between rows and around sheets |
| `--input` | `#c9c0ad` | Field borders, one step stronger than rules |
| `--cta` Signal orange | `#fd8003` | Call, Search, the name plate. Fill only; carries navy text (5.9:1) |
| `--cta-hover` | `#e87400` | Hover for orange |
| `--cta-strong` Orange ink | `#a85200` | Orange text and icons on paper (4.8:1, 5.3:1 on sheets) |
| `--cta-soft` | `#ffeedb` | Matched-service highlight |
| `--secondary` / `--accent` Navy wash | `#e4e9f4` | Selected filters, today's hours row, hovers |
| `--board-foreground` | `#ffffff` / `--board-muted` `#b9c3dc` | Text on navy (15:1 / 8.5:1) |
| `--success` Leaf | `#18995a` dot, `--success-ink` `#0f7a42` text, `--success-soft` `#e2f2e8` | Open now, verified |
| `--warning` Marigold | `#f2a20c`, `--warning-ink` `#875400`, `--warning-soft` `#fdf0d2` | Stars, 24x7, badges |
| `--destructive` Brick | `#c4321f`, `--danger-ink` `#b42318`, `--danger-soft` `#fbe7e3` | Closed, errors |
| `--whatsapp` | `#25d366` icon, `--whatsapp-ink` `#0f7a42` label | WhatsApp button only |

Rules: orange fills always carry navy text. Only one orange action competes on a screen. Status is
never colour alone (dot + words). On navy, secondary text is `--board-muted`, a navy tint, never grey.

## 4. Typography

| Role | Family | Weights |
| --- | --- | --- |
| Display: headings, names, distances | **Bricolage Grotesque** (`--font-display`) | 600, 700, 800 |
| Text and UI | **Instrument Sans** (`--font-sans`) | 400, 500, 600, 700 |

Bricolage has the slightly irregular, hand-cut warmth of a painted sign while staying very legible;
Instrument Sans is calm and compact for addresses, hours and buttons. Both load through `next/font`
with `display: swap`.

| Step | Size (phone → desktop) | Line height | Tracking | Use |
| --- | --- | --- | --- | --- |
| Masthead | 2.6 → 5.25rem | 0.98 | -0.035em | Home H1 only |
| Board name | 2.1 → 3.75rem | 1.0 | -0.03em | Provider name on the signboard |
| H1 | 1.9 → 3rem | 1.05 | -0.03em | Search and service page titles |
| H2 | 1.5 → 2.125rem | 1.1 | -0.02em | Section titles |
| H3 | 1.125rem | 1.25 | -0.01em | Card and row titles |
| Distance | 1.5 → 1.75rem, display 700, tabular | 1 | -0.02em | Rail stops |
| Body | 1rem (15px in dense lists) | 1.55 | 0 | Text, 65–75ch measure |
| Small | 0.875rem | 1.45 | 0 | Addresses, meta |
| Label | 0.75–0.8125rem, 600 | 1.3 | 0.01em | Field labels, tags |

No uppercase eyebrows above headings, no gradient text. One H1 per page. Numbers that change use
`tabular-nums`.

## 5. Shape, space and depth

- **Grid:** 4px base. Page gutter 16 / 24 / 40px. Content frame 88rem (`container-wide`), reading frame
  80rem (`container-page`).
- **Radius:** `--radius` 4px for buttons, inputs and tags: signboard corners, not bubbles. Sheets 6px.
  Full pills only for status and filter chips.
- **Lines over shadows:** rows are separated by 1px rules; key frames (the search box, the contact
  ticket) take a 1.5px ink border. `--shadow-lift` (offset 0 10px, blur 30px, navy at 14%) is for things
  that float: popovers, the sticky ticket, hovered rows.
- **Rhythm:** sections use `section-y` (64px phone / 104px desktop). More space above a heading than
  below. Dense lists (rail, index) breathe with 16–20px row padding.

## 6. Buttons

`components/ui/button.tsx`. 44px default, 52px (`lg`) for the main action, 36px (`sm`) in compact rows.

| Variant | Look | Use |
| --- | --- | --- |
| `cta` | Orange fill, navy text, bold | Call, Search: the one action |
| `default` | Navy fill, white text | Apply, Sign up, secondary strong actions |
| `whatsapp` | Sheet fill, green rule, green label, brand-green icon | WhatsApp, always beside Call |
| `outline` | Sheet fill, input rule, ink text | Directions, Share, Save, Filters |
| `board` | Transparent, white 1.5px rule, white text | Secondary actions on navy |
| `ghost` | No fill until hover (navy wash) | Toolbars, menus |
| `link` | Navy text, underline on hover | Inline "View all" |
| `destructive` | Brick fill, white text | Delete, behind a confirm |

States: hover darkens one step and lifts 1px; active drops back; focus-visible draws a 3px ring
(navy 40%, orange 45% on `cta`); disabled is 50% opacity without pointer events; loading keeps the
label and swaps the icon for a spinner with `aria-busy`.

## 7. Forms and search

- **Search box:** one sheet with a 1.5px ink frame. Service field (label "What needs fixing?"), a rule,
  location field (pin, area name, chevron), and an orange Search block flush to the right edge. On
  phones the three stack inside the same frame. Suggestions open in a popover sheet beneath.
- **Location picker:** popover with an area search, "Use my current location" first, then areas with
  pro counts. If permission is refused the picker says so and keeps the list open, so choosing an area
  is always one tap away.
- **Inputs:** 44px, sheet fill, `--input` rule, 4px radius, 16px text on phones (no iOS zoom). Focus:
  navy rule + ring. Errors: brick rule, message below naming the problem and the fix.
- **Filter chips:** 36px pills on a horizontal scroller. Off: sheet + rule. On: navy wash + navy text.

## 8. Navigation

- **Header:** paper bar with a hairline; logo, the compact search on inner pages, Services, Guides,
  Help, "List your business", account. Phones: logo, search icon route, menu sheet.
- **Footer:** navy board with the trades index, company links and contact, plus the data credit line.
- **Breadcrumbs:** small text on the board (profile) or above the H1 (service pages).

## 9. Provider components

- **Name plate (`ProviderAvatar`):** the business logo; otherwise initials in display type on a tinted
  plate with the trade glyph in the corner. Never a stock face.
- **Rail stop (`ProviderCard`):** distance on the rail; name + verified tick; trade · para; address
  line; open status with today's hours; rating only when real; matched service tag; Call + WhatsApp;
  the whole row opens the profile.
- **Nearby list (`SimilarProviders`):** compact rail stops with Call, titled "If they don't pick up".
- **Signboard (`ProfileHeader`):** navy board carrying the breadcrumb row, the orange trade strip, the
  logo or initials, the name, account type and verification, a dashed rule, then address, status line,
  distance from the visitor and rating (only when real). Extra service chips and a facts ledger
  (experience, jobs, travel radius, 24x7) appear only when they add something. The content keeps clear
  of the right 24rem on desktop for the ticket.
- **Contact ticket (`ContactCard`):** 1.5px ink border, a deep navy shadow, "Get in touch" eyebrow,
  Call, WhatsApp, Directions, then a dashed tear line before address, email/website/save and verified
  checks. Sticky on desktop, pulled up 14rem to overlap the signboard. Phones use the fixed bottom bar.
- **Section eyebrows:** an orange uppercase line over a section title says why it is there, e.g. "If
  they don't pick up" over the nearby list. The H2 itself keeps its search wording.
- **Services menu (`ServicesList`):** ruled list like a shop's rate board: service, "main" marker,
  price only when set; whole-category listings list what they cover.
- **Status line:** `● Open now · 10 AM – 8 PM`, `● Closed · 10 AM – 8 PM`. No hours: nothing.
- **Reviews:** shown only when real reviews exist. No placeholder.

## 10. Service and category components

- **Problem index:** two-column ruled list of everyday problems linking to service pages, with an
  outline icon (Lucide, 1.75 stroke) and an arrow.
- **Trades directory:** every category as a heading with its pro count and its services as inline
  links, set in newspaper-like columns.
- **Para list:** neighbourhoods as large display words with counts, linking to area pages.

## 11. Icons and imagery

Lucide icons at 16/20/24px, 1.75–2px stroke. No emoji. A business shows only its own logo, cover and
work photos; categories and the home page use typography and real listing data instead of stock
photographs.

## 12. Responsive behaviour

- Phones first: single column, the search inside the masthead, the rail with a narrow distance column,
  a fixed Call/WhatsApp bar on profiles, filters on a scroller and in a sheet.
- Tablet (md): two-column indexes; the rail gets its full distance column.
- Desktop (lg+): search results beside a sticky map; profiles with a sticky contact ticket; the home
  masthead puts the live "near you" list beside the search.
- No horizontal page scroll at any width from 320px.

## 13. Interaction states

Hover: rows lift onto a sheet with `--shadow-lift`; links underline with offset 0.2em. Focus: visible
3px ring everywhere. Loading: skeleton rows in `--muted` with the rail already drawn. Empty search:
why, plus the nearest pros further out when the service is known. Location refused: message plus the
area list. Unavailable business: "Currently unavailable" in place of hours, still listed.

## 14. Accessibility floor

Body and placeholder text ≥ 4.5:1, large text ≥ 3:1 (pairs listed above). Tap targets ≥ 44px, Call
52px. Icon-only buttons carry `aria-label`. `prefers-reduced-motion` stops the masthead word and all
transitions.
