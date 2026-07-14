# WeatherChart UK privacy notes

## Visitor data

WeatherChart has no account system and does not ask visitors to submit comments. The static site does not need a private API key in the browser.

- Cached-city search text is processed in the page. An uncached UK place is sent to Open-Meteo geocoding, and a submitted postcode is sent to postcodes.io; the result is held only in tab memory and the URL stores only the selected cached-city ID.
- Browser geolocation is requested only after the visitor presses **Use my location**.
- The returned coordinates are used in memory to choose a forecast and are not logged, published, or persisted.
- Only a visitor’s explicitly chosen preferred city may be stored in `localStorage`. It can be cleared through browser site-data settings or a future in-page reset control.
- WeatherChart must not store a home address, school, workplace, precise route, or precise community-post coordinates.

## Third parties

The base experience loads generated first-party JSON. Leaflet maps may request OpenStreetMap tiles. Optional social media is hidden behind click-to-load facades so the platform does not receive a request merely because the WeatherChart page was opened. Opening an external source or embed is then subject to that provider’s privacy policy.

No analytics or advertising tracker is enabled by this implementation. Any future analytics/advertising must be reviewed, disclosed, minimised, and kept away from precise location queries.

## Public community data

Community cards include only permitted public metadata and a direct source link. Location is reduced to city/region and accompanied by its basis/confidence. Items normally expire within 24–48 hours. The update job removes unavailable/deleted items on the next check and does not preserve a private archive.

## Corrections and removals

Request a public correction/removal through https://github.com/BREXAtlas/Cool-Isle/issues/new with the card URL or stable ID. Do not put private personal information in a public issue. Before enabling production-scale community aggregation, the owner should add a private contact address to the visible privacy page.

## Security

Server-side provider keys live only in GitHub Actions secrets or an approved backend secret store. Generated files and status pages contain provider names, timestamps and quota counts but never request headers or credentials.
