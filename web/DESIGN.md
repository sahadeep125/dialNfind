# Kaajva design system (website)

The website has one job: someone in Siliguri has a broken mixer, a leaking tap or a wedding next week, and
needs to reach a local professional **now**. Every screen is judged by how fast it gets them from "I need
someone" to "I'm on the phone with them", and how much they trust the person they are calling.

The tokens live in `app/globals.css` (`:root` and `@theme inline`), the components in `components/ui`. Use
the tokens; never hard-code a hex value or an `oklch()` in a component.

## 1. Brand and use scene

- **Who:** households and small shops in Siliguri, mostly on Android phones, often outdoors or in a
  bright kitchen, often in a hurry (something just broke). Many read English as a second language.
- **Mode:** the home page persuades (explain, then search). Search results and profiles are *operate*
  surfaces: scanability, big tap targets and facts beat decoration.
- **Personality:** a well-kept neighbourhood ledger. Plain words, real numbers, real addresses. Confident,
  never salesy. We never invent trust signals (no fake reviews, no stock photos passed off as a business).
- **Theme:** light only. The use scene is daylight on a phone screen.
- **Logo:** the navy house with the orange tool, from `public/brand`. Clear space = the height of the "K".

## 2. Colour

Two brand colours come straight from the logo. Navy carries structure and trust; orange is reserved for
the one action that matters on a screen (Search, Call Now). If more than one orange thing competes on a
screen, one of them is wrong.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--primary` Kaajva Navy | `#042161` | Headings on dark bands, primary buttons, links, active states | white on it 15:1 |
| `--primary-hover` | `#001755` | Hover / pressed for navy | |
| `--secondary` / `--accent` Navy wash | `oklch(0.955 0.015 262.5)` | Selected chips, today's row in hours, hover fills | navy text 13:1 |
| `--cta` Signal Orange | `#fd8003` | Call Now, Search. Fill only, never body text | navy text on it 5.9:1 |
| `--cta-hover` | `#e77400` | Hover for orange | |
| `--cta-strong` Orange ink | `#ae5600` | Orange *text* on light surfaces (small labels, icons) | 5.1:1 on white |
| `--cta-soft` | `oklch(0.97 0.03 62)` | Highlight behind a matched service tag | |
| `--background` Paper | `#faf9f6` | Page background (warm, so photos and orange sit calmly) | |
| `--card` Surface | `#ffffff` | Cards, sheets, inputs | |
| `--muted` Sunken | `#f1efe9` | Tag fills, skeletons, quiet panels | |
| `--foreground` Ink | `#16181d` | Body and headings | 16.9:1 on paper |
| `--muted-foreground` Ink 2 | `#5d626c` | Secondary text, placeholders, captions | 5.8:1 on paper |
| `--border` | `#e4e1d8` | Card and divider lines | |
| `--input` | `#d6d2c7` | Form field borders (one step darker than cards) | |
| `--success` / `--success-ink` / `--success-soft` | `oklch(0.56 0.13 155)` / `#127a43` / `oklch(0.965 0.03 155)` | Open now, Verified. Ink for text (5.4:1) | |
| `--warning` / `--warning-ink` / `--warning-soft` | `oklch(0.78 0.16 72)` / `#8a5a00` / `oklch(0.97 0.04 85)` | Closing soon, badges, star fill. Ink for text (5.9:1) | |
| `--destructive` / `--danger-ink` / `--danger-soft` | `oklch(0.55 0.21 27)` / `#b42318` / `#fdecea` | Closed, errors, delete. Ink for text (6.6:1) | |
| `--whatsapp` / `--whatsapp-ink` / `--whatsapp-soft` | `#25d366` / `#127a43` / `oklch(0.97 0.03 150)` | WhatsApp button only: brand-green icon, dark green label | |
| `--star` | `oklch(0.78 0.16 72)` | Rating stars | |

Rules:

- Orange fills carry **navy** text, never white (white on orange is 2.5:1).
- Status is never colour alone: "Open now" has a dot *and* words; "Verified" has an icon *and* words.
- Secondary text on a coloured surface is a tint of that surface's hue, not grey.

## 3. Typography

| Role | Font | Weight |
| --- | --- | --- |
| Display and headings | Schibsted Grotesk (`--font-display`) | 700, 800 for the home H1 |
| Body, UI, numbers | Hanken Grotesk (`--font-sans`) | 400, 500, 600, 700 |

Both are loaded with `next/font` and `display: swap` in `app/layout.tsx`.

Scale (rem / px). Line heights tighten as size grows.

| Step | Size | Line height | Tracking | Used for |
| --- | --- | --- | --- | --- |
| Display | 2.5 → 4rem (40 → 64px) responsive | 1.04 | -0.03em | Home H1 only |
| H1 | 1.75 → 2.5rem (28 → 40px) | 1.1 | -0.025em | Page titles, provider name |
| H2 | 1.25 → 1.5rem (20 → 24px) | 1.25 | -0.015em | Section titles |
| H3 | 1.0625rem (17px) | 1.35 | -0.01em | Card titles |
| Body L | 1.125rem (18px) | 1.6 | 0 | Lead paragraphs |
| Body | 1rem / 0.9375rem (16 / 15px) | 1.6 | 0 | Default text, 65–75ch measure |
| Small | 0.875rem (14px) | 1.45 | 0 | Meta lines, addresses |
| Caption | 0.75–0.8125rem (12–13px) | 1.4 | 0 | Labels, tags |

- Numbers that change (distances, counts, prices, hours) use `tabular-nums`.
- One H1 per page; it names the service and the place (see `docs/seo/seo-strategy.md`).
- More space above a heading than below it.
- No uppercase eyebrows over headings, no gradient text.

## 4. Spacing, radius, depth

- **Spacing** on a 4px grid. Inside a card: 16px (phone) / 20px (desktop). Between related lines: 4–8px.
  Between sections: `section-y` (56px phone, 80px desktop). Page gutter: 16 / 24 / 32px (`container-page`,
  `container-wide`).
- **Radius:** `--radius` 6px for buttons, inputs and tags; 8px (`rounded-lg`) for cards; `rounded-full` for
  status dots, avatars of people and pill filters.
- **Shadows** always have offset and soft blur:
  `--shadow-card` (resting card, barely there), `--shadow-lift` (hover, sticky contact card, popovers).
  No coloured glows, no hard offset shadows.
- **Borders** do most of the separation work; shadows only show something is lifted.

## 5. Buttons

All buttons are `components/ui/button.tsx` (`Button`), 40px tall by default, 48px (`lg`) for the main
action on a page, never under 40px on touch screens. Icons are Lucide, 16–20px, one stroke weight.

| Variant | Look | When |
| --- | --- | --- |
| `cta` | Orange fill, navy text | The single most important action: Search, Call Now |
| `default` (primary) | Navy fill, white text | Strong secondary actions: Sign up, Apply filters |
| `whatsapp` | White, green border, dark green label, green icon | WhatsApp, always next to Call |
| `outline` | White, `--input` border, ink text | Directions, Share, Save, secondary choices |
| `secondary` | Navy wash fill, navy text | Toggles that are on (selected filter) |
| `ghost` | No fill until hover | Toolbar icons, menu items |
| `link` (text) | Navy text, underline on hover | Inline "View all", "Show more" |
| `destructive` | Red fill, white text | Delete, only behind a confirm |

States, for every variant:

- **Hover:** one step darker fill (or border), and a 1px lift.
- **Active / pressed:** drops 1px back down.
- **Focus-visible:** 3px ring in `--ring` (navy at 40%), orange at 40% on `cta`. Never removed.
- **Disabled:** 50% opacity, no pointer events. Do not disable Call; hide it when the business does not
  take calls.
- **Loading:** keep the label, add a spinner icon in place of the leading icon, and `aria-busy`.

## 6. Form elements

- **Inputs** (`components/ui/input.tsx`): 40px (44–48px in search bars), white fill, `--input` border,
  6px radius, 16px text on phones so iOS does not zoom. Placeholder in `--muted-foreground` (5.8:1).
  Focus: border goes navy and a 3px `--ring`. Error: red border, the message below in `--danger-ink`
  naming the problem and the fix.
- **Search field:** a single white bar with a search icon, the service input, a divider, the location
  picker (pin icon, current area, chevron) and an orange Search button. On phones the parts stack, full
  width, Search last. A "Use my location" action lives in the location picker.
- **Dropdowns / selects:** same height and border as inputs, chevron on the right, the list in a
  popover with `--shadow-lift`.
- **Filter chips:** pill buttons, 36px tall. Off: white with border. On: navy wash with navy text and a
  check. A "Filters" button opens the full sheet on phones.
- **Checkboxes, switches, sliders:** Radix primitives in `components/ui`, navy when on.

## 7. Components

- **Provider avatar:** the business logo; otherwise its initials on a navy-wash tile with the category
  icon tucked into the corner. Never a stock photo standing in for a person.
- **Provider result card:** avatar, name (H3) with the verified tick, profession or service line, the
  area and distance, open status and today's hours, the matched service tag, then Call (orange) and
  WhatsApp side by side. Price only when the business set one. The whole card links to the profile.
- **Compact provider card** (similar pros, nearby on home): avatar, name, service, distance and open
  status in one block, plus a small Call button.
- **Status line:** `● Open now · 9 AM – 8 PM`, `● Closed · Opens 10 AM`. When a listing has no hours we
  say nothing, rather than "Hours not listed".
- **Badges:** small 6px-radius labels. Success (Verified), warning (Top rated, 24x7), muted (Business /
  Individual). At most two on a card.
- **Tags:** sunken fill, 13px, for services. A matched service gets `--cta-soft` with orange ink.
- **Cards:** white, 1px border, 8px radius, `--shadow-card`; on hover `--shadow-lift` and a 2px lift
  when the card is a link. Never nest cards inside cards.
- **Sticky call bar (phones):** fixed to the bottom of a profile, white with a top border, Call and
  WhatsApp at 48px, safe-area padding.
- **Empty states:** only where the visitor did something (a search, a filter) and got nothing. They say
  why and offer the next step (wider radius, a related service). Profiles never show empty sections.

## 8. Icons and imagery

- Lucide icons only (`lucide-react`), 1.75–2px stroke, sized 16/20/24. No emoji as icons.
- Category photos are real, uncropped work scenes from `lib/stock-images.ts`, used only for categories
  and marketing, never as a business's own photo.
- A business shows only its own logo, cover and work photos.

## 9. Motion

- One entrance on the home hero; everything else is instant.
- Hover lifts 1–2px over 150–200ms with an ease-out curve.
- `prefers-reduced-motion` turns animations off (already global in `globals.css`).

## 10. Accessibility floor

- Body and placeholder text at least 4.5:1, large text 3:1 (the table above lists the pairs).
- Tap targets at least 40×40px, 48px for Call.
- Every icon-only button has an `aria-label`. Focus rings are always visible.
- Pages work with the keyboard: skip link, logical order, dialogs trap focus.
