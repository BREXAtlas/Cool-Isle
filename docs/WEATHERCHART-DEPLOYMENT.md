# WeatherChart deployment

## Preview mode

The existing GitHub Pages workflow publishes Cool Isle and the `weatherchart/` directory together. The preview route is:

`https://brexatlas.github.io/Cool-Isle/weatherchart/`

All WeatherChart page, asset and data links are relative so the case-sensitive `/Cool-Isle/` base remains valid.

## Hourly run

The workflow is scheduled around minute 17 each hour and can also be dispatched manually or run after an approved push. Scheduled starts are not exact, so UI copy says “checked hourly” and “next check around”.

The build must:

1. restore the last deployed valid JSON and advisory local quota cache where possible;
2. skip official calls when the data is less than 55 minutes old;
3. use the workflow token to read the dedicated `weatherchart-quota-state` branch;
4. atomically reserve the complete twelve-call batch there, then read it back and verify the reservation before any Global Spot request;
5. stop without a Met Office request if durable state cannot be read, written, or confirmed, or if the shared UTC-day total would exceed 300;
6. fetch twelve Global Spot hourly locations only after that confirmation;
7. refresh official warning/news RSS and configured social adapters;
8. validate and sanitise the complete dataset;
9. keep the last valid file for any failed source;
10. run tests and the existing image-injection step; and
11. deploy one complete Pages artifact without committing generated hourly files.

Runs are serialised, and the GitHub Contents update also uses the current blob SHA as a compare-and-swap guard. The durable file records reservations, never credentials or response data. Each workflow process gets a unique reservation ID. The generator does not retry Weather DataHub automatically and never retries `429`.

The reservation is deliberately conservative: once twelve calls are durably reserved, all twelve count against the 300 ceiling even if the first request fails or the runner crashes before making a request. Twenty-four normal hourly batches reserve 288 calls, leaving twelve calls of headroom. `callsMadeThisRun` reports observed network attempts, while `reservedCallsThisRun` reports the safety accounting.

A batch cannot start in the final five minutes of a UTC day, and every request rechecks the reserved UTC day. This prevents a batch reserved just before midnight from spilling unaccounted calls into the next day's allowance.

The Actions cache is not the authority. A last-valid candidate snapshot is prepared only after the final tests and validation; it remains ephemeral on the runner until the cache is saved after Pages deployment succeeds. The private state directory is excluded from the staged Pages artifact, so a failed deployment cannot promote an undeployed snapshot into the next run's cache. The durable branch reservation remains valid even if deployment, validation, the runner, or that cache later fails.

### First run and missing-state quarantine

The workflow creates `weatherchart-quota-state` if needed. If its quota file is missing for any reason, the workflow writes and confirms a 300-attempt quarantine for the current UTC day and makes no Met Office calls. This also covers accidental branch/file deletion without trusting an older deployed or cached count. On the next UTC day, that valid prior-day record resets to zero and normal twelve-call reservations can begin. A malformed or unreadable durable file remains fail-closed until corrected.

The workflow needs `contents: write` only to maintain this dedicated state branch. `MET_OFFICE_API_KEY` remains a separate Actions secret and is never sent to GitHub's Contents API. The quota state lives at `.weatherchart-quota/met-office-global-spot.json` on `weatherchart-quota-state` and is not included in the Pages artifact.

After the branch is created, protect `weatherchart-quota-state` against deletion and force-pushes without adding a pull-request requirement that would block the hourly writer. Do not edit the same-day count downward. If an authorised administrator rewinds or replaces a valid ledger, treat the count as untrusted: stop the workflow, rotate the provider key if needed, and quarantine that UTC day at 300 before resuming.

## Manual workflow run

Use **Actions → Deploy CoolIsle to GitHub Pages → Run workflow**. A manual run is not a quota bypass: when current official data is fresh, it should validate and redeploy without another official fetch.

## Diagnosing stale data

1. Open `weatherchart/data/status.json` from the deployed site.
2. Check `generatedAt`, `successfulSources`, `failedSources`, `provider`, `fallbackUsed`, `stale`, and the UTC-day quota fields.
3. Inspect the latest Actions run for a named source failure. Logs must describe source/status without printing request headers or secrets.
4. If the key returns `401`, reset the Weather DataHub key and replace the Actions secret.
5. If `durable-quota-*` appears, inspect the state branch and workflow `contents: write` permission. Do not bypass the guard or seed a lower same-day count.
6. If the quota guard or missing-state quarantine is reached, wait for 00:00 UTC and serve the cached dataset; the 300 cap is not configurable.
7. If validation fails, fix the parser/fixture before deploying. Never publish an empty replacement.

## Rollback

Redeploy the last known-good commit through the same Pages workflow. Generated status must remain honest about its forecast/model time; a redeploy does not make old weather new.

Cross-repository deployment and DNS changes are deliberately inactive. See `WEATHERCHART-DOMAIN.md`.

GitHub implementation references: [repository contents endpoints](https://docs.github.com/en/rest/repos/contents) and [Git reference endpoints](https://docs.github.com/en/rest/git/refs).
