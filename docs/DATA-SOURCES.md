# WeatherChart UK data sources

## Forecast hierarchy

1. **Met Office Weather DataHub Global Spot** — preferred official source for the twelve cached UK locations. Server-side workflow only; hourly product; transformed before publishing.
2. **Open-Meteo** — active live indicative fallback for the same twelve points whenever Met Office is unavailable, unconfigured, or quota-stopped. It is always attributed and can never be labelled Met Office or official. Its geocoding endpoint is also used for uncached UK place searches.
3. **Mock fixtures** — development and automated tests only. Production validation and the browser reject synthetic forecast data.

The browser reads generated JSON and never receives a private provider credential. Units are explicit in the normalised data. The selected configured-city ID may appear in the page URL, but no preference or searched coordinate is stored locally; browser geolocation is requested only after the user presses the location button and is discarded after nearest-point matching.

The provider boundary is implemented by `MetOfficeProvider`, `OpenMeteoFallbackProvider`, and `MockProvider`. They return the same per-location schema, so a future approved server-side proxy can add arbitrary cached coordinates without rewriting the browser UI. Production prefers Met Office after a durable quota reservation and automatically requests a complete Open-Meteo fallback batch when the official path cannot run. No provider request is retried. The public fallback payload keeps the next 24 hourly periods plus daily summaries derived from the complete three-day response.

The free Open-Meteo API is presently suitable only while this site remains non-commercial. Before adding ads, affiliate links, subscriptions, checkout, or other monetisation, disable the fallback or move it to an appropriate paid Open-Meteo plan and re-check the current terms.

Land Observations and Weather DataHub Map Images were reviewed but are not enabled. They are separate products with their own subscription/usage and licence decisions; adding them would not be silently charged against or confused with the Global Spot integration. The first release uses forecast points plus Leaflet/OpenStreetMap rather than copying Met Office website maps or sample images.

## Search and geocoding

The twelve cached locations are searched locally first. Uncached town/county queries use the documented Open-Meteo geocoding endpoint and postcodes use the documented postcodes.io endpoint; results are cached only in memory for the page session. The interface discloses the selected geocoder, nearest cached location and distance. It does not claim the visitor is at that place or persist the returned coordinate. Any later more-local Open-Meteo forecast must keep its fallback label.

## Warnings and news

- Official warnings: Met Office UK warning RSS, with direct links and Met Office attribution. A card is published only when the feed supplies a recognised severity, a valid start/end window, and an affected region (or valid geometry); incomplete items make the source unavailable and direct users to the official warning service.
- News discovery: Met Office news RSS.
- Severe-weather editorial cards: manually reviewed metadata in `weatherchart/config/curated-news.json`, retaining the official title/date and using a new 8–25 word WeatherChart summary.

No article page is crawled, mirrored, framed, or copied. New unreviewed RSS items use a neutral prompt to read the official source.

## Community weather

Community adapters use configured official APIs, supported public embeds, or documented public endpoints:

- YouTube Data API and privacy-enhanced, click-to-load embeds;
- X recent-search API, or outbound search/curated links when access is unavailable;
- TikTok oEmbed for a manually moderated list of public video URLs;
- Mastodon’s public `#UKWeather` hashtag timeline on `mastodon.social`, filtered to direct local canonical posts with explicit coarse UK place text.

The Mastodon source needs no secret, uses one documented API request per refresh, and is useful when optional YouTube/X keys are absent. No page is scraped. Every accepted card attributes the platform, author, time and direct source; if no post passes moderation, the site omits the card sections instead of publishing sample content. See `SOCIAL-SOURCES-AND-MODERATION.md`.

## Map

Leaflet displays OpenStreetMap tiles with visible contributor attribution. Warning geometry is shown only when supplied by an authorised source; region-only warnings remain text or coarse region markers. Community markers use city-centre/coarse positions and never a person’s precise coordinates.

## Refresh and stale rules

- Workflow check: hourly, scheduled around minute 17.
- Browser JSON check: at load, every 60 minutes, and after returning to a stale tab.
- Stale label: after two hours.
- Strong stale warning: after six hours.
- Production quota guard: reserve and confirm all twelve pending Global Spot calls on the dedicated GitHub state branch before the first request; hard stop at 350 reserved calls per UTC day.
- On a Met Office failure or quota stop, publish a fresh attributed Open-Meteo batch. If neither live provider succeeds, preserve the last valid live dataset and report both failed sources; production never deploys a synthetic forecast.
