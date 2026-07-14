# WeatherChart UK implementation plan

Reviewed: 13 July 2026

## Goal

Add a distinct, accessible WeatherChart UK subsite at `/Cool-Isle/weatherchart/` without replacing or weakening Cool Isle. Both brands will link clearly to each other, and the existing Cool Isle shop, guides, map, currency conversion, winter content, image-injection step, and GitHub Pages deployment will remain operational.

## Baseline audit

- The repository is a dependency-free static site: `index.html`, `blog.html`, and `winter.html`, plus a deployment-time Python image injector and one GitHub Pages workflow.
- Cool Isle currently calls Open-Meteo once in the browser for eight cities, Frankfurter once for exchange rates, and Leaflet/OpenStreetMap for its map. There are no timeouts, recurring weather checks, timestamps, retained-success state, provider abstraction, generated weather data, tests, or WeatherChart routes.
- The deployment workflow publishes the repository root after mutating the three HTML files with `scripts/add-free-images.py`.
- The current live desktop and mobile pages render without blocking console errors. `/Cool-Isle/weatherchart/` is currently a 404 and no Cool Isle page links to WeatherChart.
- No credential is present in tracked files, the bundled ZIP, or repository history. The credential supplied in the conversation will not be used or stored; it must be rotated before a replacement is added as a GitHub Actions secret.

## Data and quota architecture

1. The browser will load small, normalised JSON files from `weatherchart/data/`; it will never call Weather DataHub directly.
2. `scripts/update-weather-data.mjs` will expose `MetOfficeProvider`, `OpenMeteoFallbackProvider`, and `MockProvider` behind one normalised schema.
3. The official Global Spot hourly endpoint will be called for the twelve configured locations once per hourly refresh. Twelve locations × 24 UTC hours = 288 attempts/day.
4. A hard shared ceiling of 350 upstream attempts per UTC day will apply. The complete twelve-location batch is durably pre-reserved through a compare-and-swap update on a dedicated GitHub branch and confirmed before the first call. Failed or unused reserved calls still count. There will be no automatic retry of Weather DataHub calls and no retry after `429`.
5. Deployed status and the Actions cache are secondary recovery/observability copies, not quota authority. Scheduled runs are serialised. Missing durable state is quarantined at 350 for the current UTC day; invalid, unconfirmed, exhausted, or conflicting state makes no official calls and activates the live attributed fallback.
6. Manual and push-triggered runs will honour the same freshness check and ledger; they will not refetch official data that is less than 55 minutes old.
7. The separate Global Spot daily endpoint remains disabled because the hourly feed supplies the required outlook without another twelve-call batch. Open-Meteo supplies a separately attributed live fallback when the preferred provider cannot run.
8. The key will be read only from `MET_OFFICE_API_KEY` in GitHub Actions, sent only in the `apikey` request header, and excluded from URLs, logs, generated JSON, browser code, examples, and repository history.

## Implementation phases

1. **Foundation and guardrails**
   - Add `.gitignore`, `.env.example`, package/test metadata, normalised schemas, test fixtures, priority locations, source records, and quota tests.
   - Add source, licensing, privacy, moderation, setup, deployment, domain, and image-credit documentation.

2. **WeatherChart experience**
   - Build a self-contained vanilla-JavaScript subsite with a distinctive indigo/sky palette, semantic structure, skip link, accessible search, warning region, current conditions, deterministic “What this means” cards, 24-hour chart plus data table, forecast cards, Leaflet map plus list, severe-weather news, explainers, community-weather cards, stale/error states, and reduced-motion support.
   - Publish only validated live provider data; if no provider succeeds, retain prior validated live data or show an unavailable state.
   - Keep all internal links and assets relative so the subsite works both under `/Cool-Isle/weatherchart/` and at a future domain root.

3. **Cool Isle integration**
   - Add prominent WeatherChart links to the Cool Isle navigation and footer, plus links on the blog and winter guide.
   - Add a compact WeatherChart status panel to Cool Isle.
   - Refactor the existing Open-Meteo request into a timeout-protected reusable refresh that runs at load, every 60 minutes, and after visibility restoration when stale; retain the last successful display and show the last UK check time.

4. **Hourly generation and deployment**
   - Extend the existing Pages workflow with the `17 * * * *` schedule, shared quota-state restoration, weather/RSS/community generation, data validation, tests, and deployment of the last valid complete dataset.
   - Preserve least-privilege Pages permissions, avoid committing generated hourly files, avoid recursive workflow triggers, and leave any cross-repository/domain publishing disabled.

5. **Verification and delivery**
   - Run unit and integration tests for quota enforcement, provider normalisation, conversions, stale states, URL safety, warnings, RSS/news constraints, moderation, expiry, coarse locations, and missing/malformed inputs.
   - Verify Cool Isle and WeatherChart at desktop, 320–390px mobile, keyboard-only, and reduced-motion settings; check links, console errors, internal 404s, source labels, and both deployment bases.
   - Capture before/after screenshots, make logical commits on `codex/weatherchart-uk`, push the branch, and open a draft pull request. DNS, CNAME changes, the second repository, and cross-repository deployment remain outside scope until the owner confirms them.

## Source and legal constraints

- Use Weather DataHub APIs, official Met Office RSS feeds, Open-Meteo fallback data, and direct source links only. Do not scrape, frame, hotlink, or reproduce Met Office pages or images.
- Display “Powered by Met Office data — data supplied by the Met Office” beside Met Office-derived visualisations, preserve direct RSS links, and clearly state that WeatherChart UK is independent and not endorsed by the Met Office.
- Treat warnings seriously, preserve their source meaning, never invent geometry, and keep editorial interpretations separate.
- Community content will use only curated links or configured official APIs/oEmbed, with family-safe moderation, coarse city/region labels, visible confidence, short retention, and no inferred precise personal location.

## Completion checks

- Cool Isle remains functional and gains clear links to WeatherChart.
- WeatherChart links clearly back to Cool Isle and works at `/Cool-Isle/weatherchart/` with a distinct accessible mobile design.
- Official calls cannot exceed 350 per UTC day; secrets cannot reach Git, generated data, logs, or the browser.
- Data source, timestamp, fallback, and stale state are visible throughout.
- Scheduled generation preserves the last valid dataset on any partial failure.
- Automated checks pass and the draft pull request documents remaining manual secret/domain setup.
