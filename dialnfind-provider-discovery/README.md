# dialnfind-provider-discovery

A command-line tool that finds local service providers (AC repair, electricians, plumbers and so on) for the dialnfind marketplace. It collects them only from **permitted public sources** and exports deduplicated, scored CSV and JSON files for manual review and a later import.

It is a discovery pipeline, not a general web scraper:

```
allowed public sources ─▶ candidates ─▶ crawl (robots.txt, rate-limited) ─▶ extract
   ─▶ validate ─▶ deduplicate / merge ─▶ classify ─▶ score ─▶ CSV + review CSV + JSON
   ─▶ admin review ─▶ unclaimed dialnfind profile ─▶ business claims & verifies it
```

Records are **discovered, unclaimed and unverified**: `claim_status=unclaimed`, `verification_status=none`, `source_type=discovered`. They must not be shown as businesses that have joined dialnfind.

---

## 1. Installation

You need **Python 3.12 or newer**.

```bash
git clone <your-repo-url> dialnfind-provider-discovery   # or copy the folder
cd dialnfind-provider-discovery
```

## 2. Virtual environment

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows (PowerShell):

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

Windows (cmd.exe): `.venv\Scripts\activate.bat`

## 3. Installing dependencies

```bash
pip install -r requirements.txt          # runtime
pip install -r requirements-dev.txt      # + pytest
pip install anthropic                    # optional, only for --use-ai-classification
# duckdb (in requirements.txt) reads the Overture / Foursquare open datasets
```

Run the tests with `python -m pytest`. They are fully offline.

## 4. Configuration

Settings are applied in this order, and each layer overrides the one before it: **built-in defaults → `config.yaml` → environment (`.env`) → CLI flags**.

```bash
cp .env.example .env          # Windows: copy .env.example .env
```

Set `CONTACT_EMAIL` in `.env` at minimum. The crawler identifies itself honestly as
`dialnfindProviderDiscovery/1.0 (+contact: you@yourdomain.com)`, so site owners can reach you.

Key `config.yaml` sections:

| Section | What it controls |
|---|---|
| `city` / `state` / `country` | Default target (Siliguri, West Bengal, India) |
| `crawler` | `request_delay` (2s), `max_pages_per_domain` (5), `timeout`, `max_retries`, `max_concurrent_domains` (3) |
| `scoring` | `minimum_relevance` (50, main CSV), `minimum_quality` (40, review flag), `reject_below_relevance` (20) |
| `sources` | Turn each source on or off (see below) |
| `overture` / `foursquare` | Open dataset release, confidence floor, cache lifetime |
| `dialnfind_categories` | Path to the server's `categories.json`, used to check the category mapping |
| `source_priority` | Which source wins when merged records disagree |
| `osm` | Overpass endpoints (tried in order), delay, search area `bbox` (`[south, west, north, east]`; empty = one cached Nominatim lookup of the city, e.g. Siliguri ≈ `[26.64, 88.38, 26.79, 88.49]`), cache lifetime |
| `search_api` | Licensed search API provider and limits (keys go in `.env`) |
| `geocoding` | Optional, off by default |
| `dedup` | Fuzzy-matching thresholds and shared-hosting domains |
| `blocked_domains` | Domains that are **never** fetched by any source |
| `directories` | Directories you have confirmed permit automated access (empty by default) |
| `locations` | Per-city aliases and known localities, used only to recognise text that is actually on a page |
| `category_rules` | Keywords, search queries, OSM tags and service tags per category |

### Sources

| Name (`--sources`) | config key | What it does |
|---|---|---|
| `overture` | `overture` | Overture Maps places: one DuckDB query per run downloads every place in the search box from the public S3 bucket (no key), cached as `output/overture_*.parquet`. CDLA-Permissive-2.0 / Apache-2.0. The largest source by far |
| `fsq` | `foursquare` | Foursquare OS Places (Apache-2.0). Needs `FSQ_TOKEN` and `FSQ_RELEASE_DATE` in `.env`; skipped without them. Off by default |
| `osm` | `osm` | One small bounding-box Overpass query per run for all categories (ODbL data, attribution kept) |
| `website` | `websites` | Crawls candidate business websites: homepage plus up to 4 contact/about/service pages |
| `manual` | `manual_urls` | Your own list of business websites (`--input-urls`) |
| `search_api` | `licensed_search_api` | Brave Search API or Google Programmable Search **JSON API**, using your own key |
| `directory` | `directories` | Only directories listed in config with `permission_confirmed: true` |

Search engine result pages, Google Maps, Justdial, IndiaMART, Facebook, Instagram, LinkedIn and similar sites are on the blocklist. The block is enforced inside the HTTP client, so no source can get around it, including after redirects.

To add a new source, subclass `dialnfind.sources.base.DiscoverySource`, implement `discover(query, location, category) -> list[Candidate]`, register the class in `dialnfind/sources/__init__.py`, and add a toggle under `sources:`.

## 5. Categories: one rule per dialnfind subcategory

`categories.txt` lists the rule names, one per line; lines starting with `#` are ignored. Each rule in `config.yaml` → `category_rules` maps onto the dialnfind database through `dialnfind:`. There is one rule per subcategory, plus one category-level rule per category for businesses whose evidence doesn't name a specific service (they are listed under the category without a subcategory):

```yaml
category_rules:
  Pest Control:                                   # category-level rule
    dialnfind: {category: pest-control}
    keywords: [pest control, fumigation]
    queries: [pest control]                       # search API queries (the city is appended)
    osm_tags: [craft=pest_control]                # OSM tags that mean "offers this" (strong)
    overture: [pest_control_service]              # Overture taxonomy ids (strong)
    fsq: [pest control service]                   # Foursquare category names (strong)
  Termite Treatment:                              # subcategory rule
    dialnfind: {category: pest-control, subcategory: termite-treatment}
    keywords: [termite control, anti termite]
    overture_weak: [pest_control_service]         # weak: needs the name to agree (osm_name_regex / keywords)
    osm_name_regex: "termite"
```

The slugs must exist in `../server/prisma/data/categories.json` (the server's default categories). The CLI checks every mapping at startup and refuses to run if one is unknown, so the tool and the server can't drift apart. A strong tag belongs to exactly one rule (a warning names any duplicates). Tags that several services share, such as `craft=electronics_repair`, are strong on the category-level rule and weak on the specific ones, so "Palash Mobile Repairing" becomes Mobile Phone Repair and "Crystal Electronics" stays at Electronics Repair.

When you add a category or subcategory in the admin console that should get listings from discovery, add it to `categories.json` and give it a rule here.

## 6. Running discovery

Run all commands from inside the `dialnfind-provider-discovery` folder with the virtual environment active.

```bash
python main.py --help

# Siliguri, all enabled sources, plus the bundle the dialnfind server imports on deploy
python main.py --city Siliguri --state "West Bengal" --country India \
  --export-dialnfind ../server/prisma/data/providers-siliguri.json

# Open datasets only (no website crawling, no API key): minutes instead of hours
python main.py --sources osm,overture --export-dialnfind ../server/prisma/data/providers-siliguri.json

# Preview sources and queries without touching the network
python main.py --dry-run

# Crawl only websites you already know (uses sources manual + website)
cp urls.example.txt urls.txt      # then add URLs (Windows: copy urls.example.txt urls.txt)
python main.py --input-urls urls.txt

# Only OSM and websites found through it, with a stricter main-CSV threshold
python main.py --sources osm,website --min-score 60

# Continue an interrupted run
python main.py --resume

# Print records that need manual review
python main.py --review output/siliguri_providers.csv
```

On Windows, put the whole command on one line or use `^` (cmd) or `` ` `` (PowerShell) instead of `\`.

All flags: `--city --state --country --categories --input-urls --output --min-score --max-results --sources --concurrency --delay --max-pages --resume --use-ai-classification --dry-run --review --review-limit --config --state-db --log-level --log-file --log-format {text,json}`.

`urls.txt` format (see `urls.example.txt`):

```
https://www.some-ac-service.in
https://www.some-electrician.in, Electrician
```

### Optional: licensed search API

```bash
# .env
SEARCH_API_PROVIDER=brave
BRAVE_SEARCH_API_KEY=...
```

Then run with `--sources search_api,osm,website`. Queries are built from each category's `queries`, for example "AC repair Siliguri", "AC service Siliguri" and "air conditioner repair Siliguri". Results on blocked domains are dropped.

### Optional: AI classification

`--use-ai-classification` sends only extracted text snippets to Claude (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, default `claude-haiku-4-5`). The model can only choose from your configured categories and service tags, and it never adds contact data. The basic tool does not need it.

## 7. Output files

Each run writes three files next to `--output`, for example `output/siliguri_providers.csv`:

| File | Contents |
|---|---|
| `siliguri_providers.csv` | One provider per row, relevance ≥ min score. UTF-8. |
| `siliguri_providers_review.csv` | Rows needing manual review, plus a `review_reasons` column |
| `siliguri_providers.json` | Richer data: arrays, `additional_phones`, `hours_structured`, `field_sources` (where each value came from), `score_breakdown`, run stats, OSM attribution, and `below_threshold` records |
| `discovery.db` | SQLite crawl state and caches (see Resume) |

CSV columns: `provider_id, provider_name, normalized_name, primary_category, secondary_categories, phone, whatsapp, email, website, address, locality, city, state, pincode, country, latitude, longitude, description, opening_hours, source_url, source_domain, source_type, source_confidence, discovery_query, is_claimed, claim_status, verification_status, data_quality_score, relevance_score, scraped_at, duplicate_candidate, duplicate_group_id, source_urls, source_domains, source_types, additional_phones`.

List cells use `; ` (categories, phones) or ` | ` (source lists).

**No fabricated data.** A value that is not present in a source stays blank (`""`, never "Unknown"). Specifically:

- Phones are normalised to E.164 (`+919876543210`). Invalid numbers and template placeholders (such as `9876543210` and `9999999999`) are dropped.
- `whatsapp` is filled only from an explicit `wa.me` / WhatsApp link or label. A phone number is never assumed to be a WhatsApp number.
- Coordinates come only from JSON-LD, geo meta tags, OSM or an opt-in geocoder. Google Maps embeds are ignored.
- `city`, `state` and `country` may be *derived*, for example `state=West Bengal` when the page confirms the city is Siliguri. Every such derivation is recorded in `field_sources` in the JSON.
- `description` is the business's own short meta or JSON-LD description, cut to 300 characters. Set `extraction.include_description: false` to turn it off. Reviews, ratings, images and logos are never collected.

See `examples/example_output.csv`. It was produced by running the real pipeline offline against **fictional** fixture sites on reserved `.example` domains. Regenerate it with `python examples/generate_example.py`.

### Scores

**relevance_score** (0–100) measures how much evidence there is that the business provides the category in the city:

- +30 category keywords or OSM tags found *outside the name*. A match only in the name gives just +10.
- +20 address in the city. A text mention only ("serving Siliguri") gives +10.
- +15 specific services or several category keywords matched.
- +10 phone, +10 website, +5 address, +5 opening hours, +5 structured business data.

**data_quality_score** (0–100) measures completeness: name 20, phone 15, address 15, website 10, city 10, category 10, hours 5, coordinates 5, description 5, and source confidence 5 (high) or 3 (medium).

**source_confidence**:

- `high`: the official website has schema.org business data, or two or more sources agree and there is a phone.
- `medium`: website text only, or OSM with a phone or website.
- `low`: anything else.

## 8. Resume functionality

Progress is saved to SQLite (`output/discovery.db`) after every query and every website:

| Table | Holds |
|---|---|
| `urls` | url, domain, status (`pending/done/failed/skipped/blocked`), last_attempt, error, attempts, provider_id |
| `queries` | which source and query pairs are finished |
| `candidates`, `raw_records` | discovery output and extracted records |
| `robots_cache`, `kv_cache` | robots.txt (24h), Overpass, search and geocoding responses |

If a run crashes or you press Ctrl+C, `python main.py --resume` reuses the previous run's arguments. It skips finished queries and websites, retries failed sites up to `max_attempts_per_url`, and then rebuilds the outputs. A run without `--resume` starts over but keeps the caches.

## 9. Deduplication

Records from different sources are grouped with union-find:

| Signal | Action |
|---|---|
| Same normalised phone | **merge** |
| Same website (registrable domain; host plus path on shared hosts such as blogspot or wixsite) | **merge** |
| Fuzzy name ≥ 92 **and** location agrees (same PIN, same locality, similar address, or < 150 m apart) **and** no conflicting phones | **merge** |
| Fuzzy name ≥ 85 otherwise | **not merged**. Both rows get `duplicate_candidate=true` and a shared `duplicate_group_id` |

Names are compared on their distinctive core. Legal suffixes, generic words and the city name are removed, and spaces are ignored. So "Cool Care Appliances", "CoolCare Appliance Services" and "Cool Care AC Services" all compare as `coolcare`.

When records merge, each field comes from the highest-priority source (`source_priority`: official website → OSM → directory → search API → manual). An empty value never overwrites a filled one. All `source_urls`, `source_domains` and `source_types` are kept, and extra phones and emails go into `additional_phones` / `additional_emails`.

## 10. Rate limiting

- 2 seconds (configurable, minimum 1s) between requests to the same domain. Each domain gets one request at a time.
- At most 3 domains are crawled in parallel (`--concurrency`, hard cap 8).
- robots.txt `Crawl-delay` is honoured. Sites asking for more than `max_crawl_delay` are skipped, not hurried.
- Only temporary errors are retried (429, 5xx, timeouts), with exponential backoff plus jitter and a hard limit (`max_retries: 2`). `Retry-After` is honoured.
- Overpass: one small combined bounding-box query per run, cached for 7 days. Each endpoint gets one attempt; if all fail, OSM is skipped for the rest of the run.
- If discovery fails completely, the previous output files are **kept** (not overwritten with empty ones) and the command exits with code 1. Fix the cause, then rerun (or `--resume`).

## 11. Legal / compliance considerations

**You are responsible** for complying with applicable law, including India's Digital Personal Data Protection Act 2023 and the IT Act, and with the terms of every site and API you use. The tool prints this reminder on every run. Built-in safeguards:

- The blocklist covers Google Maps and Search, Justdial, IndiaMART, Sulekha, UrbanCompany, social networks and others. Extend it in `config.yaml`.
- robots.txt is checked before every page. If robots.txt is unreachable (5xx) or forbidden (401/403), the site is treated as disallowed.
- There is no login, no CAPTCHA solving and no bot-protection bypass. A challenge page or 401/403 means the domain is skipped. Cloudflare-obfuscated emails are not decoded.
- The User-Agent is honest and includes a contact address. There is no browser spoofing and no headless browser.
- Only business contact data is collected. When the business's own domain has an email address, personal-looking addresses on other domains are dropped.
- Every record keeps its source URL.
- **OpenStreetMap:** data © OpenStreetMap contributors, licensed under the [ODbL](https://www.openstreetmap.org/copyright). If you publish or share a database derived from OSM data, you must credit OpenStreetMap and follow ODbL share-alike terms. The JSON export carries the attribution.
- Directories run only when you add them with `permission_confirmed: true`, after you have checked their terms yourself.

## 12. Manually reviewing providers

```bash
python main.py --review output/siliguri_providers_review.csv
python main.py --review output/siliguri_providers.csv --min-score 60 --review-limit 200
```

This prints counts per reason, then each flagged record with its scores, contact details, source URL and duplicate group. The reasons are: `low relevance`, `low quality score`, `possible duplicate`, `missing phone`, `missing address`, and `category inferred from name only`. A reasonable workflow:

1. Resolve rows that share a `duplicate_group_id`: keep one and note the others.
2. Check the `source_url` to confirm the business is real and active.
3. Leave `verification_status=none`. Verification happens only when the business claims its profile in dialnfind (OTP, then business verification).

## 13. The dialnfind bundle (`--export-dialnfind`)

`--export-dialnfind PATH` also writes a JSON bundle (`format: dialnfind-providers/1`) shaped for the server's listing validation. Commit it as `server/prisma/data/providers-<city>.json`. Every deploy (`pnpm release` → `prisma/bootstrap.ts` → `prisma/import-providers.ts`) imports it, so a new database never needs a new scrape.

Each record has the listing fields (name, phone, optional email/website/WhatsApp/address/PIN code, coordinates), `services` as category/subcategory slugs, `hours` (0 = Sunday), and `sources`: every merged source record key (`osm:node/123`, `overture:<id>`, `fsq:<id>`, `website:<host>`) with its URL. The server remembers those keys, so importing again never duplicates a listing or brings back one the team deleted, and a record whose phone matches an existing listing is linked to it instead.

A provider goes into the bundle only when:

- it passed the main-CSV relevance threshold;
- it has a valid Indian phone (`+91` and 10 digits). dialnfind is call-first, so records without a phone stay in the review CSV;
- it has coordinates and a category that maps onto dialnfind;
- its category is backed by evidence (`category_evidence` in the JSON is `evidence` or `name`): a dataset category, page text or OSM tag, or a full service phrase in the name ("Sharma TV Repair"). A shop type or loose name pattern alone ("Sayan Mobile Centre") is `weak` and stays in the review CSV for a person to check.

Email is never required: about 40% of listings have none, and the business adds its own after claiming. Keyword-stuffed names from map data ("SMART SERVICE CENTER - AC repair & service in siliguri, …") keep only their first part. The run summary prints how many providers were left out and why.

Workflow for a new scrape: run with `--export-dialnfind`, look through the review CSV, commit the bundle, deploy. Listings already on the site are untouched; only new source records are added.

---|---|
| `providers` | `provider_id` (stable key), `provider_name`, `normalized_name`, `phone`, `whatsapp`, `email`, `website`, `description`, `claim_status`, `is_claimed`, `data_quality_score`, `relevance_score`, `source_confidence`, `scraped_at` |
| `provider_services` | one row for `primary_category` (`is_primary=true`) plus one per `secondary_categories` item |
| `provider_locations` | `address`, `locality`, `city`, `state`, `pincode`, `country`, `latitude`, `longitude` |
| `provider_hours` | JSON `hours_structured` (`[{day, opens, closes}]`), one row per entry |
| `provider_verifications` | `verification_status` (`none`), plus `source_urls`, `source_types` as provenance |
| `provider_portfolio` | empty; filled by the provider after claiming |

Suggested path: load `siliguri_providers.json` with a small script (Python `supabase` client or `psql \copy` into a staging table), upsert on `provider_id`, and insert rows with `claim_status='unclaimed'`. `provider_id` is derived from the phone, website or source record, so re-running discovery updates rows instead of duplicating them.

---

### Project layout

```
main.py                   CLI entry point
config.yaml               all settings
categories.txt            categories to search
dialnfind/
  cli.py pipeline.py      orchestration
  discovery.py            query generation + source runner
  crawler.py robots.py rate_limiter.py   polite HTTP layer
  extraction.py           JSON-LD / microdata / meta / text extraction
  normalization.py        phones, emails, names, PIN codes, URLs, hours
  validation.py classification.py scoring.py deduplication.py
  geocoding.py            optional, cached
  exporters.py review.py state.py models.py config.py logging_setup.py
  bundle.py               dialnfind bundle export and category mapping check
  sources/                base.py osm.py overture.py foursquare.py _places.py website.py manual.py
                          search_api.py directory.py
tests/                    pytest suite + fictional offline fixtures
examples/                 example output generated from fixtures
```
