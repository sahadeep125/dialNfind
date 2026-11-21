# KaajVa SEO: keyword map and search setup

KaajVa (kaajva.in) is a local services directory for Siliguri and North Bengal. People search for a
service plus "near me" or plus the city, compare a few businesses, and call one. The site wins those
searches with one strong page per service (category and subcategory pages), helpful guides, and a
business profile page per provider. This file says which searches each page targets, so new copy stays
consistent.

## Business details (NAP)

Search engines compare the name, address and phone on the site with the Google Business Profile and other
directories. Use exactly these everywhere:

- **Name:** KaajVa
- **Address:** Ghogomali, Siliguri, West Bengal, India 734006
- **Phone:** +91 89066 09532 (structured data: `+918906609532`)
- **Email:** info@kaajva.in (general and business), support@kaajva.in (support)
- **Website:** https://kaajva.in

They live in `web/lib/config.ts` (`BUSINESS`) and feed the Organization/LocalBusiness JSON-LD on every page,
the footer and the contact page. The phone and support email shown on the site come from the admin console
(Settings > General) when set there.

## How the research was done

No paid keyword tool was used, so the volumes below are relative, not counts. They come from what competing
directories rank for in Siliguri and Kolkata (Justdial, Sulekha, Urban Company city and locality pages,
Mannubhai, ServiceSutra), Google autocomplete patterns for "<service> in Siliguri", and India-wide demand
reports (Justdial's seasonal surges in AC and cooling searches; growth in Hindi and Bengali searches for home
appliances). Check real numbers in Google Search Console after a month of data (Performance > Queries) and
in Google Keyword Planner (free with a Google Ads account) before writing new pages.

What it showed:

1. **Two query shapes dominate:** "<service> near me" (mobile, high intent) and "<service> in Siliguri"
   (also typed as "<service> siliguri"). Each category page targets both.
2. **Big national players have thin Siliguri pages.** Urban Company builds city + locality pages for metros
   (for example "AC service repair Kankurgachi, Kolkata") but not for Siliguri, which leaves room for a
   local directory with real listings.
3. **Demand is seasonal:** AC service peaks March to June, pest control and waterproofing around the monsoon,
   painting and cleaning before Durga Puja and Diwali, packers and movers around March to April.
4. **Brand search is clean:** "KaajVa" has no competing brand in results, so the site should own its name
   quickly once indexed.

## Keyword targets by page

**Rank first where the listings are.** In November 2026 the site had 257 beauty, 199 vehicle, 93 tutor and 89
electronics listings, but only 6 electricians, 2 plumbers and 1 cleaner. Pages with many real listings satisfy
the searcher and rank fastest, so those four categories lead the home page and get P1. Electricians, plumbers,
AC repair and cleaning stay targeted but are pushed harder once each has 15 or more listings.

Priority: **P1** high intent and high demand, **P2** steady demand, **P3** long tail.

| Page | Primary keywords | Secondary / long tail | Priority |
| --- | --- | --- | --- |
| Home `/` | KaajVa, local services in Siliguri, Siliguri business directory | services near me, home services Siliguri, North Bengal local services | P1 |
| `/services/home-appliances` | AC repair in Siliguri, AC service near me | AC gas refill Siliguri, fridge repair Siliguri, washing machine repair Siliguri, RO service Siliguri, geyser repair | P1 |
| `/services/electricians` | electrician in Siliguri, electrician near me | house wiring Siliguri, inverter installation Siliguri, 24 hour electrician | P1 |
| `/services/plumbing` | plumber in Siliguri, plumber near me | tap leakage repair, water tank cleaning Siliguri, bathroom fitting | P1 |
| `/services/electronics-repair` | mobile repair shop in Siliguri, TV repair in Siliguri | LED TV repair near me, laptop repair Siliguri, CCTV installation Siliguri | P1 (89 listings) |
| `/services/packers-movers` | packers and movers in Siliguri | packers and movers Siliguri to Kolkata, house shifting Siliguri, bike transport | P1 |
| `/services/tutors` | home tutor in Siliguri, home tuition Siliguri | maths tutor, class 10 tuition Siliguri | P1 (93 listings) |
| `/services/pest-control` | pest control in Siliguri | termite control Siliguri, cockroach control | P2 |
| `/services/cleaning` | home deep cleaning Siliguri | sofa cleaning Siliguri, bathroom cleaning, office cleaning | P2 |
| `/services/painting` | house painters in Siliguri | painting contractor Siliguri, wall painting cost per sq ft | P2 |
| `/services/carpentry` | carpenter in Siliguri | modular kitchen Siliguri, furniture repair | P2 |
| `/services/vehicle-repair` | bike service centre Siliguri, car service centre Siliguri | two wheeler service Siliguri, car garage near me | P1 (199 listings) |
| `/services/beauty-salon` | beauty parlour in Siliguri, salon near me | unisex salon Siliguri, bridal makeup artist Siliguri, salon at home | P1 (257 listings) |
| Guides `/guides/*` | AC service charges, TV repair cost India, packers and movers charges, house painting cost per sq ft | how to hire an electrician, house shifting checklist | P3 |
| Provider pages `/providers/*` | "<business name>", "<business name> Siliguri" | "<business name> phone number", "<business name> reviews" | P1 (brand searches of each business) |
| `/claim` | list my business in Siliguri, free business listing Siliguri | add business on Google alternative, Siliguri business directory | P2 |
| `/contact` | KaajVa contact, KaajVa phone number | KaajVa Siliguri address | P3 |

Nearby places to mention naturally in copy (not as keyword lists): Siliguri, Matigara, Bagdogra, Sevoke Road,
Pradhan Nagar, Hakimpara, Champasari, Salugara, Ghogomali, Jalpaiguri, Darjeeling, North Bengal.

## Rules for writing copy

- Titles under 50 characters before the " | KaajVa" suffix (a test enforces this for category and guide copy),
  service first, then "near me" or "in Siliguri".
- Descriptions about 150 to 160 characters, with the service, the city and a reason to click (verified,
  compare ratings, call directly, no booking fee).
- One H1 per page that names the service and the city.
- Write for people: prices as honest ranges, real questions in FAQs. Never stuff keywords or list areas.

## What the site already does (technical SEO)

- Canonical URL, Open Graph and Twitter tags on every public page (`web/lib/seo.ts`), on `https://kaajva.in`
  (`NEXT_PUBLIC_SITE_URL`, set from `WEB_URL` in `.env`).
- JSON-LD: Organization + LocalBusiness with NAP, WebSite with sitelinks search box, BreadcrumbList, ItemList,
  FAQPage, Article for guides, and a LocalBusiness subtype (Electrician, Plumber, MovingCompany...) with
  ratings and opening hours on each provider page.
- `sitemap.xml` (index) with static pages, every category and subcategory, guides and every live provider;
  `robots.txt` blocks the dashboard, API, and filtered search URLs.
- Private and one-off pages are `noindex`; social preview images are generated per page.
- Fonts with `display: swap`, Next image optimisation, cached public pages for fast responses.
- `/llms.txt` (a plain-text map of the site for AI assistants, rebuilt hourly from the live categories) and a
  `robots.txt` group that names the AI search crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot,
  Google-Extended, Applebot-Extended...) with the same rules as everyone else.
- The official Facebook, Instagram, YouTube and X profiles in the footer and as `sameAs` in the Organization JSON-LD
  (`OFFICIAL_SOCIAL_LINKS` in `web/lib/config.ts`).
- Google and Bing verification tags via `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION`.

## Off-site steps (done by the owner, not in code)

1. **Production `.env`:** set `WEB_URL=https://kaajva.in` (plus `PUBLIC_URL`, `PROVIDER_URL`, `ADMIN_URL`,
   `CORS_ORIGINS` on kaajva.in) and redeploy, or canonicals and the sitemap keep the old address. Redirect any
   old domain to kaajva.in with a 301.
2. **Admin console > Settings > General:** set the support email to support@kaajva.in and the phone to
   +918906609532 if older values are saved there.
3. **Google Search Console** (search.google.com/search-console): add a Domain property for `kaajva.in` (DNS TXT
   record) or a URL-prefix property with the HTML tag in `GOOGLE_SITE_VERIFICATION`. Submit
   `https://kaajva.in/sitemap.xml`, then use URL Inspection > Request indexing for the home page and the top
   category pages.
4. **Google Business Profile** (business.google.com): create "KaajVa" at the Ghogomali address (hide the
   address and set service areas Siliguri, Jalpaiguri, Darjeeling if visitors do not come to the office). Pick
   the closest primary category Google offers when you type "directory" or "business"; categories change, so
   choose from its list. Add the website kaajva.in, phone +91 89066 09532, hours, logo and photos. Google only
   lists businesses that meet customers in person or at their location, so describe the office's real
   customer-facing work. Verify it, ask early users for reviews, and put the profile link in `SOCIAL_LINKS`.
5. **Bing Webmaster Tools** (bing.com/webmasters): import the site from Search Console (fastest) or verify
   with `BING_SITE_VERIFICATION`, then submit the sitemap. Bing also feeds DuckDuckGo and ChatGPT search.
6. **Citations:** list KaajVa with the same NAP on Justdial, Sulekha, IndiaMART, Facebook, Instagram, LinkedIn
   and Apple Business Connect. Add each profile to `SOCIAL_LINKS`.
7. **Links and mentions:** local news (Siliguri Times, Uttarbanga Sambad), Siliguri community Facebook groups,
   trade associations, and the businesses listed on KaajVa (a "Find us on KaajVa" link from their own sites).
8. **Monthly:** check Search Console for queries with many impressions but a low position, and improve those
   pages' copy; watch Core Web Vitals and Page indexing reports.
