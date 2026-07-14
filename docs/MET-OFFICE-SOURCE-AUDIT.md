# Met Office source audit

Reviewed: 13 July 2026. This is an engineering source record, not legal advice. Recheck live terms before production use or a material change in product scope.

| Source | Information used | Access method | Planned refresh | Terms/licence and attribution | Handling | Direct source |
| --- | --- | --- | --- | --- | --- | --- |
| Weather DataHub Global Spot overview | Product ranges, parameters, GeoJSON format, hourly update frequency | Manual documentation review | On implementation changes | Weather DataHub product terms; acknowledge Met Office as data supplier | Linked and paraphrased | https://datahub.metoffice.gov.uk/docs/f/category/site-specific/overview |
| Site-specific pricing | Free plan: 360 calls/day; UTC reset | Manual documentation review | Before quota changes | Weather DataHub site terms | Linked and paraphrased | https://datahub.metoffice.gov.uk/pricing/site-specific |
| Site-specific API documentation/OpenAPI | Hourly endpoint, `apikey` header, query fields and response structure | Server-side API only | Checked hourly, at about minute 17 | Weather DataHub terms; “Powered by Met Office data” and supplier acknowledgement | Normalised and transformed; original API response is not republished | https://datahub.metoffice.gov.uk/docs/f/category/site-specific/type/site-specific/api-documentation |
| Weather DataHub terms, dated 15 August 2024 | API/product licence, restrictions, confidentiality, attribution, no endorsement | Manual PDF review | Before production and after announced changes | Product-specific Weather DataHub licence, **not assumed to be OGL** | Linked and summarised | https://www.metoffice.gov.uk/binaries/content/assets/metofficegovuk/pdf/data/met-office-weatherdatahub-terms-and-conditions.pdf |
| Weather DataHub FAQ | Required “Powered by Met Office data” wording, key reset guidance, status codes | Manual documentation review | Quarterly | Weather DataHub terms | Linked and paraphrased | https://datahub.metoffice.gov.uk/support/faqs |
| Land Observations overview | Availability of recent hourly observations from about 150 maintained UK stations | Manual documentation review only; not integrated | Revisit if a separate observation subscription and quota are approved | Separate Weather DataHub product/order terms | Linked and paraphrased; no observation is presented as a forecast | https://datahub.metoffice.gov.uk/docs/o/category/observations/overview |
| Map Images overview | Fixed-resolution PNG layers for temperature, precipitation, cloud and mean-sea-level pressure | Manual documentation review only; not integrated | Revisit if a separate map-images subscription, attribution treatment and image budget are approved | Separate Weather DataHub product/order terms | Linked and paraphrased; no sample or website image copied | https://datahub.metoffice.gov.uk/docs/f/category/map-images/overview |
| UK severe-weather warning RSS | Warning title, summary, issue/update details and direct official link when present | Official RSS fetch, never article-page scraping | Hourly | Met Office website/RSS terms; direct link and Met Office attribution required | RSS fields retained as source content; editorial explanation is separate | https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/UK |
| Met Office RSS guide | Feed catalogue and direct-link rules | Manual documentation review | Quarterly | Website/RSS terms; no intermediate redirect | Linked and paraphrased | https://weather.metoffice.gov.uk/guides/rss |
| News releases RSS | Discovery title, publication date, official summary and direct URL | Official RSS fetch | Hourly | Met Office website/RSS terms; direct link and attribution required | Original title/date retained; body not copied; neutral placeholder until reviewed | https://www.metoffice.gov.uk/feed/syndication/news-rss.xml |
| Severe-weather news listing | Candidate items and topic/year context | Manual editorial review only | As editors curate | Website terms; do not scrape, mirror, or copy article bodies/images | Linked; original 8–25 word WeatherChart take only after review | https://www.metoffice.gov.uk/about-us/news-and-media/media-centre/weather-and-climate-news?year=2026&newsTopics.label=Severe%20weather |
| UK weather warnings page | Current full warning and safety guidance | Direct user link only | User-initiated | Website terms | Linked only; never framed | https://weather.metoffice.gov.uk/warnings-and-advice/uk-warnings |
| Weather warnings guide | Meaning of Yellow, Amber and Red; warning categories | Manual documentation review | Quarterly | Website terms | Linked and paraphrased | https://weather.metoffice.gov.uk/guides/warnings |
| Find a forecast, UK forecast, seasonal advice, explainers, maps and charts | Source links and contextual reading | Manual review/direct links only | As editorial pages change | Website terms | Linked only; not mirrored or scraped | https://weather.metoffice.gov.uk/ |

## Product-specific licence conclusion

Global Spot is supplied under the Met Office Weather DataHub Terms and Conditions accepted for the subscriber’s order. The general Met Office website OGL language is not treated as the licence for this product. The implementation therefore:

- keeps the API key confidential and server-side;
- transforms responses into a purpose-specific internal schema;
- identifies Met Office as a data supplier and displays “Powered by Met Office data” beside derived views;
- does not imply sponsorship, approval, partnership, or endorsement;
- does not expose a general-purpose proxy or republish the upstream GeoJSON as received; and
- stops at the user’s stricter 300-attempt daily ceiling even though the reviewed free plan permits 360 calls. A complete twelve-call batch is pre-reserved on a dedicated GitHub state branch and confirmed before the first provider request; missing or unconfirmed durable state makes no provider request.

The account holder should retain the accepted order confirmation and current product terms as the authoritative licence record.
