from pathlib import Path

UNSPLASH_LICENSE = "https://unsplash.com/license"


def inject_index(path: Path) -> None:
    html = path.read_text(encoding="utf-8")

    html = html.replace(
        '<link rel="canonical" href="https://YOURUSERNAME.github.io/coolisle/">',
        '<link rel="canonical" href="https://brexatlas.github.io/Cool-Isle/">',
    )
    html = html.replace(
        '<link rel="canonical" href="https://brexatlas.github.io/cool-isle/">',
        '<link rel="canonical" href="https://brexatlas.github.io/Cool-Isle/">',
    )

    gallery_css = """
/* Free-to-use image gallery — photos served by Unsplash */
.weather-gallery{background:#fff}
.weather-gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.weather-photo{position:relative;min-height:280px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--line);background:#dce8ed}
.weather-photo img{width:100%;height:100%;min-height:280px;object-fit:cover;display:block;transition:transform .35s ease}
.weather-photo:hover img{transform:scale(1.035)}
.weather-photo figcaption{position:absolute;left:0;right:0;bottom:0;padding:36px 16px 14px;background:linear-gradient(transparent,rgba(8,28,41,.9));color:#fff;font-weight:700}
.weather-photo figcaption span{display:block;font-size:.75rem;font-weight:400;color:#d7e8ef;margin-top:3px}
.photo-credit{font-size:.76rem;color:#678;margin-top:12px}
@media (max-width:760px){.weather-gallery-grid{grid-template-columns:1fr}.weather-photo,.weather-photo img{min-height:230px}}
"""

    if "/* Free-to-use image gallery" not in html:
        html = html.replace("</style>", gallery_css + "\n</style>", 1)

    gallery_html = f"""
<section id="weather-gallery" class="weather-gallery" aria-labelledby="weather-gallery-title">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow">Weather-ready inspiration</p>
      <h2 id="weather-gallery-title">Real homes. Real seasons. Practical comfort.</h2>
      <p>Visual guides for preparing a British home for summer heat, winter cold and year-round weather changes.</p>
    </div>
    <div class="weather-gallery-grid">
      <figure class="weather-photo">
        <img src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=82" alt="A row of homes in bright summer weather" loading="lazy" decoding="async">
        <figcaption>Summer-ready homes<span>Shade first, ventilate at night, then add efficient cooling.</span></figcaption>
      </figure>
      <figure class="weather-photo">
        <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267d?auto=format&fit=crop&w=1200&q=82" alt="A bright, comfortable apartment interior" loading="lazy" decoding="async">
        <figcaption>Comfort in smaller spaces<span>Practical ideas for flats, rentals and compact rooms.</span></figcaption>
      </figure>
      <figure class="weather-photo">
        <img src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=82" alt="A warm and comfortable home interior" loading="lazy" decoding="async">
        <figcaption>Winter warmth<span>Keep paid-for heat indoors with insulation, curtains and draught control.</span></figcaption>
      </figure>
    </div>
    <p class="photo-credit">Images provided under the <a href="{UNSPLASH_LICENSE}" target="_blank" rel="noopener">Unsplash License</a>. Images are illustrative.</p>
  </div>
</section>
"""

    if 'id="weather-gallery"' not in html:
        html = html.replace("<!-- ============ SHOP:", gallery_html + "\n<!-- ============ SHOP:", 1)

    if 'href="#weather-gallery"' not in html:
        html = html.replace(
            '<a href="#shop">Heat Relief</a>',
            '<a href="#shop">Heat Relief</a>\n      <a href="#weather-gallery">Gallery</a>',
            1,
        )

    path.write_text(html, encoding="utf-8")


def inject_secondary(path: Path, image_url: str, alt: str, caption: str) -> None:
    html = path.read_text(encoding="utf-8")
    css = """
.feature-photo{max-width:1100px;margin:28px auto 0;padding:0 20px}
.feature-photo img{width:100%;height:clamp(230px,42vw,460px);object-fit:cover;border-radius:10px;display:block}
.feature-photo figcaption{font-size:.78rem;color:#678;margin-top:8px}
"""
    if ".feature-photo{" not in html:
        html = html.replace("</style>", css + "\n</style>", 1)

    figure = f'''<figure class="feature-photo">
  <img src="{image_url}" alt="{alt}" loading="lazy" decoding="async">
  <figcaption>{caption} · <a href="{UNSPLASH_LICENSE}" target="_blank" rel="noopener">Unsplash License</a></figcaption>
</figure>'''

    if 'class="feature-photo"' not in html:
        marker = "</div></div>"
        pos = html.find(marker, html.find('class="page-hero"'))
        if pos != -1:
            pos += len(marker)
            html = html[:pos] + "\n" + figure + html[pos:]

    path.write_text(html, encoding="utf-8")


inject_index(Path("index.html"))
inject_secondary(
    Path("blog.html"),
    "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=1600&q=82",
    "Clouds moving across a bright sky",
    "Free-to-use weather imagery from Unsplash",
)
inject_secondary(
    Path("winter.html"),
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=82",
    "A warm and comfortable home interior prepared for colder weather",
    "Free-to-use home imagery from Unsplash",
)
