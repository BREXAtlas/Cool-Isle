import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { GitHubContentsQuotaStore } from "../scripts/lib/durable-quota-store.mjs";
import { readJson, writeJsonAtomic } from "../scripts/lib/fs-json.mjs";
import { runWeatherUpdate } from "../scripts/update-weather-data.mjs";
import { removeRoot, seedPrivateLedger, temporaryRoot } from "./helpers.mjs";

const fixtureUrl = new URL("./fixtures/metoffice-hourly.json", import.meta.url);
const fixture = JSON.parse(await fs.readFile(fixtureUrl, "utf8"));
const workflowUrl = new URL("../.github/workflows/deploy.yml", import.meta.url);

function apiResponse(status, data = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
  };
}

function createFakeGitHub({
  branchExists = true,
  conflictOnce = false,
  hideConfirmationOnce = false,
} = {}) {
  const state = {
    branchExists,
    record: null,
    sha: null,
    writes: 0,
    requests: [],
    conflictOnce,
    hideConfirmationOnce,
    afterWrite: false,
  };
  let shaCounter = 1;
  const nextSha = () => (shaCounter++).toString(16).padStart(40, "0");

  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method ?? "GET";
    const body = options.body ? JSON.parse(options.body) : null;
    state.requests.push({ url: String(url), method, headers: options.headers, body });
    assert.equal(options.headers.authorization, "Bearer test-token");
    assert.doesNotMatch(String(url), /test-token/);

    if (url.pathname === "/repos/example/weather/git/ref/heads/weatherchart-quota-state") {
      return state.branchExists
        ? apiResponse(200, { object: { sha: "a".repeat(40) } })
        : apiResponse(404);
    }
    if (url.pathname === "/repos/example/weather") {
      return apiResponse(200, { default_branch: "main" });
    }
    if (url.pathname === "/repos/example/weather/git/ref/heads/main") {
      return apiResponse(200, { object: { sha: "b".repeat(40) } });
    }
    if (url.pathname === "/repos/example/weather/git/refs" && method === "POST") {
      state.branchExists = true;
      return apiResponse(201, { object: { sha: body.sha } });
    }
    if (url.pathname === "/repos/example/weather/contents/.weatherchart-quota/met-office-global-spot.json") {
      if (method === "GET") {
        if (state.afterWrite && state.hideConfirmationOnce) {
          state.hideConfirmationOnce = false;
          return apiResponse(404);
        }
        if (!state.record) return apiResponse(404);
        return apiResponse(200, {
          type: "file",
          sha: state.sha,
          content: Buffer.from(`${JSON.stringify(state.record)}\n`).toString("base64"),
        });
      }
      if (method === "PUT") {
        if (state.conflictOnce) {
          state.conflictOnce = false;
          const incoming = JSON.parse(Buffer.from(body.content, "base64").toString("utf8"));
          const reservedAt = incoming.updatedAt;
          state.record = {
            version: 2,
            utcDay: incoming.utcDay,
            attempts: 12,
            limit: 300,
            updatedAt: reservedAt,
            source: "github-contents-durable-reservation",
            reservations: [{
              id: "competing-run:1",
              size: 12,
              attemptsBefore: 0,
              attemptsAfter: 12,
              reservedAt,
            }],
          };
          state.sha = nextSha();
          return apiResponse(409);
        }
        if (state.record && body.sha !== state.sha) return apiResponse(409);
        if (!state.record && body.sha != null) return apiResponse(409);
        state.record = JSON.parse(Buffer.from(body.content, "base64").toString("utf8"));
        state.sha = nextSha();
        state.writes += 1;
        state.afterWrite = true;
        return apiResponse(state.writes === 1 ? 201 : 200, {
          content: { sha: state.sha },
          commit: { sha: nextSha() },
        });
      }
    }
    throw new Error(`Unexpected fake GitHub request: ${method} ${url.pathname}`);
  };

  return { state, fetchImpl };
}

function quotaStore(fake, now, reservationId) {
  return new GitHubContentsQuotaStore({
    apiUrl: "https://api.github.test",
    repository: "example/weather",
    token: "test-token",
    reservationId,
    fetchImpl: fake.fetchImpl,
    now: () => now,
  });
}

function seedDurableRecord(fake, { day = "2026-07-13", attempts = 0 } = {}) {
  fake.state.record = {
    version: 2,
    utcDay: day,
    attempts,
    limit: 300,
    updatedAt: `${day}T00:00:00.000Z`,
    source: "github-contents-durable-reservation",
    reservations: [],
  };
  fake.state.sha = "c".repeat(40);
}

test("GitHub Contents store creates its branch and quarantines a missing file for the UTC day", async () => {
  const now = new Date("2026-07-13T18:00:00Z");
  const fake = createFakeGitHub({ branchExists: false });
  const store = quotaStore(fake, now, "run-101:1");
  await assert.rejects(
    store.reserveBatch({ size: 12, minimumAttempts: 24 }),
    { code: "durable-quota-bootstrap-quarantined" },
  );

  assert.equal(fake.state.record.attempts, 300);
  assert.equal(fake.state.record.limit, 300);
  assert.equal(fake.state.record.source, "missing-durable-state-quarantine");
  assert.deepEqual(fake.state.record.reservations, []);
  assert.equal(fake.state.writes, 1);
  assert.equal(fake.state.requests.some(({ method, url }) => method === "POST" && url.endsWith("/git/refs")), true);
});

test("a valid previous-day durable record resets before confirming a full batch", async () => {
  const now = new Date("2026-07-14T00:05:00Z");
  const fake = createFakeGitHub();
  seedDurableRecord(fake, { day: "2026-07-13", attempts: 300 });
  const result = await quotaStore(fake, now, "run-101b:1").reserveBatch({
    size: 12,
    minimumAttempts: 0,
  });
  assert.equal(result.confirmed, true);
  assert.equal(result.attemptsBefore, 0);
  assert.equal(result.attemptsAfter, 12);
  assert.equal(fake.state.record.utcDay, "2026-07-14");
  assert.equal(fake.state.record.attempts, 12);
});

test("a repeated reservation id is idempotent and cannot double-count", async () => {
  const now = new Date("2026-07-13T18:00:00Z");
  const fake = createFakeGitHub();
  seedDurableRecord(fake);
  const store = quotaStore(fake, now, "run-102:1");
  const first = await store.reserveBatch({ size: 12, minimumAttempts: 0 });
  const second = await store.reserveBatch({ size: 12, minimumAttempts: 0 });

  assert.equal(first.attempts, 12);
  assert.equal(second.attempts, 12);
  assert.equal(fake.state.record.attempts, 12);
  assert.equal(fake.state.record.reservations.length, 1);
  assert.equal(fake.state.writes, 1);
});

test("a compare-and-swap conflict re-reads the higher count before reserving", async () => {
  const now = new Date("2026-07-13T18:00:00Z");
  const fake = createFakeGitHub({ conflictOnce: true });
  const result = await quotaStore(fake, now, "run-103:1").reserveBatch({
    size: 12,
    minimumAttempts: 0,
  });

  assert.equal(result.attemptsBefore, 12);
  assert.equal(result.attemptsAfter, 24);
  assert.equal(fake.state.record.attempts, 24);
  assert.deepEqual(fake.state.record.reservations.map(({ id }) => id), ["competing-run:1", "run-103:1"]);
});

test("a write that cannot be read back is never returned as a usable reservation", async () => {
  const now = new Date("2026-07-13T18:00:00Z");
  const fake = createFakeGitHub({ hideConfirmationOnce: true });
  seedDurableRecord(fake);
  await assert.rejects(
    quotaStore(fake, now, "run-103b:1").reserveBatch({ size: 12, minimumAttempts: 0 }),
    { code: "durable-quota-write-unconfirmed" },
  );
  assert.equal(fake.state.record.attempts, 12);
  assert.equal(fake.state.writes, 1);
});

test("a missing durable file fails closed even when a local baseline is supplied", async () => {
  const now = new Date("2026-07-13T18:00:00Z");
  const fake = createFakeGitHub();
  await assert.rejects(
    quotaStore(fake, now, "run-104:1").reserveBatch({ size: 12, minimumAttempts: 0 }),
    { code: "durable-quota-bootstrap-quarantined" },
  );
  assert.equal(fake.state.writes, 1);
  assert.equal(fake.state.record.attempts, 300);
});

test("pipeline publishes the confirmed 300-call quarantine and makes no forecast call", async (t) => {
  const now = new Date("2026-07-13T18:00:00Z");
  const { rootDir, paths } = await temporaryRoot(new Date("2026-07-13T15:00:00Z"));
  t.after(() => removeRoot(rootDir));
  await seedPrivateLedger(paths, now, 0);
  const status = await readJson(paths.statusPath);
  status.quota = await readJson(paths.quotaLedgerPath);
  await writeJsonAtomic(paths.statusPath, status);
  const fake = createFakeGitHub();
  let calls = 0;
  const result = await runWeatherUpdate({
    rootDir,
    now: () => now,
    apiKey: "unit-test-placeholder",
    requireDurableQuota: true,
    durableQuotaStore: quotaStore(fake, now, "run-105:1"),
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => fixture };
    },
  });
  assert.equal(result.outcome, "durable-quota-bootstrap-quarantined");
  assert.equal(calls, 0);
  assert.equal((await readJson(paths.quotaLedgerPath)).attempts, 300);
  const deployedStatus = await readJson(paths.statusPath);
  assert.equal(deployedStatus.quota.attempts, 300);
  assert.equal(deployedStatus.quota.safe, false);
});

test("durable state survives a failed request and complete local cache loss", async (t) => {
  const now = new Date("2026-07-13T18:00:00Z");
  const { rootDir, paths } = await temporaryRoot(new Date("2026-07-13T15:00:00Z"));
  t.after(() => removeRoot(rootDir));
  await seedPrivateLedger(paths, now, 0);
  const status = await readJson(paths.statusPath);
  status.quota = await readJson(paths.quotaLedgerPath);
  await writeJsonAtomic(paths.statusPath, status);
  const fake = createFakeGitHub();
  seedDurableRecord(fake);
  let upstreamCalls = 0;

  const first = await runWeatherUpdate({
    rootDir,
    now: () => now,
    apiKey: "unit-test-placeholder",
    requireDurableQuota: true,
    durableQuotaStore: quotaStore(fake, now, "run-201:1"),
    fetchImpl: async () => {
      upstreamCalls += 1;
      throw new Error("simulated runner crash boundary");
    },
  });
  assert.equal(first.outcome, "request-failed");
  assert.equal(fake.state.record.attempts, 12);

  await Promise.all([
    fs.rm(paths.quotaLedgerPath, { force: true }),
    fs.rm(paths.statusPath, { force: true }),
  ]);
  const second = await runWeatherUpdate({
    rootDir,
    now: () => now,
    apiKey: "unit-test-placeholder",
    requireDurableQuota: true,
    durableQuotaStore: quotaStore(fake, now, "run-202:1"),
    fetchImpl: async () => {
      upstreamCalls += 1;
      throw new Error("offline after cache loss");
    },
  });

  assert.equal(second.outcome, "request-failed");
  assert.equal(upstreamCalls, 2);
  assert.equal(fake.state.record.attempts, 24);
  assert.equal((await readJson(paths.quotaLedgerPath)).attempts, 24);
  assert.equal((await readJson(paths.statusPath)).quota.reservedCallsThisRun, 12);
});

test("durable exhaustion stops before any upstream request", async (t) => {
  const now = new Date("2026-07-13T18:00:00Z");
  const { rootDir, paths } = await temporaryRoot(new Date("2026-07-13T15:00:00Z"));
  t.after(() => removeRoot(rootDir));
  await seedPrivateLedger(paths, now, 0);
  const status = await readJson(paths.statusPath);
  status.quota = await readJson(paths.quotaLedgerPath);
  await writeJsonAtomic(paths.statusPath, status);
  const fake = createFakeGitHub();
  seedDurableRecord(fake, { attempts: 299 });
  let calls = 0;
  const result = await runWeatherUpdate({
    rootDir,
    now: () => now,
    apiKey: "unit-test-placeholder",
    requireDurableQuota: true,
    durableQuotaStore: quotaStore(fake, now, "run-203:1"),
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => fixture };
    },
  });
  assert.equal(result.outcome, "durable-quota-exhausted");
  assert.equal(calls, 0);
  assert.equal(fake.state.record.attempts, 299);
});

test("deployment requires durable quota and persists its private snapshot only after Pages succeeds", async () => {
  const workflow = await fs.readFile(workflowUrl, "utf8");
  const refreshIndex = workflow.indexOf("Refresh hourly forecast data");
  const recheckIndex = workflow.indexOf("Recheck the final static artifact and data");
  const snapshotIndex = workflow.indexOf("Mark and snapshot the verified deployment candidate");
  const stageIndex = workflow.indexOf("Stage the public Pages artifact");
  const deployIndex = workflow.indexOf("- name: Deploy to GitHub Pages");
  const cacheSaveIndex = workflow.indexOf("Persist the successfully deployed private snapshot");
  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /WEATHERCHART_REQUIRE_DURABLE_QUOTA:\s*['"]true['"]/);
  assert.match(workflow, /WEATHERCHART_QUOTA_TOKEN:\s*\$\{\{ github\.token \}\}/);
  assert.ok(refreshIndex > 0 && deployIndex > refreshIndex);
  assert.ok(recheckIndex > refreshIndex);
  assert.ok(snapshotIndex > recheckIndex && stageIndex > snapshotIndex);
  assert.ok(cacheSaveIndex > deployIndex);
  assert.doesNotMatch(workflow.slice(0, deployIndex), /actions\/cache\/save/);
  assert.match(workflow, /--exclude='\.weatherchart-state\/'/);
  assert.doesNotMatch(workflow.slice(cacheSaveIndex), /if:\s*always\(\)/);
});
