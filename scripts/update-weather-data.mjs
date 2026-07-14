import { pathToFileURL } from "node:url";
import {
  FRESHNESS_WINDOW_MS,
  REQUEST_TIMEOUT_MS,
  REQUIRED_BATCH_SIZE,
  UTC_BOUNDARY_GUARD_MS,
  createPaths,
} from "./lib/constants.mjs";
import { readJson, safeErrorCode, writeJsonAtomic } from "./lib/fs-json.mjs";
import { createGitHubQuotaStoreFromEnvironment } from "./lib/durable-quota-store.mjs";
import { loadLocations } from "./lib/locations.mjs";
import { MetOfficeProvider, MockProvider } from "./lib/providers.mjs";
import { openQuotaLedger } from "./lib/quota-ledger.mjs";
import { readStatus, recordSource, staleMetadata, writeStatus } from "./lib/status.mjs";
import {
  buildMockForecast,
  buildOfficialForecast,
  isOfficialForecast,
  officialForecastTimestamp,
} from "./lib/weather.mjs";

const SOURCE_ID = "met-office-global-spot-hourly";

function millisecondsUntilNextUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  const next = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
  return next - date.getTime();
}

function usableForecast(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      Number.isFinite(Date.parse(value.generatedAt ?? "")) &&
      Array.isArray(value.locations) &&
      value.locations.length === REQUIRED_BATCH_SIZE,
  );
}

async function preserveOrCreateFallback({ paths, existingForecast, locations, now }) {
  if (usableForecast(existingForecast)) return { forecast: existingForecast, wroteFallback: false };
  const sample = await readJson(paths.sampleForecastPath, null);
  const fallback = usableForecast(sample) && sample.sample === true
    ? { ...sample, sample: true, fallback: true, dataStatus: "sample" }
    : buildMockForecast(locations, now);
  await writeJsonAtomic(paths.forecastPath, fallback);
  return { forecast: fallback, wroteFallback: true };
}

function setForecastStatus(status, forecast, now, { preserved = false } = {}) {
  const stale = staleMetadata(forecast?.generatedAt, now);
  const official = isOfficialForecast(forecast);
  status.stale = stale.stale;
  status.staleLevel = stale.staleLevel;
  status.provider = official
    ? { id: "met-office", name: "Met Office Weather DataHub", mode: preserved ? "cached" : "live" }
    : { id: "mock", name: forecast?.source?.name ?? "MockProvider", mode: "sample" };
  status.fallbackUsed = preserved || !official;
  status.forecastState = official
    ? (preserved ? "last-valid-preserved" : "live")
    : "sample";
}

export async function runWeatherUpdate({
  rootDir = process.cwd(),
  now = () => new Date(),
  fetchImpl = fetch,
  apiKey = process.env.MET_OFFICE_API_KEY ?? "",
  forceMock = process.env.WEATHER_PROVIDER === "mock",
  requireDurableQuota = process.env.WEATHERCHART_REQUIRE_DURABLE_QUOTA === "true",
  durableQuotaStore = null,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const startedAt = now();
  const paths = createPaths(rootDir);
  const locations = await loadLocations(paths.locationsPath);
  const existingForecast = await readJson(paths.forecastPath, null);
  const status = await readStatus(paths.statusPath, startedAt);
  const quota = await openQuotaLedger({
    ledgerPath: paths.quotaLedgerPath,
    statusPath: paths.statusPath,
    now,
  });
  status.quota = quota.snapshot();

  const finishWithoutOfficialCall = async (reason, { sourceOutcome = "failure" } = {}) => {
    const { forecast } = await preserveOrCreateFallback({
      paths,
      existingForecast,
      locations,
      now: startedAt,
    });
    recordSource(status, SOURCE_ID, sourceOutcome, reason);
    setForecastStatus(status, forecast, startedAt, { preserved: true });
    status.quota = quota.snapshot();
    await writeStatus(paths.statusPath, status, startedAt);
    return { outcome: reason, attemptsThisRun: 0, forecast };
  };

  if (forceMock) {
    const forecast = await new MockProvider().fetchAll(locations, startedAt);
    await writeJsonAtomic(paths.forecastPath, forecast);
    recordSource(status, SOURCE_ID, "skipped");
    setForecastStatus(status, forecast, startedAt);
    status.forecastState = "sample-forced";
    status.quota = quota.snapshot();
    await writeStatus(paths.statusPath, status, startedAt);
    return { outcome: "mock", attemptsThisRun: 0, forecast };
  }

  if (!apiKey) return finishWithoutOfficialCall("credential-not-configured");

  const latestOfficial = officialForecastTimestamp(existingForecast, status);
  if (
    isOfficialForecast(existingForecast) &&
    latestOfficial &&
    startedAt.getTime() - Date.parse(latestOfficial) < FRESHNESS_WINDOW_MS
  ) {
    recordSource(status, SOURCE_ID, "skipped");
    setForecastStatus(status, existingForecast, startedAt);
    status.forecastState = "freshness-skip";
    status.quota = quota.snapshot();
    await writeStatus(paths.statusPath, status, startedAt);
    return { outcome: "freshness-skip", attemptsThisRun: 0, forecast: existingForecast };
  }

  if (millisecondsUntilNextUtcDay(startedAt) <= UTC_BOUNDARY_GUARD_MS) {
    return finishWithoutOfficialCall("utc-boundary-safety-window");
  }

  if (quota.safe && !quota.canStartBatch(REQUIRED_BATCH_SIZE)) {
    return finishWithoutOfficialCall("fewer-than-12-calls-remain");
  }

  if (requireDurableQuota) {
    const store = durableQuotaStore ?? createGitHubQuotaStoreFromEnvironment({ now });
    if (!store) return finishWithoutOfficialCall("durable-quota-not-configured");
    try {
      const reservation = await store.reserveBatch({
        size: REQUIRED_BATCH_SIZE,
        // A valid local/deployed count may raise, but never lower, the durable
        // baseline. A missing durable file is quarantined at 300 for today.
        minimumAttempts: quota.safe ? quota.ledger.attempts : null,
      });
      await quota.applyDurableReservation(reservation);
    } catch (error) {
      if (error?.durableState) {
        try {
          await quota.applyDurableState(error.durableState, {
            safe: false,
            reason: safeErrorCode(error),
          });
        } catch {
          // The remote operation already failed closed. Local status remains conservative.
        }
      }
      return finishWithoutOfficialCall(safeErrorCode(error));
    }
  } else {
    if (!quota.safe) return finishWithoutOfficialCall(quota.reason ?? "quota-state-unsafe");
    try {
      await quota.reserveBatch(REQUIRED_BATCH_SIZE);
    } catch (error) {
      return finishWithoutOfficialCall(safeErrorCode(error));
    }
  }

  if (millisecondsUntilNextUtcDay(now()) <= UTC_BOUNDARY_GUARD_MS) {
    return finishWithoutOfficialCall("utc-boundary-safety-window");
  }

  const completed = [];
  const provider = new MetOfficeProvider({ apiKey, fetchImpl, timeoutMs });
  let failureCode = null;
  let attemptsThisRun = 0;
  for (const location of locations) {
    try {
      const attemptedAt = quota.recordExternalAttempt();
      attemptsThisRun += 1;
      status.lastForecastAttemptAt = attemptedAt;
      completed.push(await provider.fetchLocation(location, startedAt));
    } catch (error) {
      failureCode = safeErrorCode(error);
      break;
    }
  }

  status.quota = quota.snapshot();
  if (failureCode || completed.length !== REQUIRED_BATCH_SIZE) {
    const { forecast } = await preserveOrCreateFallback({
      paths,
      existingForecast,
      locations,
      now: startedAt,
    });
    recordSource(status, SOURCE_ID, "failure", failureCode ?? "incomplete-location-batch");
    setForecastStatus(status, forecast, startedAt, { preserved: true });
    await writeStatus(paths.statusPath, status, startedAt);
    return {
      outcome: failureCode ?? "incomplete-location-batch",
      attemptsThisRun,
      forecast,
    };
  }

  const forecast = buildOfficialForecast(completed, startedAt);
  await writeJsonAtomic(paths.forecastPath, forecast);
  recordSource(status, SOURCE_ID, "success");
  status.provider = { id: "met-office", name: "Met Office Weather DataHub", mode: "live" };
  status.fallbackUsed = false;
  status.stale = false;
  status.staleLevel = "fresh";
  status.forecastState = "live";
  status.lastSuccessfulOfficialAt = startedAt.toISOString();
  status.quota = quota.snapshot();
  await writeStatus(paths.statusPath, status, startedAt);
  return { outcome: "updated", attemptsThisRun, forecast };
}

async function main() {
  const result = await runWeatherUpdate();
  // Deliberately log only controlled state; request URLs, headers and credentials are excluded.
  console.log(`Weather update: ${result.outcome}; upstream attempts: ${result.attemptsThisRun}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Weather update stopped safely (${safeErrorCode(error)}).`);
    process.exitCode = 1;
  });
}
