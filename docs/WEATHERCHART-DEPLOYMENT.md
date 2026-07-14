# WeatherChart UK deployment

## Active deployment

WeatherChart is deployed from [`BREXAtlas/WeatherChartUK`](https://github.com/BREXAtlas/WeatherChartUK) through GitHub Actions Pages:

`https://brexatlas.github.io/WeatherChartUK/`

The WeatherChart workflow stages the application at the root of its Pages artifact, so no Cool Isle path segment is used. `BREXAtlas/Cool-Isle` has its own independent Pages deployment. Cool Isle is a secret-free public-data mirror: it contains no Met Office key, quota writer, or hourly provider job, and it links to WeatherChartUK while consuming only generated public data.

## Hourly WeatherChart run

The standalone workflow checks around minute 17 each hour. Scheduled starts are not exact, so visitor copy should say “checked hourly” rather than promise an exact minute.

Each production refresh must:

1. restore the last deployed valid live dataset where possible;
2. skip official calls when the existing data is less than 55 minutes old;
3. read the dedicated quota state branch in `BREXAtlas/WeatherChartUK`;
4. reserve and confirm the complete twelve-call batch before any Global Spot request;
5. stop official requests when state cannot be confirmed or the UTC-day total would exceed 350;
6. make at most the reserved twelve Global Spot attempts without automatic retries;
7. refresh configured warnings, news, and community sources;
8. validate and sanitise the complete dataset;
9. publish a fresh, attributed Open-Meteo batch when the preferred forecast cannot run, or preserve the last valid live dataset if neither live provider succeeds; and
10. publish one tested Pages artifact without exposing private state or credentials.

Once reserved, attempts count even when a request fails or a runner stops. Twenty-four normal hourly batches reserve 288 calls, leaving 62 calls of headroom under the fixed 350-call ceiling. A batch cannot start during the final five minutes of a UTC day.

## Secret and quota isolation

`MET_OFFICE_API_KEY` is a repository-level GitHub Actions secret in `BREXAtlas/WeatherChartUK`. It is available only to the preparation job and is never included in the Pages artifact, generated JSON, logs, URLs, or quota state.

The workflow's automatically scoped GitHub token maintains `.weatherchart-quota/met-office-global-spot.json` on the standalone repository's `weatherchart-quota-state` branch. The branch contains only quota metadata. Protect it against deletion and force-pushes without imposing a pull-request requirement that would block the hourly writer. Never reduce a same-day count.

If the quota file is missing, the workflow must fail closed by recording a 350-attempt quarantine for the current UTC day and making no official request. A verified operator may use the workflow's one-time manual bootstrap inputs to record the actual same-day usage. Never guess zero, and never use bootstrap to overwrite genuine reservations.

## Manual run

In `BREXAtlas/WeatherChartUK`, open **Actions**, select the Pages deployment workflow, and choose **Run workflow**. Manual and push-triggered runs use the same freshness and quota guards as scheduled runs.

Cool Isle's Pages workflow may also be dispatched independently, but doing so only republishes Cool Isle. It does not refresh WeatherChart or consume the Met Office quota.

## Diagnose stale data

1. Open [`data/status.json`](https://brexatlas.github.io/WeatherChartUK/data/status.json).
2. Check `generatedAt`, `successfulSources`, `failedSources`, `provider`, `fallbackUsed`, `stale`, and the quota fields.
3. Inspect the latest Actions run in `BREXAtlas/WeatherChartUK`; logs may name sources and response status but must not print request headers or secrets.
4. For a `401`, rotate the Weather DataHub key and replace the `MET_OFFICE_API_KEY` repository secret in WeatherChartUK.
5. For a durable-quota error, inspect the WeatherChartUK state branch and workflow `contents: write` permission. Do not bypass or seed the guard downward.
6. If validation fails, fix and test the parser before deploying. Never replace valid live data with empty or synthetic output.

## Rollback

Redeploy the last known-good WeatherChartUK commit through the same Actions Pages workflow. A redeploy does not make old forecast data current, so timestamps and stale state must remain honest. Cool Isle can be rolled back independently without changing WeatherChart's data job or quota ledger.

Custom-domain instructions are in `WEATHERCHART-DOMAIN.md` and `GODADDY-GITHUB-PAGES-DNS.md`.
