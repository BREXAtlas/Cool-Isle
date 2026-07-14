import {
  CRITICAL_STALE_AFTER_MS,
  DATA_FILES,
  STALE_AFTER_MS,
  dataUrl
} from './config.js';

const memoryCache = new Map();

function validateRoot(name, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} did not contain a JSON object.`);
  }
  if (name === 'forecast' && !Array.isArray(value.locations)) {
    throw new TypeError('Forecast data has no locations list.');
  }
  if (name === 'warnings' && !Array.isArray(value.warnings)) {
    throw new TypeError('Warning data has no warnings list.');
  }
  if (['news', 'community'].includes(name) && !Array.isArray(value.items)) {
    throw new TypeError(`${name} data has no items list.`);
  }
  return value;
}

export async function fetchJson(name, { timeoutMs = 8000, cacheBust = true } = {}) {
  const path = DATA_FILES[name];
  if (!path) throw new Error(`Unknown data file: ${name}`);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(dataUrl(path, cacheBust), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${name} returned HTTP ${response.status}.`);
    const value = validateRoot(name, await response.json());
    memoryCache.set(name, value);
    return { value, fromMemory: false, error: null };
  } catch (error) {
    if (memoryCache.has(name)) {
      return { value: memoryCache.get(name), fromMemory: true, error };
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadDataBundle() {
  const names = Object.keys(DATA_FILES);
  const settled = await Promise.allSettled(names.map((name) => fetchJson(name)));
  const bundle = {};
  const failures = [];
  const memoryFallbacks = [];

  settled.forEach((result, index) => {
    const name = names[index];
    if (result.status === 'fulfilled') {
      bundle[name] = result.value.value;
      if (result.value.fromMemory) memoryFallbacks.push(name);
    } else {
      failures.push({ name, error: result.reason });
    }
  });

  if (!bundle.forecast) {
    const detail = failures.map(({ name }) => name).join(', ');
    throw new Error(`No valid forecast data could be loaded${detail ? ` (${detail})` : ''}.`);
  }

  return { bundle, failures, memoryFallbacks, checkedAt: new Date() };
}

export function getFreshness(generatedAt, isSample = false) {
  if (generatedAt === null || generatedAt === undefined || generatedAt === '') {
    return { state: 'unknown', label: 'Update time unavailable', ageMs: Infinity };
  }
  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) {
    return { state: 'unknown', label: 'Update time unavailable', ageMs: Infinity };
  }
  const ageMs = Math.max(0, Date.now() - generated.getTime());
  const hours = Math.floor(ageMs / 3600000);
  const minutes = Math.floor(ageMs / 60000);

  if (ageMs >= CRITICAL_STALE_AFTER_MS) {
    return { state: 'critical', label: `Data is over six hours old (${hours}h)`, ageMs };
  }
  if (ageMs >= STALE_AFTER_MS) {
    return { state: 'stale', label: `Data is stale (${hours}h old)`, ageMs };
  }
  if (isSample) {
    return { state: 'sample', label: `Sample file checked ${minutes} min ago`, ageMs };
  }
  return { state: 'fresh', label: `Updated ${minutes} min ago`, ageMs };
}

export function hasCachedBundle() {
  return memoryCache.has('forecast');
}
