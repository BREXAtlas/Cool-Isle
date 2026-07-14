# ☀️ CoolIsle UK — Weather-Ready Living for British Homes

**Too hot in July. Too cold in January. Wet all year. We've got you.**

CoolIsle UK helps British households stay safe and comfortable through heatwaves, cold snaps and downpours — with honest advice, budget-friendly hacks and sustainable kit that suits terraces, tenements, flats and rentals.

🔗 **Live site:** https://brexatlas.github.io/Cool-Isle/

## What's on the site

- 🌡️ **Live UK Heat Tracker** — real-time temperatures for 8 UK cities with an auto-escalating heat advisory ticker
- 🛒 **Heat Relief Shop** — portable cooling sized for UK rooms, fitted for UK windows, on UK voltage
- 💷 **Budget Cooling Hacks** — 8 free-or-pennies tricks for keeping cool in British homes
- ❄️ **Winter-Ready Guide** — draught-proofing, "heat the person not the house," and every GOV.UK support scheme
- 📈 **UK Climate Trends** — 20 years of rising heat, and how Britain compares to its neighbours
- 🗺️ **Live Heat Map** — temperatures by nation and region, plus our fulfilment hubs
- 🔍 **AC Locator** — every major UK retailer compared honestly, even our competitors
- 🧮 **BTU Calculator** — the right size unit for your room in five seconds

## Our promise

Fans before coolers, coolers before compressors, insulation before everything. We always recommend the lowest-energy option that solves your problem — cheaper for you, lighter on the grid. Official Met Office, NHS and GOV.UK resources are linked throughout.

## Pages

| File | Page |
|---|---|
| `index.html` | Main site |
| `blog.html` | Guides & blog |
| `winter.html` | Winter-Ready guide |
| `weatherchart/index.html` | WeatherChart UK forecast companion |

## Deployment

Deploys automatically to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`. The same serialised workflow also checks WeatherChart data around minute 17 of each hour and supports manual dispatch. Set **Settings → Pages → Source → GitHub Actions** once.

## WeatherChart UK

[WeatherChart UK](https://brexatlas.github.io/Cool-Isle/weatherchart/) is a connected but visually separate, family-friendly forecast companion. It reads generated first-party JSON, provides 12 cached UK locations, plain-English deterministic interpretations, accessible charts and tables, official-warning links, severe-weather news, a coarse weather map, and moderated public-weather context. It is independent and is not affiliated with or endorsed by the Met Office.

The committed dataset is synthetic and clearly labelled. With a valid server-side `MET_OFFICE_API_KEY`, the hourly workflow can replace it with normalised Met Office Global Spot hourly data. The browser never receives that key and never calls Weather DataHub directly.

### Local development and tests

Use Node.js 22 or newer. From the repository root:

```sh
npm ci
npm test
npm run test:html
npm run validate:data
python -m http.server 8000
```

Then open `http://localhost:8000/` for Cool Isle and `http://localhost:8000/weatherchart/` for WeatherChart. Opening the HTML through `file://` will not work reliably because the subsite fetches local JSON modules.

### Data updates, keys and the 300-call ceiling

Copy `.env.example` only for local server-side testing and keep the resulting `.env` untracked. In GitHub, store the replacement Met Office credential as the Actions secret `MET_OFFICE_API_KEY`; optional YouTube and X credentials use the documented Actions-secret names. Never place credentials in HTML, browser JavaScript, generated JSON, screenshots, logs or pull-request text.

The Global Spot updater fetches 12 priority locations no more often than every 55 minutes, reserves the complete batch on the dedicated `weatherchart-quota-state` branch before making any request, confirms that write, performs no automatic retries, serialises runs, and stops before a shared UTC-day total of 300. A normal 24-hour schedule therefore reserves at most 288 calls. Failed or unused reserved attempts still count. Missing, contradictory or malformed durable state is quarantined at 300 for the current UTC day while the last valid/sample bundle stays available; first-time live requests therefore begin after the next 00:00 UTC reset.

Warnings and news use official Met Office RSS feeds; article bodies and Met Office images are not copied. Community adapters use supported APIs, oEmbed or manually reviewed public links—never page scraping. Cards expose city/region only, show location confidence, expire quickly and remain explicitly unverified.

### Operations and documentation

- Run the workflow manually from the repository’s **Actions** tab; the same freshness and quota guards apply.
- Diagnose stale data through the deployed `weatherchart/data/status.json` and the source-specific workflow outcome, without printing secrets.
- The current preview lives below `/Cool-Isle/weatherchart/`. A later `weatherchart.uk` deployment requires a separately confirmed Pages repository and token; no DNS or cross-repository publishing is enabled here.
- Setup, fallbacks and secret rotation: [`docs/WEATHERCHART-SETUP.md`](docs/WEATHERCHART-SETUP.md)
- Hourly deployment and stale-data recovery: [`docs/WEATHERCHART-DEPLOYMENT.md`](docs/WEATHERCHART-DEPLOYMENT.md)
- Source/licence review: [`docs/MET-OFFICE-SOURCE-AUDIT.md`](docs/MET-OFFICE-SOURCE-AUDIT.md) and [`docs/ATTRIBUTION-AND-LICENSING.md`](docs/ATTRIBUTION-AND-LICENSING.md)
- Community moderation and privacy: [`docs/SOCIAL-SOURCES-AND-MODERATION.md`](docs/SOCIAL-SOURCES-AND-MODERATION.md) and [`docs/PRIVACY.md`](docs/PRIVACY.md)
- Domain preparation and rollback: [`docs/WEATHERCHART-DOMAIN.md`](docs/WEATHERCHART-DOMAIN.md)
- Image provenance: [`docs/IMAGE-CREDITS.md`](docs/IMAGE-CREDITS.md)

---
*Live weather via Open-Meteo; exchange rates via Frankfurter; maps © OpenStreetMap contributors. Weather data is indicative — always follow official Met Office and UKHSA guidance.*
