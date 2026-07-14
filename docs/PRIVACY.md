# WeatherChart UK privacy notes

## Visitor data

WeatherChart has no account system and does not ask visitors to submit comments. The static site does not need a private API key in the browser. It uses no analytics or advertising cookies.

- Cached-city search text is processed in the page. An uncached UK place is sent to Open-Meteo geocoding, and a submitted postcode is sent to postcodes.io; the result is held only in tab memory and the URL stores only the selected cached-city ID.
- Browser geolocation is requested only after the visitor presses **Use my location**.
- The returned coordinates are used in memory to choose a forecast and are not logged, published, or persisted.
- One strictly necessary `localStorage` record stores only the versioned allow/reject choice for the optional external map plus decision and expiry timestamps. It expires after 180 days and never contains a city, coordinate or account identifier.
- WeatherChart must not store a home address, school, workplace, precise route, or precise community-post coordinates.

## Third parties

The base experience loads generated first-party JSON. Leaflet and OpenStreetMap are not requested until the visitor explicitly allows the optional map; withdrawing the choice removes the map and stops further tile requests. Community cards contain attributed first-party text and outbound source links rather than visitor-side platform embeds. Opening an external source is subject to that provider’s privacy policy.

No analytics or advertising tracker is enabled by this implementation. Any future analytics/advertising must be reviewed, disclosed, minimised, and kept away from precise location queries.

## Public community data

Community cards include only permitted public post text, platform/author/time attribution and a direct source link. Location is reduced to city/region and accompanied by its basis/confidence; precise coordinates are never retained. Items expire within 48 hours. The update job removes unavailable/deleted items on the next successful check and does not preserve a private archive or publish synthetic replacements.

## Corrections and removals

Request a public correction/removal through https://github.com/BREXAtlas/WeatherChartUK/issues/new with the card URL or stable ID. Do not put private personal information in a public issue. Before enabling production-scale community aggregation, the owner should add a private contact address to the visible privacy page.

## Security

The live provider key is stored only as the `MET_OFFICE_API_KEY` repository secret in `BREXAtlas/WeatherChartUK`. That repository alone runs the hourly provider workflow and quota ledger. Cool Isle is a secret-free public-data consumer. Generated files and status pages contain provider names, timestamps and quota counts but never request headers or credentials.
