# Historical Cool Isle repository audit

Reviewed: 13 July 2026

> This is the baseline audit captured before WeatherChart was implemented. It is retained for provenance, not as current deployment guidance. WeatherChart is now published from `BREXAtlas/WeatherChartUK` at `https://brexatlas.github.io/WeatherChartUK/`; Cool Isle is a separate, secret-free public-data consumer.

## Architecture

The starting project was a dependency-free GitHub Pages site made of three standalone HTML pages, one deployment-time Python mutator, one Pages workflow, and a ZIP snapshot. CSS and JavaScript lived inline. There was no package manager, test suite, generated data pipeline, environment convention, service worker, manifest, sitemap, WeatherChart route, or custom-domain file.

| File | Starting responsibility | Notable risk |
| --- | --- | --- |
| `.github/workflows/deploy.yml` | Publish the repository root to Pages after adding images | No hourly data step, validation, tests, cache, or secret use |
| `index.html` | Entire Cool Isle storefront, advice, weather, products, map, chart and calculator | Large coupled file; one-shot weather request; unofficial threshold labels could resemble warnings |
| `blog.html` | Cooling and buying guides | No WeatherChart link or canonical metadata |
| `winter.html` | Winter guidance and support links | No WeatherChart link or canonical metadata |
| `scripts/add-free-images.py` | Deployment-time canonical fix and remote Unsplash image injection | Exact-string mutation creates local/deployed differences and can fail silently after markup changes |
| `README.md` | Basic project and Pages notes | No testing, secrets, fallback, licensing or WeatherChart setup |
| `coolisle-site-pack.zip` | Older snapshot of the four main text files | Redundant and included in the deployed artifact |

## Starting integrations

- Open-Meteo: one browser request on page load for eight cities; no timeout, interval, visibility refresh, timestamp, response-status validation, or retained-success state.
- Frankfurter: one exchange-rate request with silent hard-coded fallback.
- Leaflet 1.9.4 and OpenStreetMap tiles: city and supplier markers, with no non-map alternative.
- Unsplash: deployment-injected remote images.

There was no Met Office API, warnings/news RSS, social API, geocoder, provider abstraction, static weather JSON, or server-side proxy.

## Live-site audit

At the time of this baseline audit, the live desktop and 390px mobile page rendered without blocking console errors or horizontal overflow. Cool Isle’s root, blog and winter pages returned successfully. The then-proposed embedded WeatherChart route did not exist, and none of the three live pages linked to WeatherChart. This finding is historical; the active WeatherChart site now has its own repository and Pages URL.

## Fragile areas preserved or addressed

- The image injector remains in the deployment path and must stay idempotent.
- Existing product, currency, guide, chart and map behaviour must survive WeatherChart integration.
- The old temperature ticker used “AMBER-LEVEL” and “SEVERE” labels derived only from Open-Meteo values; new copy must explicitly distinguish editorial temperature notes from official warnings.
- If the map rendered before the original weather request completed, its weather popups stayed unavailable; weather markers now need to be refreshable.
- Third-party CDN resources lack subresource integrity and the site has no enforceable response-header CSP on GitHub Pages. Any meta CSP must be tested carefully against Leaflet, fonts, images, and optional embeds.

## Repository and secret state

The starting checkout was clean at commit `3a7b676`, tracking `origin/main`. No credential pattern was found in tracked files, the ZIP entries, or textual commit patches. The credential pasted into the task conversation is outside Git history but must be treated as exposed and revoked. The replacement now belongs only in the `MET_OFFICE_API_KEY` repository secret in `BREXAtlas/WeatherChartUK`; Cool Isle must remain secret-free. A credential must never be copied into a file, log, generated dataset, URL, browser bundle, or pull-request text.
