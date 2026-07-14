# WeatherChart UK setup

## Local preview

WeatherChart is a static subsite. Serve the repository root with any local HTTP server; do not open pages through `file://`, because JSON and module requests are subject to browser origin rules.

Use a current Node.js LTS release for data scripts and tests. Install only from the committed lockfile when one is present. The site itself does not require a framework or a browser-exposed environment file.

## Secrets

Copy `.env.example` to an untracked `.env` only for local server-side script testing. Never place real values in `weatherchart/assets/js`, HTML, JSON, screenshots, console output, URLs, pull-request text, or files uploaded to Pages.

The credential pasted into the original task must be considered exposed even though it was never written to the repository:

1. Reset/revoke it in the Met Office Weather DataHub account.
2. Create a replacement dedicated to this workflow.
3. In `BREXAtlas/Cool-Isle`, open **Settings → Environments** and create or select the environment named exactly `MET_OFFICE_API_KEY`.
4. Add an environment secret named exactly `MET_OFFICE_API_KEY` with the replacement value. The data-preparation job uses this environment; the separate deploy job continues to use `github-pages`.
5. Do not create a repository variable with the value and do not prefix it for client exposure.

Optional integrations use `YOUTUBE_API_KEY` and `X_BEARER_TOKEN` as Actions secrets. `WEATHERCHART_DEPLOY_TOKEN` is intentionally unused until the owner confirms the second repository and cross-repository deployment.

The hourly workflow uses the automatically scoped `github.token` for a single purpose: compare-and-swap updates on the dedicated `weatherchart-quota-state` branch. Do not create a separate long-lived quota token for Actions. The branch contains only UTC day, count, timestamps, and opaque reservation IDs; it must never contain the Met Office key or response data.

## Data modes

- With `MET_OFFICE_API_KEY`: the automation generates transformed Global Spot hourly data, subject to a GitHub-hosted durable 350-attempt UTC-day cap.
- If Met Office is unavailable, unconfigured, or stopped by its quota guard: the generator requests a complete, current twelve-location Open-Meteo batch and labels it as an indicative fallback. If neither live provider succeeds, production deployment stops and retains the previously deployed live site.
- Synthetic fixtures remain development/test inputs only. Production validation and the browser both reject a synthetic forecast.
- In the browser: the private API is never called. The UI reads `weatherchart/data/*.json` only.

## Manual data check

Run the project’s validation and test scripts before generating data. A production-key run must use the workflow's durable quota branch and 55-minute freshness gate. Local runs use an atomic private ledger but are not a substitute for the shared production guard. Never bypass the guard to “just test” a production key.

On first enablement, or after deletion of the durable quota file, expect the current UTC day to be quarantined at 350 with zero new Met Office calls. Normal reservations begin after the next 00:00 UTC reset. An operator who has independently verified the actual current-day count can instead use the one-time manual bootstrap documented in `WEATHERCHART-DEPLOYMENT.md`; scheduled runs can never invoke it.

## Adding community content

Add TikTok URLs only to the curated JSON file, confirm the URL is public and family-safe, and review its location basis. Do not add scraped markup or a private/login-protected link. See `SOCIAL-SOURCES-AND-MODERATION.md`.
