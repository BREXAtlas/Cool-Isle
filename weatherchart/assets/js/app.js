import { configureDeploymentLinks, formatUkDateTime, REFRESH_INTERVAL_MS } from './config.js';
import { announce, initialiseMotionAndVisibility, initialiseNavigation } from './accessibility.js';
import { getFreshness, loadDataBundle } from './api.js';
import {
  findLocation,
  renderCurrentLocation,
  renderDaily,
  renderInterpretations,
  renderLocationTable,
  renderNationalSummary
} from './forecast.js';
import { renderHourlyChart } from './charts.js';
import { initialiseLocationSearch } from './location-search.js';
import { hasSeriousLiveWarning, renderWarnings } from './warnings.js';
import { initialiseNews } from './news.js';
import { initialiseCommunity } from './community.js';
import { initialiseWeatherMap } from './map.js';

configureDeploymentLinks();
initialiseNavigation();
initialiseMotionAndVisibility();

const page = document.documentElement.dataset.page || 'home';
let lastSuccessfulCheck = 0;
let selectedLocationId = null;
let loading = false;
let searchController = null;
let mapController = null;
let latestLocationState = null;

function text(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function updateSeriousWarningMode(active) {
  document.body.dataset.seriousWarning = String(Boolean(active));
}

function forecastIsPreserved(status) {
  return /preserved|failed|fallback/i.test(String(status?.forecastState || ''))
    || (status?.failedSources || []).includes('met-office-global-spot-hourly');
}

function warningsWithStatus(data, status, clientRefreshFailed = false) {
  const sourceFailed = clientRefreshFailed || (status?.failedSources || []).includes('met-office-warnings-rss');
  const unavailable = Boolean(data?.unavailable || sourceFailed);
  return { ...(data || {}), unavailable, preserved: sourceFailed && data?.sample === false };
}

function updateDataMode(data, kind = 'forecast', status = null) {
  const sample = Boolean(data?.sample);
  const preserved = kind === 'forecast' && !sample && forecastIsPreserved(status);
  document.body.dataset.dataMode = sample ? 'sample' : preserved ? 'preserved' : 'live';
  text('[data-mode-badge]', sample ? 'Sample mode' : preserved ? 'Last valid data' : 'Live data');
  const liveCopies = {
    forecast: 'Forecast data is source-labelled and time-stamped. Always check current official warnings before making decisions.',
    news: 'Source-linked weather news. Read the original publisher page for complete and current information.',
    community: 'Public weather chatter—not a verified observation. Use the official forecast and warnings for decisions.'
  };
  const sampleCopies = {
    forecast: 'Illustrative data — not live weather. Check official sources before making decisions.',
    news: 'No invented sample stories are shipped — use the direct official source until validated feed items are available.',
    community: 'Synthetic community cards — no social API or live public post is loaded in your browser.'
  };
  text('[data-mode-copy]', sample
    ? sampleCopies[kind]
    : preserved
      ? 'The latest forecast refresh failed. The last validated forecast remains visible and must be checked against the official service.'
      : liveCopies[kind]);
  document.querySelectorAll('[data-sample-only]').forEach((element) => {
    element.hidden = !sample;
  });
  document.querySelectorAll('[data-live-only]').forEach((element) => {
    element.hidden = sample;
  });
  text('[data-generated-label]', sample ? 'Sample generated' : 'Data generated');
  text('[data-selected-location-label]', sample ? 'Your selected sample location' : 'Your selected forecast location');
  text('[data-observed-label]', sample ? 'Sample time:' : 'Forecast time:');
  text('[data-refresh-label]', sample ? 'Check the sample file again' : 'Check for the latest update');
  const sampleFooters = {
    forecast: 'Sample data shown for interface demonstration only. Do not use it for safety-critical decisions.',
    news: 'The sample news dataset is intentionally empty rather than inventing source titles or summaries.',
    community: 'Synthetic community data is shown for interface demonstration only.'
  };
  const liveFooters = {
    forecast: 'Weather data remains subject to source times, provider limitations and current official warnings.',
    news: 'Summaries are brief editorial context; follow direct links for the complete source.',
    community: 'Public chatter is unverified, coarsely located and secondary to official forecasts and warnings.'
  };
  text('[data-footer-mode-copy]', sample ? sampleFooters[kind] : liveFooters[kind]);
  document.querySelector('[data-metrics]')?.setAttribute('aria-label', sample ? 'Current sample conditions' : 'Current forecast conditions');
  document.querySelector('[data-hourly-chart]')?.closest('.chart-scroll')?.setAttribute('aria-label', sample ? 'Scrollable 24-hour sample weather chart' : 'Scrollable 24-hour weather chart');
}

function updateWarningMode(data) {
  const sample = Boolean(data?.sample);
  const count = Array.isArray(data?.warnings) ? data.warnings.length : 0;
  if (data?.unavailable) {
    text('[data-warning-note-title]', 'Warning data could not be refreshed.');
    text('[data-warning-note-copy]', 'Do not assume there are no warnings—check and follow the current official Met Office warning service.');
  } else if (sample) {
    text('[data-warning-note-title]', count ? 'These cards are illustrative, not active warnings.' : 'No invented warning cards are included in this sample.');
    text('[data-warning-note-copy]', 'Always check and follow current official Met Office warnings and emergency guidance.');
  } else if (count) {
    text('[data-warning-note-title]', `${count} official warning feed ${count === 1 ? 'item is' : 'items are'} shown below.`);
    text('[data-warning-note-copy]', 'Read each full official warning for timing, affected area, impacts and guidance.');
  } else {
    text('[data-warning-note-title]', 'The loaded official feed reports no active warning items.');
    text('[data-warning-note-copy]', 'Feed status can change; confirm on the current official warnings page.');
  }
}

function displayStatus(forecast, status) {
  const generatedAt = forecast.generatedAt || status?.generatedAt;
  const freshness = getFreshness(generatedAt, Boolean(forecast.sample));
  text('[data-freshness-label]', freshness.label);
  text('[data-generated-at]', formatUkDateTime(generatedAt));
  text('[data-next-check]', status?.nextCheckAt ? formatUkDateTime(status.nextCheckAt) : 'about one hour after a successful update');

  if (!forecast.sample && forecastIsPreserved(status)) {
    text('[data-freshness-label]', `Refresh failed — ${freshness.label.toLowerCase()}`);
    announce('The latest forecast refresh failed. Last validated data remains visible; check the current official service.', 'stale');
  } else if (freshness.state === 'unknown') {
    announce('The update time is unavailable. Do not rely on freshness; check the official service.', 'stale');
  } else if (freshness.state === 'critical') {
    announce(`${freshness.label}. Do not rely on this display; check the official service.`, 'error');
  } else if (freshness.state === 'stale') {
    announce(`${freshness.label}. The last valid ${forecast.sample ? 'sample' : 'dataset'} remains visible while you check the official service.`, 'stale');
  } else if (forecast.sample) {
    announce('Showing explicitly labelled synthetic sample data. No live forecast API was called.', 'ready');
  } else {
    announce('Weather data loaded successfully.', 'ready');
  }
  return freshness;
}

function renderSelectedLocation(location, forecast, seriousWarning) {
  selectedLocationId = location.id;
  const sample = Boolean(forecast.sample);
  renderCurrentLocation(location, forecast.source || {}, { sample });
  renderInterpretations(location, { suppressHumour: seriousWarning });
  renderHourlyChart(location, { sample });
  renderDaily(location, { sample });
}

async function loadHome({ announceLoading = true } = {}) {
  if (loading) return;
  loading = true;
  if (announceLoading) announce('Checking the local WeatherChart data files…');
  const refreshButton = document.querySelector('[data-refresh]');
  if (refreshButton) refreshButton.disabled = true;
  try {
    const { bundle, failures, memoryFallbacks } = await loadDataBundle();
    const forecast = bundle.forecast;
    const effectiveStatus = memoryFallbacks.includes('forecast')
      ? { ...bundle.status, forecastState: 'client-memory-preserved' }
      : bundle.status;
    const warningClientFailure = memoryFallbacks.includes('warnings')
      || failures.some(({ name }) => name === 'warnings');
    const warningData = warningsWithStatus(
      bundle.warnings || { sample: Boolean(forecast.sample), unavailable: true, warnings: [] },
      effectiveStatus,
      warningClientFailure
    );
    const newsData = bundle.news || { sample: true, items: [] };
    const communityData = bundle.community || { sample: true, items: [] };
    const seriousWarning = hasSeriousLiveWarning(warningData);
    updateSeriousWarningMode(seriousWarning);
    const locations = forecast.locations || [];
    updateDataMode(forecast, 'forecast', effectiveStatus);
    updateWarningMode(warningData);
    displayStatus(forecast, effectiveStatus);
    renderNationalSummary(forecast, warningData);
    renderWarnings(warningData);
    renderLocationTable(locations, { sample: Boolean(forecast.sample) });

    const queryLocation = new URL(window.location.href).searchParams.get('location');
    const selected = findLocation(locations, selectedLocationId || queryLocation || 'london');
    if (selected) renderSelectedLocation(selected, forecast, seriousWarning);

    latestLocationState = { forecast, seriousWarning };
    const selectLatest = (location) => {
      const latest = findLocation(latestLocationState.forecast.locations, location.id);
      if (latest) renderSelectedLocation(latest, latestLocationState.forecast, latestLocationState.seriousWarning);
    };
    if (!searchController) searchController = initialiseLocationSearch(locations, selectLatest, { sample: Boolean(forecast.sample) });
    else searchController.update(locations, selectLatest, { sample: Boolean(forecast.sample) });

    initialiseNews(newsData, { limit: 3 });
    initialiseCommunity(communityData, locations, { limit: 3, seriousWarning });
    const mapData = {
      locations,
      warnings: warningData.unavailable ? [] : warningData.warnings || [],
      community: communityData.items || [],
      forecastSample: Boolean(forecast.sample),
      warningSample: Boolean(warningData.sample),
      warningUnavailable: Boolean(warningData.unavailable),
      communitySample: Boolean(communityData.sample)
    };
    if (!mapController) mapController = initialiseWeatherMap(mapData);
    else mapController.updateData(mapData);

    if (failures.length || memoryFallbacks.length) {
      const names = [...failures.map(({ name }) => name), ...memoryFallbacks];
      announce(`The last valid display was kept because ${[...new Set(names)].join(', ')} could not be refreshed.`, 'stale');
    }
    lastSuccessfulCheck = Date.now();
  } catch (error) {
    announce(`WeatherChart could not load a valid forecast file. The page remains available, but use the official Met Office service for current information.`, 'error');
    console.error('WeatherChart data loading failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    loading = false;
    if (refreshButton) refreshButton.disabled = false;
  }
}

async function loadLocationPage() {
  if (loading) return;
  loading = true;
  try {
    const { bundle } = await loadDataBundle();
    const locations = bundle.forecast.locations || [];
    const seriousWarning = hasSeriousLiveWarning(bundle.warnings);
    updateSeriousWarningMode(seriousWarning);
    const queryLocation = new URL(window.location.href).searchParams.get('location');
    const selected = findLocation(locations, queryLocation || 'london');
    updateDataMode(bundle.forecast, 'forecast', bundle.status);
    if (selected) renderSelectedLocation(selected, bundle.forecast, seriousWarning);
    latestLocationState = { forecast: bundle.forecast, seriousWarning };
    const selectLatest = (location) => {
      const latest = findLocation(latestLocationState.forecast.locations, location.id);
      if (latest) renderSelectedLocation(latest, latestLocationState.forecast, latestLocationState.seriousWarning);
    };
    if (!searchController) searchController = initialiseLocationSearch(locations, selectLatest, { sample: Boolean(bundle.forecast.sample) });
    else searchController.update(locations, selectLatest, { sample: Boolean(bundle.forecast.sample) });
    renderLocationTable(locations, { sample: Boolean(bundle.forecast.sample) });
    displayStatus(bundle.forecast, bundle.status);
    lastSuccessfulCheck = Date.now();
  } catch (error) {
    announce('The location data file could not be loaded. Use current official sources for weather decisions.', 'error');
  } finally {
    loading = false;
  }
}

async function loadNewsPage() {
  if (loading) return;
  loading = true;
  try {
    const { bundle } = await loadDataBundle();
    const newsData = bundle.news || { sample: true, items: [] };
    updateSeriousWarningMode(hasSeriousLiveWarning(bundle.warnings));
    updateDataMode(newsData, 'news', bundle.status);
    initialiseNews(newsData);
    displayStatus(bundle.forecast, bundle.status);
    lastSuccessfulCheck = Date.now();
  } catch {
    announce('The news archive could not be loaded. Follow the direct Met Office news link instead.', 'error');
  } finally {
    loading = false;
  }
}

async function loadCommunityPage() {
  if (loading) return;
  loading = true;
  try {
    const { bundle } = await loadDataBundle();
    const communityData = bundle.community || { sample: true, items: [] };
    updateSeriousWarningMode(hasSeriousLiveWarning(bundle.warnings));
    updateDataMode(communityData, 'community', bundle.status);
    initialiseCommunity(communityData, bundle.forecast.locations || [], {
      seriousWarning: hasSeriousLiveWarning(bundle.warnings)
    });
    displayStatus(bundle.forecast, bundle.status);
    lastSuccessfulCheck = Date.now();
  } catch {
    announce('The community cards could not be loaded. Use the official forecast and warnings for decisions.', 'error');
  } finally {
    loading = false;
  }
}

function scheduleRefresh(loader) {
  window.setInterval(() => loader(), REFRESH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastSuccessfulCheck >= REFRESH_INTERVAL_MS) loader();
  });
}

if (page === 'home') {
  loadHome();
  document.querySelector('[data-refresh]')?.addEventListener('click', () => loadHome());
  window.setInterval(() => loadHome({ announceLoading: false }), REFRESH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastSuccessfulCheck >= REFRESH_INTERVAL_MS) loadHome({ announceLoading: false });
  });
} else if (page === 'location') {
  loadLocationPage();
  scheduleRefresh(loadLocationPage);
} else if (page === 'news') {
  loadNewsPage();
  scheduleRefresh(loadNewsPage);
} else if (page === 'community') {
  loadCommunityPage();
  scheduleRefresh(loadCommunityPage);
}
