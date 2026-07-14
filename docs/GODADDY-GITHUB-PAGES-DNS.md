# GoDaddy DNS for WeatherChart UK on GitHub Pages

Reviewed against GitHub Pages and GoDaddy documentation on 14 July 2026.

## Why the domain currently shows another page

At the time of review, `weatherchart.uk` resolves to `15.197.148.33` and
`3.33.130.190`. Those are not GitHub Pages addresses. The `www` record points
back to the parked apex domain, so both names can show GoDaddy's destination
instead of WeatherChart UK.

DNS alone cannot select the `/weatherchart/` folder inside the Cool Isle Pages
site. A GitHub Pages custom domain belongs to one complete Pages deployment.
Attaching `weatherchart.uk` to `BREXAtlas/Cool-Isle` would therefore serve that
repository's root (Cool Isle), not just the WeatherChart subfolder.

## Required GitHub setup first

Do these steps before changing DNS:

1. Create the separate public repository `BREXAtlas/WeatherChart-UK`.
2. Publish the contents of this repository's `weatherchart/` directory at the
   root of that repository's Pages artifact.
3. In `BREXAtlas/WeatherChart-UK`, open **Settings -> Pages** and select
   **Deploy from a branch**, branch `main`, folder `/(root)`. The publisher
   template copies the generated static site to that branch; it does not add a
   target-repository GitHub Actions Pages workflow.
4. Because `BREXAtlas` is a personal account, open the account's **Settings ->
   Pages** screen and verify ownership of `weatherchart.uk` using the TXT record
   GitHub supplies. Keep that TXT record permanently after verification.
5. In the target repository's Pages settings, enter `weatherchart.uk` under
   **Custom domain** and save it. GitHub recommends adding the custom domain to
   the repository before pointing public DNS at GitHub.

The target repository did not exist when this document was written. Do not
change DNS until steps 1–5 are complete, or the domain may remain parked or be
served by the wrong Pages site.

## GoDaddy records for the apex domain

In GoDaddy, open **Domain Portfolio -> weatherchart.uk -> DNS**. Disable any
GoDaddy forwarding, parking, or Website Builder connection for this domain.
Remove every existing `A`, `AAAA`, `ALIAS`, or `ANAME` record for `@`, including
the parked `A` records `15.197.148.33` and `3.33.130.190`. Then add these eight
records. Use GoDaddy's default one-hour TTL.

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

For the recommended `www` variant, remove the current `www` record that points
back to the parked apex, then add:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `www` | `BREXAtlas.github.io` |

The `www` CNAME must not contain `/Cool-Isle`, `/WeatherChart-UK`, a protocol,
or any path. Do not create wildcard DNS records.

## Verify and enable HTTPS

DNS updates often appear within an hour but can take up to 48 hours globally.
Do not expect HTTPS to work until GitHub has accepted the domain and issued its
certificate. On Windows, verify the authoritative answer and two independent
public resolvers with:

```powershell
Resolve-DnsName weatherchart.uk -Type A
Resolve-DnsName weatherchart.uk -Type AAAA
Resolve-DnsName www.weatherchart.uk -Type CNAME
Resolve-DnsName weatherchart.uk -Type A -Server 1.1.1.1
Resolve-DnsName weatherchart.uk -Type A -Server 8.8.8.8
Resolve-DnsName weatherchart.uk -Type AAAA -Server 1.1.1.1
Resolve-DnsName weatherchart.uk -Type AAAA -Server 8.8.8.8
```

The answers must match the records above. After GitHub finishes issuing the
certificate, enable **Enforce HTTPS** in the target repository's Pages
settings. Check both `https://weatherchart.uk/` and
`https://www.weatherchart.uk/`, and confirm one redirects to the other.

Official instructions:

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- https://www.godaddy.com/en-uk/help/add-or-edit-an-a-record-42545
- https://www.godaddy.com/help/add-an-aaaa-record-19214
