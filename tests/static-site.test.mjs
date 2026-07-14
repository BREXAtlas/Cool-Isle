import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WEATHERCHART = path.join(ROOT, "weatherchart");
const PREVIEW_BASE = new URL("https://brexatlas.github.io/Cool-Isle/weatherchart/");
const PRODUCTION_BASE = new URL("https://weatherchart.uk/");
const COOL_ISLE_BASE = "https://brexatlas.github.io/Cool-Isle/";
const SOCIAL_IMAGE = PREVIEW_BASE.href + "assets/images/weatherchart-social.png";
const WEATHERCHART_PAGE_NAMES = [
  "404.html",
  "community.html",
  "explainers.html",
  "index.html",
  "location.html",
  "news.html",
  "privacy.html",
  "sources.html",
];
const ROOT_PAGE_NAMES = ["index.html", "blog.html", "winter.html"];

async function read(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, predicate) {
  const output = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(absolute, predicate));
    else if (predicate(absolute)) output.push(absolute);
  }
  return output;
}

function getAttribute(tag, name) {
  const escaped = name.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp("(?:^|[\\s<])" + escaped + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return match ? match[1] ?? match[2] ?? match[3] : null;
}

function hasAttribute(tag, name) {
  const escaped = name.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  return new RegExp("(?:^|[\\s<])" + escaped + "(?:\\s|=|>)", "i").test(tag);
}

function htmlTags(html) {
  const withoutScriptBodies = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>");
  return withoutScriptBodies.match(/<(?:a|link|script|img|source|form|video|use)\b[^>]*>/gi) ?? [];
}

function referenceEntries(html) {
  const entries = [];
  for (const tag of htmlTags(html)) {
    for (const attribute of ["href", "src", "action", "poster", "srcset"]) {
      const value = getAttribute(tag, attribute);
      if (!value) continue;
      const values = attribute === "srcset"
        ? value.split(",").map((part) => part.trim().split(/\s+/)[0]).filter(Boolean)
        : [value];
      for (const reference of values) entries.push({ tag, attribute, reference });
    }
  }
  return entries;
}

function isExternal(reference) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference);
}

async function resolveLocalReference(fromFile, reference) {
  const pathPart = reference.split(/[?#]/, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {
    assert.fail(path.relative(ROOT, fromFile) + " contains a malformed URL escape: " + reference);
  }
  let target = decoded
    ? decoded.startsWith("/")
      ? path.join(ROOT, decoded.slice(1))
      : path.resolve(path.dirname(fromFile), decoded)
    : fromFile;
  assert.ok(
    target === ROOT || target.startsWith(ROOT + path.sep),
    path.relative(ROOT, fromFile) + " escapes the repository root: " + reference,
  );
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) target = path.join(target, "index.html");
  } catch {
    // The assertion below reports the useful source and target.
  }
  assert.equal(
    await exists(target),
    true,
    path.relative(ROOT, fromFile) + " points to missing local file " + path.relative(ROOT, target) + " via " + reference,
  );
  return target;
}

function idsIn(html) {
  return [...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
}

function metaContent(html, attribute, value) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((getAttribute(tag, attribute) ?? "").toLowerCase() === value.toLowerCase()) {
      return getAttribute(tag, "content");
    }
  }
  return null;
}

function directiveMap(policy) {
  return new Map(policy.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...sources] = part.split(/\s+/);
    return [name, sources];
  }));
}

async function deployedFileFor(url, mode) {
  let target;
  if (mode === "preview") {
    assert.equal(url.origin, PREVIEW_BASE.origin);
    assert.ok(url.pathname.startsWith("/Cool-Isle/"), "Preview URL escaped /Cool-Isle/: " + url.href);
    target = path.join(ROOT, decodeURIComponent(url.pathname.slice("/Cool-Isle/".length)));
  } else {
    assert.equal(url.origin, PRODUCTION_BASE.origin);
    target = path.join(WEATHERCHART, decodeURIComponent(url.pathname.slice(1)));
  }
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) target = path.join(target, "index.html");
  } catch {
    // The assertion below identifies the unresolved deployment URL.
  }
  assert.equal(await exists(target), true, mode + " deployment URL has no local artifact: " + url.href);
  return target;
}

test("all local HTML links, fragments and static assets resolve", async () => {
  const pageFiles = [
    ...ROOT_PAGE_NAMES.map((name) => path.join(ROOT, name)),
    ...WEATHERCHART_PAGE_NAMES.map((name) => path.join(WEATHERCHART, name)),
  ];
  for (const pageFile of pageFiles) {
    const html = await read(pageFile);
    for (const { reference } of referenceEntries(html)) {
      assert.doesNotMatch(reference, /^(?:javascript|vbscript):/i, "Unsafe URL scheme in " + path.relative(ROOT, pageFile));
      if (isExternal(reference)) continue;
      const target = await resolveLocalReference(pageFile, reference);
      const fragmentIndex = reference.indexOf("#");
      const fragment = fragmentIndex >= 0 ? decodeURIComponent(reference.slice(fragmentIndex + 1)) : "";
      if (fragment && path.extname(target).toLowerCase() === ".html") {
        const targetIds = new Set(idsIn(await read(target)));
        assert.ok(
          targetIds.has(fragment),
          path.relative(ROOT, pageFile) + " links to missing #" + fragment + " in " + path.relative(ROOT, target),
        );
      }
    }
  }
});

test("module imports, CSS URLs, manifest assets and generated data files resolve", async () => {
  const jsFiles = await walk(path.join(WEATHERCHART, "assets", "js"), (file) => file.endsWith(".js"));
  for (const jsFile of jsFiles) {
    const source = await read(jsFile);
    const imports = [
      ...[...source.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]),
      ...[...source.matchAll(/\bimport\s*["']([^"']+)["']/g)].map((match) => match[1]),
      ...[...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']/g)].map((match) => match[1]),
    ];
    for (const specifier of new Set(imports)) {
      assert.ok(specifier.startsWith("."), "Browser module uses a bare package import: " + specifier);
      assert.equal(await exists(path.resolve(path.dirname(jsFile), specifier)), true, "Missing module " + specifier);
    }
  }

  const cssFiles = await walk(path.join(WEATHERCHART, "assets", "css"), (file) => file.endsWith(".css"));
  for (const cssFile of cssFiles) {
    const css = await read(cssFile);
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      if (!isExternal(match[1]) && !match[1].startsWith("data:")) {
        await resolveLocalReference(cssFile, match[1]);
      }
    }
  }

  const manifestPath = path.join(WEATHERCHART, "manifest.webmanifest");
  const manifest = JSON.parse(await read(manifestPath));
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  for (const icon of manifest.icons ?? []) await resolveLocalReference(manifestPath, icon.src);

  for (const fileName of ["forecast.json", "warnings.json", "news.json", "community.json", "status.json"]) {
    assert.equal(await exists(path.join(WEATHERCHART, "data", fileName)), true, "Missing generated data contract " + fileName);
  }
});

test("HTML IDs are unique and served text contains no common mojibake markers", async () => {
  const htmlFiles = [
    ...ROOT_PAGE_NAMES.map((name) => path.join(ROOT, name)),
    ...WEATHERCHART_PAGE_NAMES.map((name) => path.join(WEATHERCHART, name)),
  ];
  for (const htmlFile of htmlFiles) {
    const ids = idsIn(await read(htmlFile));
    assert.equal(new Set(ids).size, ids.length, path.relative(ROOT, htmlFile) + " contains duplicate IDs");
  }

  const textExtensions = new Set([".html", ".css", ".js", ".json", ".xml", ".txt", ".webmanifest", ".svg"]);
  const servedTextFiles = [
    ...htmlFiles,
    path.join(ROOT, "robots.txt"),
    path.join(ROOT, "sitemap.xml"),
    ...await walk(WEATHERCHART, (file) => textExtensions.has(path.extname(file).toLowerCase())),
  ];
  const mojibake = /\uFFFD|ï¿½|Ã|Â|â(?:€|€™|€“|€”|†|€¦)/;
  for (const filePath of new Set(servedTextFiles)) {
    assert.doesNotMatch(await read(filePath), mojibake, path.relative(ROOT, filePath) + " contains likely mojibake");
  }
});

test("Cool Isle and every WeatherChart page expose a clear two-way link", async () => {
  const coolIsleHome = await read(path.join(ROOT, "index.html"));
  const outbound = [...coolIsleHome.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].find((match) => {
    return getAttribute("<a " + match[1] + ">", "href") === "weatherchart/";
  });
  assert.ok(outbound, "Cool Isle home lacks a direct WeatherChart link");
  assert.match(outbound[2].replace(/<[^>]+>/g, " "), /WeatherChart UK/i);

  for (const pageName of WEATHERCHART_PAGE_NAMES) {
    const html = await read(path.join(WEATHERCHART, pageName));
    const backLink = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].find((match) => {
      return hasAttribute("<a " + match[1] + ">", "data-cool-isle-link");
    });
    assert.ok(backLink, pageName + " lacks a Cool Isle return link");
    assert.match(backLink[2].replace(/<[^>]+>/g, " "), /Cool Isle/i);
    assert.equal(getAttribute("<a " + backLink[1] + ">", "href"), "../index.html");
  }

  const deploymentConfig = await read(path.join(WEATHERCHART, "assets", "js", "config.js"));
  assert.match(deploymentConfig, new RegExp("coolIsleBase:\\s*['\"]" + COOL_ISLE_BASE.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&")));
  assert.match(deploymentConfig, /data-cool-isle-link/);
});

test("Cool Isle commerce cards use disclosed external seller destinations", async () => {
  const home = await read(path.join(ROOT, "index.html"));
  const winter = await read(path.join(ROOT, "winter.html"));
  const commerceSource = home + "\n" + winter;

  assert.doesNotMatch(commerceSource, /Add to basket|Join (?:the )?(?:winter )?list/i);
  assert.doesNotMatch(home, /buyUrl\s*:\s*["']#["']/i);
  assert.match(home, /Cool Isle does not sell products or process checkout/i);
  assert.match(winter, /Cool Isle does not sell products or process checkout/i);

  const productsBlock = home.match(/const PRODUCTS = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const productUrls = [...productsBlock.matchAll(/buyUrl\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(productUrls.length, 16, "Every Cool Isle product card needs one seller destination");
  const allowedHosts = new Set([
    "probreeze.com",
    "www.appliancesdirect.co.uk",
    "www.argos.co.uk",
    "www.currys.co.uk",
    "www.decathlon.co.uk",
    "www.diy.com",
    "www.drysure.co.uk",
    "www.dunelm.com",
    "www.meaco.com",
  ]);
  for (const destination of productUrls) {
    const url = new URL(destination);
    assert.equal(url.protocol, "https:", "Commerce destination must use HTTPS: " + destination);
    assert.equal(allowedHosts.has(url.hostname), true, "Unexpected commerce host: " + url.hostname);
    assert.equal(url.search, "", "Commerce destination contains a query or affiliate parameter: " + destination);
  }

  assert.match(home, /<a class="buy" href="\$\{p\.buyUrl\}" target="_blank" rel="noopener noreferrer nofollow"/);
  const winterCards = winter.match(/<div class="kit">([\s\S]*?)<\/div>\s*<p class="note">/)?.[1] ?? "";
  const winterLinks = winterCards.match(/<a\b[^>]*>/gi) ?? [];
  assert.equal(winterLinks.length, 4, "Winter page should expose four honest seller links");
  for (const tag of winterLinks) {
    assert.match(getAttribute(tag, "href") ?? "", /^https:\/\//);
    assert.equal(getAttribute(tag, "target"), "_blank");
    assert.equal(getAttribute(tag, "rel"), "noopener noreferrer nofollow");
  }
});

test("community surfaces publish attributed live posts only and start hidden when empty", async () => {
  const communityData = JSON.parse(await read(path.join(WEATHERCHART, "data", "community.json")));
  const communityPage = await read(path.join(WEATHERCHART, "community.html"));
  const weatherHome = await read(path.join(WEATHERCHART, "index.html"));
  const communityClient = await read(path.join(WEATHERCHART, "assets", "js", "community.js"));

  assert.equal(communityData.sample, false);
  assert.ok(["live-public-posts", "preserved-live", "no-current-posts"].includes(communityData.datasetState));
  assert.equal(communityData.source?.scrapingUsed, false);
  assert.doesNotMatch(JSON.stringify(communityData), /sample-community|demo contributor|synthetic report/i);
  for (const item of communityData.items) {
    assert.ok(item.platform && item.author && item.sourceName && item.sourceHost && item.publishedAt);
    assert.match(item.url, /^https:\/\//);
    assert.equal(item.familySafe, true);
    assert.equal(item.location?.latitude, null);
    assert.equal(item.location?.longitude, null);
  }
  assert.match(communityPage, /Checking current public posts/);
  assert.match(communityPage, /data-community-section hidden/);
  assert.match(weatherHome, /data-community-section hidden/);
  assert.match(communityClient, /View original on/);
});

test("WeatherChart metadata, CSP and WebSite structured data are complete", async () => {
  const titles = new Set();
  const canonicalUrls = new Set();
  for (const pageName of WEATHERCHART_PAGE_NAMES) {
    const html = await read(path.join(WEATHERCHART, pageName));
    assert.match(html, /<meta\s+charset=["']utf-8["']/i, pageName + " lacks UTF-8 metadata");
    assert.ok(metaContent(html, "name", "viewport"), pageName + " lacks viewport metadata");
    assert.ok(metaContent(html, "name", "description"), pageName + " lacks a description");
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    assert.ok(title, pageName + " lacks a title");
    assert.equal(titles.has(title), false, "Duplicate page title: " + title);
    titles.add(title);

    const policy = metaContent(html, "http-equiv", "Content-Security-Policy");
    assert.ok(policy, pageName + " lacks a CSP");
    const directives = directiveMap(policy);
    assert.deepEqual(directives.get("default-src"), ["'self'"]);
    assert.deepEqual(directives.get("base-uri"), ["'self'"]);
    assert.deepEqual(directives.get("object-src"), ["'none'"]);
    assert.deepEqual(directives.get("frame-src"), ["'none'"]);
    assert.ok(directives.get("form-action")?.includes("https://github.com"));
    assert.ok(directives.get("script-src")?.includes("https://unpkg.com"));
    assert.ok(directives.get("connect-src")?.includes("https://api.postcodes.io"));
    assert.ok(directives.get("connect-src")?.includes("https://geocoding-api.open-meteo.com"));
    assert.ok(directives.get("img-src")?.includes("https://tile.openstreetmap.org"));
    assert.equal(directives.get("script-src")?.includes("'unsafe-inline'"), false);
    assert.equal(directives.get("script-src")?.includes("'unsafe-eval'"), false);
    assert.doesNotMatch(html, /<(?:iframe|frame|object|embed)\b/i);

    assert.equal(metaContent(html, "property", "og:image"), SOCIAL_IMAGE);
    assert.equal(metaContent(html, "name", "twitter:image"), SOCIAL_IMAGE);
    assert.ok(metaContent(html, "property", "og:image:alt"));
    assert.ok(metaContent(html, "name", "twitter:image:alt"));
    assert.equal(metaContent(html, "name", "twitter:card"), "summary_large_image");
    assert.ok(metaContent(html, "name", "twitter:title"));
    assert.ok(metaContent(html, "name", "twitter:description"));

    if (pageName === "404.html") {
      assert.match(metaContent(html, "name", "robots") ?? "", /noindex/i);
      continue;
    }
    const canonicalTag = (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i) ?? [])[0];
    const canonical = canonicalTag ? getAttribute(canonicalTag, "href") : null;
    const expectedCanonical = pageName === "index.html" ? PREVIEW_BASE.href : PREVIEW_BASE.href + pageName;
    assert.equal(canonical, expectedCanonical);
    assert.equal(canonicalUrls.has(canonical), false, "Duplicate canonical URL: " + canonical);
    canonicalUrls.add(canonical);
    assert.equal(metaContent(html, "property", "og:url"), canonical);
    assert.equal(metaContent(html, "property", "og:type"), "website");
    assert.equal(metaContent(html, "property", "og:locale"), "en_GB");
    assert.equal(metaContent(html, "property", "og:site_name"), "WeatherChart UK");
  }

  const imageUrl = new URL(SOCIAL_IMAGE);
  assert.equal(await exists(path.join(ROOT, decodeURIComponent(imageUrl.pathname.slice("/Cool-Isle/".length)))), true);

  const home = await read(path.join(WEATHERCHART, "index.html"));
  const structuredText = home.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i)?.[1];
  assert.ok(structuredText, "WeatherChart home lacks WebSite structured data");
  const structured = JSON.parse(structuredText);
  assert.equal(structured["@context"], "https://schema.org");
  assert.equal(structured["@type"], "WebSite");
  assert.equal(structured.name, "WeatherChart UK");
  assert.equal(structured.url, PREVIEW_BASE.href);
  assert.equal(structured.inLanguage, "en-GB");
  const hash = crypto.createHash("sha256").update(structuredText).digest("base64");
  const homePolicy = metaContent(home, "http-equiv", "Content-Security-Policy");
  assert.ok(homePolicy.includes("'sha256-" + hash + "'"), "CSP does not authorize the exact JSON-LD block");
});

test("Leaflet is integrity-pinned and lazy-loaded only when the map approaches view", async () => {
  const home = await read(path.join(WEATHERCHART, "index.html"));
  const mapModule = await read(path.join(WEATHERCHART, "assets", "js", "map.js"));
  assert.doesNotMatch(home, /<(?:link|script)\b[^>]*leaflet@/i, "Leaflet should not load eagerly from HTML");
  assert.match(mapModule, /leaflet@1\.9\.4\/dist\/leaflet\.css/);
  assert.match(mapModule, /sha256-p4NxAoJBhIIN\+hmNHrzRCf9tD\/miZyoHS5obTRR9BMY=/);
  assert.match(mapModule, /leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.match(mapModule, /sha256-20nQCchB9co0qIjJZRGuk2\/Z9VM\+kNiyxNV1lvTlZBo=/);
  assert.match(mapModule, /IntersectionObserver/);
  assert.match(mapModule, /loadLeaflet\(\)/);
});

test("WeatherChart-owned references resolve under preview and standalone deployment bases", async () => {
  for (const pageName of WEATHERCHART_PAGE_NAMES) {
    const html = await read(path.join(WEATHERCHART, pageName));
    for (const entry of referenceEntries(html)) {
      if (isExternal(entry.reference)) continue;
      const previewUrl = new URL(entry.reference, new URL(pageName, PREVIEW_BASE));
      await deployedFileFor(previewUrl, "preview");
      const isCoolIsleLink = hasAttribute(entry.tag, "data-cool-isle-link")
        || hasAttribute(entry.tag, "data-cool-isle-path");
      if (!isCoolIsleLink) {
        const productionUrl = new URL(entry.reference, new URL(pageName, PRODUCTION_BASE));
        await deployedFileFor(productionUrl, "production");
      }
    }
  }

  const config = await read(path.join(WEATHERCHART, "assets", "js", "config.js"));
  assert.match(config, /previewBase:\s*['"]https:\/\/brexatlas\.github\.io\/Cool-Isle\/weatherchart\/['"]/);
  assert.match(config, /productionBase:\s*['"]https:\/\/weatherchart\.uk\/['"]/);

  const manifest = JSON.parse(await read(path.join(WEATHERCHART, "manifest.webmanifest")));
  for (const [mode, base] of [["preview", PREVIEW_BASE], ["production", PRODUCTION_BASE]]) {
    const manifestUrl = new URL("manifest.webmanifest", base);
    await deployedFileFor(new URL(manifest.start_url, manifestUrl), mode);
  }
});

test("preview and standalone robots/sitemaps advertise real, unique pages", async () => {
  const previewRobots = await read(path.join(ROOT, "robots.txt"));
  const productionRobots = await read(path.join(WEATHERCHART, "robots.txt"));
  assert.match(previewRobots, /^User-agent:\s*\*/m);
  assert.match(previewRobots, /Allow:\s*\/Cool-Isle\//);
  assert.match(previewRobots, /Sitemap:\s*https:\/\/brexatlas\.github\.io\/Cool-Isle\/sitemap\.xml/);
  assert.match(productionRobots, /^User-agent:\s*\*/m);
  assert.match(productionRobots, /Sitemap:\s*https:\/\/weatherchart\.uk\/sitemap\.xml/);
  assert.doesNotMatch(previewRobots + productionRobots, /Disallow:\s*\/\s*$/m);

  const cases = [
    { file: path.join(ROOT, "sitemap.xml"), mode: "preview", minimum: 10 },
    { file: path.join(WEATHERCHART, "sitemap.xml"), mode: "production", minimum: 7 },
  ];
  for (const entry of cases) {
    const xml = await read(entry.file);
    assert.match(xml, /<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    assert.ok(locations.length >= entry.minimum);
    assert.equal(new Set(locations).size, locations.length, path.relative(ROOT, entry.file) + " contains duplicate URLs");
    assert.equal(locations.some((location) => /404\.html/.test(location)), false);
    for (const location of locations) await deployedFileFor(new URL(location), entry.mode);
    for (const lastmod of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
      assert.match(lastmod[1], /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test("weather motion respects reduced-motion and serious-warning safety modes", async () => {
  const animations = await read(path.join(WEATHERCHART, "assets", "css", "animations.css"));
  assert.match(animations, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(animations, /body\[data-serious-warning="true"\]\s+\.weather-scene\s*\{[^}]*display:\s*none/s);
  for (const scene of ["snow", "windy", "lightning", "hot", "cold"]) {
    assert.match(animations, new RegExp(`data-weather-scene=["']${scene}["']`));
  }
});
