# Historical WeatherChart UK implementation plan

Original review: 13 July 2026
Status: completed and superseded on 14 July 2026

> This file is retained as a historical design record. It is not deployment or secret-setup guidance. Current operations are documented in `WEATHERCHART-SETUP.md` and `WEATHERCHART-DEPLOYMENT.md`.

## Original goal

The initial work added an accessible WeatherChart experience alongside Cool Isle while preserving Cool Isle's shop, guides, map, currency conversion, winter content, image-injection step, and Pages deployment. The first implementation was built inside the Cool Isle working tree so the interface and data pipeline could be developed and verified together.

The final publishing architecture separated the sites. WeatherChart now lives in [`BREXAtlas/WeatherChartUK`](https://github.com/BREXAtlas/WeatherChartUK) and is published by its own GitHub Actions workflow at `https://brexatlas.github.io/WeatherChartUK/`. Cool Isle links to that deployment and reads only public generated data.

## Implemented architecture

- Browser code reads small normalised JSON files and never calls Weather DataHub directly.
- `MetOfficeProvider`, `OpenMeteoFallbackProvider`, and development-only fixtures share a normalised forecast schema.
- The official Global Spot hourly endpoint covers twelve configured UK locations per refresh.
- The standalone WeatherChartUK repository owns one durable quota ledger and a hard 350-attempt UTC-day ceiling. It reserves a complete twelve-call batch before the first provider request and does not retry failed requests automatically.
- Missing, invalid, unconfirmed, exhausted, or conflicting quota state fails closed. Open-Meteo can supply a separately attributed live fallback.
- The Met Office key is read only from the `MET_OFFICE_API_KEY` repository secret in WeatherChartUK and is excluded from URLs, logs, generated data, browser code, examples, and Git history.
- WeatherChart and Cool Isle contain clear links to one another while keeping independent GitHub Pages deployments.

## Delivered experience

- Accessible overview, forecast tables and cards, optional Leaflet/OpenStreetMap map, warning/news views, explainers, community-weather cards, stale/error states, and reduced-motion support.
- Visible source attribution, timestamps, fallback state, and independence from the Met Office.
- Test coverage for quota enforcement, provider normalisation, conversions, stale states, URL safety, warning/news constraints, moderation, expiry, coarse locations, and malformed inputs.
- Production validation that rejects synthetic forecast data.
- A separate standalone repository with README, MIT licence, GitHub Actions Pages deployment, and cross-site promotion.

## Constraints retained from the original plan

- Do not scrape, frame, hotlink, or reproduce Met Office pages or images.
- Preserve direct official warning/news links and clearly separate editorial summaries from official warnings.
- Use only configured official APIs, supported public endpoints, or curated public links for community cards.
- Reduce public community locations to city or region; never infer or retain precise personal coordinates.
- Keep all provider credentials server-side and enforce the 350-call ceiling before making official requests.

## Current completion state

- WeatherChart's active URL is `https://brexatlas.github.io/WeatherChartUK/`.
- `BREXAtlas/WeatherChartUK` is the sole hourly Met Office caller and quota owner.
- `BREXAtlas/Cool-Isle` is a secret-free public-data consumer with no provider schedule or quota branch.
- Each repository publishes its own Pages artifact through GitHub Actions; no cross-repository deploy token is required.
