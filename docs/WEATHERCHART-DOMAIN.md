# WeatherChart UK domain and Pages ownership

Reviewed: 14 July 2026

## Active repository separation

The standalone public repository [`BREXAtlas/WeatherChartUK`](https://github.com/BREXAtlas/WeatherChartUK) owns the WeatherChart application and its GitHub Actions Pages deployment:

`https://brexatlas.github.io/WeatherChartUK/`

Cool Isle remains an independent project site. DNS cannot map a custom domain to one folder inside another Pages artifact, so `weatherchart.uk` must be attached only to the WeatherChartUK Pages site. No cross-repository publisher or deploy token is used.

## GitHub Pages settings

In `BREXAtlas/WeatherChartUK`:

1. Keep **Settings → Pages → Source** set to **GitHub Actions**.
2. Confirm the Actions deployment succeeds at the GitHub Pages URL before adding a custom domain.
3. Verify ownership of `weatherchart.uk` at the `BREXAtlas` account level using GitHub's TXT-record process, and retain that verification record.
4. Enter `weatherchart.uk` in the repository's **Custom domain** setting before changing public DNS.
5. After DNS resolves to GitHub and the certificate is issued, enable **Enforce HTTPS**.

Use the exact A, AAAA, and CNAME instructions in `GODADDY-GITHUB-PAGES-DNS.md`. Do not change those records to a repository path or use stale IP values copied from an unrelated host.

## Canonical transition

Until the custom domain is configured and HTTPS is working, canonical metadata should use:

`https://brexatlas.github.io/WeatherChartUK/`

After the custom domain, HTTPS, sitemap, and both directions of the Cool Isle link are verified, canonical metadata may move to `https://weatherchart.uk/`. Keep one canonical destination and avoid redirects in both directions.

## Rollback and safe removal

1. Restore canonical metadata to the GitHub Pages URL.
2. Remove the custom domain from the WeatherChartUK repository's Pages settings.
3. Remove or repoint DNS promptly so a disabled Pages mapping cannot be taken over.
4. Keep account-level domain verification while the owner retains the domain.
5. Confirm `https://brexatlas.github.io/WeatherChartUK/` and Cool Isle's outbound link still work.

Official references:

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
