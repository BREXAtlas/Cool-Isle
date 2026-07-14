# WeatherChart UK domain plan

The inactive template at `.github/workflows/deploy-weatherchart-domain.yml.disabled` prepares a manual, WeatherChart-only publish to `BREXAtlas/WeatherChart-UK`. GitHub does not recognise the `.disabled` extension. Do not rename it until the owner confirms the target repository, its Pages configuration, DNS ownership, and the `WEATHERCHART_DEPLOY_TOKEN` secret. The template preserves any target `CNAME` and cannot change Cool Isle's Pages domain.

Reviewed against current GitHub Pages documentation on 13 July 2026.

## Why a second repository is required

A GitHub Pages project site has one configured custom-domain relationship. A second custom domain cannot be assigned only to the `/weatherchart/` directory while leaving the rest of the same Pages artifact on its current project URL. The recommended separation is:

- source remains in `BREXAtlas/Cool-Isle/weatherchart/`;
- preview remains `https://brexatlas.github.io/Cool-Isle/weatherchart/`;
- a future workflow publishes only WeatherChart output to `BREXAtlas/WeatherChart-UK`;
- that second repository’s Pages site owns `weatherchart.uk`.

Cool Isle’s current Pages settings, root CNAME state, and deployment remain independent.

## Activation prerequisites

Do not enable cross-repository publishing until all are confirmed:

- `BREXAtlas/WeatherChart-UK` exists and is owner-approved;
- GitHub Pages is enabled there with GitHub Actions as the source;
- `WEATHERCHART_DEPLOY_TOKEN` is configured with only the needed repository scope;
- the organisation/account verifies control of `weatherchart.uk`;
- the DNS owner confirms the intended apex and `www` behaviour; and
- preview and production links are tested for redirect loops.

## DNS and domain checklist

Use the values shown in GitHub’s current documentation at activation time; do not copy old IP addresses from this repository.

1. Verify the domain at the account/organisation level with GitHub’s TXT-record flow and keep the verification record.
2. Add the custom domain in the **target repository’s** Pages settings before changing DNS.
3. Configure apex and `www` records exactly as GitHub currently documents; avoid wildcard records.
4. Confirm DNS with the provider and an independent lookup.
5. Wait for GitHub’s certificate provisioning, then enable **Enforce HTTPS**.
6. Check for mixed content, the apex/`www` redirect, canonical metadata, sitemap, and both directions of the Cool Isle link.

Official references:

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Canonical transition

Before the domain exists, preview pages canonicalise to the preview URL. After HTTPS and both link directions are verified, set `WEATHERCHART_CANONICAL_URL=https://weatherchart.uk/`, make the production site canonical, and keep the GitHub path as a preview or small launch page. Never create redirects in both directions.

## Rollback and safe removal

1. Stop the target deployment workflow.
2. Restore WeatherChart canonical links to the GitHub preview URL.
3. Remove the custom domain in the target repository’s Pages settings.
4. Remove or repoint DNS promptly so a disabled Pages mapping cannot be taken over.
5. Keep domain verification while the organisation still owns the domain.
6. Confirm the Cool Isle preview remains usable.

No DNS, CNAME, repository creation, or cross-repository publishing is performed by this implementation.
