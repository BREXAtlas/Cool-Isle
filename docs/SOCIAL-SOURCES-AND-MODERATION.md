# Community weather sources and moderation

## Principle

“What people are saying” provides local flavour, not evidence. Every card must say:

> Public weather chatter—not a verified weather observation.

The section also states that public posts may be inaccurate and that official forecasts and warnings should guide decisions.

## Permitted collection

- Official YouTube Data API with GB/English, recent-window, strict safe-search and embeddable-video filters.
- Official X recent-search API only at the account’s available access level.
- TikTok’s supported oEmbed endpoint for manually approved public URLs.
- Mastodon’s documented public hashtag-timeline API on the reviewed `mastodon.social` instance.
- Manually curated public links when an API is unavailable.

The project must not scrape platform pages, evade login or rate limits, inspect private profiles/messages, recover deleted content, extract EXIF location, or automate a browser to mimic an unauthorised API.

### Runtime adapters

- `scripts/lib/community-adapters/youtube.mjs` makes one official `search.list` request when `YOUTUBE_API_KEY` is present. The key is sent in the `X-Goog-Api-Key` header, never a URL or generated file; the request uses GB/English relevance, strict SafeSearch, embeddable-video and 48-hour filters.
- `scripts/lib/community-adapters/x.mjs` makes one official recent-search request when `X_BEARER_TOKEN` is present. It requests only the public post, author and coarse place fields needed by the cards.
- `scripts/lib/community-adapters/tiktok.mjs` checks only URLs in `weatherchart/config/curated-tiktok.json` and discards returned embed HTML and thumbnail URLs after validating public availability.
- `scripts/lib/community-adapters/mastodon.mjs` makes one unauthenticated request to the documented public `#UKWeather` hashtag timeline on `mastodon.social`. It accepts only direct canonical `mastodon.social` post links from public, non-sensitive, non-bot, non-reply, non-reblog, recent English posts that explicitly name a configured coarse UK place. Federated results on unreviewed source hosts are excluded.
- All requests are single-attempt with an eight-second default timeout. A disabled or failed source preserves only its unexpired prior cards; a successful refresh replaces that source so removed items do not linger.
- `weatherchart/config/social-keywords.json` controls discovery terms, explicit city aliases, retention, timeouts and per-platform/total caps. Account allowlists and blocklists live in the corresponding social config files.
- The generated audit contains aggregate counters and controlled reason codes only. It never contains blocked post text, API queries, precise coordinates or credentials.

Official contracts: [YouTube search.list](https://developers.google.com/youtube/v3/docs/search/list), [X recent search](https://docs.x.com/x-api/posts/search/quickstart/recent-search), [TikTok oEmbed](https://developers.tiktok.com/doc/embed-videos/), and [Mastodon hashtag timelines](https://docs.joinmastodon.org/methods/timelines/#tag).

No synthetic community fallback is published. If no current post passes every gate, the generated dataset remains live-mode and empty, and both card sections stay hidden.

## Location rules

- Publish city or region only.
- Use a city only when the platform supplies a public geotag or the author explicitly names the place. Mastodon posts without an explicit configured coarse place are withheld.
- Never infer location from landmarks, images, home/school/work details, or hidden metadata.
- Do not map unknown-location items. Use coarse city-centre markers, not a post’s coordinates.
- Suppress content that may expose a minor’s precise location.

Visible bases are: “Platform geotag”, “Location named by author”, “Matched by search words”, and “Location not verified”.

## Automated gates

Before an item reaches public JSON:

1. allowlist the `https` platform host and reject malformed, `javascript:` and `data:` URLs;
2. reject blocked domains/accounts and non-public/login-only targets;
3. apply the profanity, slur and unsafe-topic blocklists;
4. require a family-safe flag and allowed media type;
5. remove precise coordinates and address-like fields;
6. deduplicate by canonical URL/stable platform ID;
7. cap each platform and total output;
8. assign a location basis/confidence; and
9. set a 24–48 hour expiry unless a human explicitly curates the item.

The update job records an internal exclusion reason without storing blocked post text or precise location. Removed/unavailable posts disappear on the next update.

## Display rules

- No autoplay and no comments/accounts on WeatherChart.
- Video uses a click-to-load privacy facade.
- Show the platform, public author name/handle, UK publication time and source host, then link directly to the original platform post.
- Weather comparisons are cautious (“mentions” / “available forecast does not confirm”), never presented as definitive fact-checking without supporting data.
- Suggested actions come from official/fallback forecast data, not the post.
- Playful copy is suppressed when an Amber or Red warning is active.

## Human review and corrections

Editors add or remove curated items in the relevant config file and review source availability, family safety, explicit location basis, expiry, and direct URL. A public correction/removal request can be opened at:

https://github.com/BREXAtlas/Cool-Isle/issues/new

For TikTok, set `enabled` to `true` only after adding a direct public `/@account/video/id` URL with `familySafe: true`, `reviewStatus: "approved"`, an ISO `publishedAt`, allowlisted weather keywords, and an explicit `author_explicit` or public `platform_geotag` city basis. Run `npm test` and `npm run update:community`; remove the entry immediately on a creator request or when it becomes private, deleted, unsafe or misleading.

Use the title “WeatherChart community card correction/removal” and include the card’s public URL or stable ID. Do not publish private personal information in the issue; repository owners should provide a private contact route before enabling a high-volume live aggregator.
