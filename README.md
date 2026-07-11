# CoolIsle UK — Weather-Ready Britain

Static site pack, ready for GitHub Pages.

## Pages
- `index.html` — main site: live UK heat ticker & board (Open-Meteo), shop, budget hacks, winter preview, climate trends chart, Leaflet UK heat/supplier map, AC Locator, BTU calculator, About Us
- `blog.html` — 5 SEO guide articles (sizing, running costs, cooler vs AC, casement hose fitting, stock watch)
- `winter.html` — winter preparedness guide with GOV.UK support links and autumn product range

## Deploy to GitHub Pages
1. Create a new repo (e.g. `coolisle`)
2. Upload these files to the repo root
3. Settings → Pages → Deploy from branch → main → root
4. Site goes live at `https://YOURUSERNAME.github.io/coolisle/`
5. Replace `YOURUSERNAME` in index.html's canonical tag, and swap every `buyUrl: "#"` in the CONFIG block for your Shopify product URLs (or Shopify Buy Button links)

## Notes
- Live weather, exchange rates and the map need internet (Open-Meteo, Frankfurter, OpenStreetMap — all free, no API keys)
- All animations respect prefers-reduced-motion
- Climate figures are approximate; labelled with verify-at-source links
