# WeatherChart UK data sources

## Forecast hierarchy

1. **Met Office Weather DataHub Global Spot** — preferred official source for the twelve cached UK locations. Server-side workflow only; hourly product; transformed before publishing.
2. **Open-Meteo** — an implemented but opt-in indicative forecast adapter. It is disabled in the production workflow by default and can never be labelled Met Office or official. Its geocoding endpoint is used for uncached UK place searches.
3. **Mock/sample fixtures** — local development and no-secret demonstration only. The interface must show a visible “Sample data” state and must not describe it as live.

The browser reads generated JSON and never receives a private provider credential. Units are explicit in the normalised data. The selected configured-city ID may appear in the page URL, but no preference or searched coordinate is stored locally; browser geolocation is requested only after the user presses the location button and is discarded after nearest-point matching.

The provider boundary is implemented by `MetOfficeProvider`, `OpenMeteoFallbackProvider`, and `MockProvider`. They return the same per-location schema, so a future approved server-side proxy can add arbitrary cached coordinates without rewriting the browser UI. Production currently uses only the Met Office provider after a durable quota reservation; the Open-Meteo forecast adapter remains opt-in.

Land Observations and Weather DataHub Map Images were reviewed but are not enabled. They are separate products with their own subscription/usage and licence decisions; adding them would not be silently charged against or confused with the Global Spot integration. The first release uses forecast points plus Leaflet/OpenStreetMap rather than copying Met Office website maps or sample images.

## Search and geocoding

The twelve cached locations are searched locally first. Uncached town/county queries use the documented Open-Meteo geocoding endpoint and postcodes use the documented postcodes.io endpoint; results are cached only in memory for the page session. The interface discloses the selected geocoder, nearest cached location and distance. It does not claim the visitor is at that place or persist the returned coordinate. Any later more-local Open-Meteo forecast must keep its fallback label.

## Warnings and news

- Official warnings: Met Office UK warning RSS, with direct links and Met Office attribution. A card is published only when the feed supplies a recognised severity, a valid start/end window, and an affected region (or valid geometry); incomplete items make the source unavailable and direct users to the official warning service.
- News discovery: Met Office news RSS.
- Severe-weather editorial cards: manually reviewed metadata in `weatherchart/config/curated-news.json`, retaining the official title/date and using a new 8–25 word WeatherChart summary.

No article page is crawled, mirrored, framed, or copied. New unreviewed RSS items use a neutral prompt to read the official source.

## Community weather

Optional adapters are permitted only for configured official APIs or supported public embeds:

- YouTube Data API and privacy-enhanced, click-to-load embeds;
- X recent-search API, or outbound search/curated links when access is unavailable;
- TikTok oEmbed for a manually moderated list of public video URLs;
- Bluesky or Mastodon only after current terms and moderation controls are reviewed.

The default build is useful without social keys and uses no unauthorised scraper. See `SOCIAL-SOURCES-AND-MODERATION.md`.

## Map

Leaflet displays OpenStreetMap tiles with visible contributor attribution. Warning geometry is shown only when supplied by an authorised source; region-only warnings remain text or coarse region markers. Community markers use city-centre/coarse positions and never a person’s precise coordinates.

## Refresh and stale rules

- Workflow check: hourly, scheduled around minute 17.
- Browser JSON check: at load, every 60 minutes, and after returning to a stale tab.
- Stale label: after two hours.
- Strong stale warning: after six hours.
- Production quota guard: reserve and confirm all twelve pending Global Spot calls on the dedicated GitHub state branch before the first request; hard stop at 300 reserved calls per UTC day.
- On any source or validation failure, preserve the last valid dataset and report the failed source.
