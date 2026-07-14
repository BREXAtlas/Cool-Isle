# WeatherChart UK setup

## Repository ownership

The live WeatherChart application is owned and published by the separate public repository [`BREXAtlas/WeatherChartUK`](https://github.com/BREXAtlas/WeatherChartUK). Its GitHub Actions Pages deployment is available at:

`https://brexatlas.github.io/WeatherChartUK/`

`BREXAtlas/Cool-Isle` is a secret-free public-data mirror and consumer. It links to the standalone application and may mirror or read WeatherChart's generated public JSON, but it must not run the Met Office refresh, maintain a second quota ledger, or contain a provider credential. The embedded `weatherchart/` tree in Cool Isle is retained only as a source/history mirror; it is not the production WeatherChart route.

## Local preview

Clone `BREXAtlas/WeatherChartUK` for WeatherChart feature or data-pipeline work. Serve its project root with a local HTTP server rather than opening pages through `file://`, because modules and JSON requests use browser origin rules. Use a current Node.js LTS release and install dependencies from the committed lockfile.

Cool Isle can also be served locally as a static site. Its WeatherChart links and status panel should continue to use the public WeatherChartUK Pages URL.

## Secrets

The credential pasted into the original task must be treated as exposed and revoked. A replacement key belongs only in the standalone repository:

1. Open `BREXAtlas/WeatherChartUK` on GitHub.
2. Go to **Settings → Secrets and variables → Actions**.
3. Add a **repository secret** named exactly `MET_OFFICE_API_KEY`.
4. Keep the value out of repository variables, environment files, browser assets, generated JSON, logs, URLs, screenshots, issues, and pull requests.

Optional `YOUTUBE_API_KEY` and `X_BEARER_TOKEN` values, if enabled, follow the same repository-secret rule in `BREXAtlas/WeatherChartUK`. No cross-repository deploy token is required: each repository deploys its own Pages artifact with its automatically scoped GitHub token.

## Data and quota responsibility

Only the WeatherChartUK workflow may use the Met Office key. It owns the dedicated durable quota branch, the hourly refresh, and the hard 350-attempt UTC-day ceiling. A complete twelve-location batch is reserved before the first upstream request; failures and unused reservations still count.

The browser never calls Weather DataHub. It reads validated public files such as `data/forecast.json` and `data/status.json`. When the official source cannot run, the standalone workflow may publish a clearly attributed live Open-Meteo fallback. Synthetic fixtures are limited to development and tests and are rejected in production.

See `WEATHERCHART-DEPLOYMENT.md` for operational checks and recovery.

## Community content

Community content must use the configured official APIs, supported endpoints, or manually curated public links. Do not add scraped markup or private/login-protected sources. See `SOCIAL-SOURCES-AND-MODERATION.md`.
