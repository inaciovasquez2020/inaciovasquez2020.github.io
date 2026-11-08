# Private, privacy-friendly website analytics

## Current state

**ACTIVATION CONFIGURED (deployment-dependent)**. The configured token belongs to `inaciovasquez2020.github.io`. After deployment, the guarded loader activates unless GPC/DNT suppresses it. Verify live beacon delivery and the private Cloudflare dashboard before claiming data collection is operational.

The Cloudflare token is a **public site identifier**, not an API secret. Never put Cloudflare API keys, private dashboard credentials, or visitors' personal information in a public repository. This integration adds no public statistics widget or analytics API endpoint.

## Prerequisite: Cloudflare account and site

1. Open [Cloudflare Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics) under the intended private account.
2. Add `inaciovasquez2020.github.io` as a **non-Cloudflare-hosted** site, then use its manual JavaScript installation instructions. Cloudflare DNS migration is not required.
3. Confirm that the exact analytics JavaScript token provided for that site is a 32-character hexadecimal identifier. Cloudflare dashboard UI/site identifiers can differ from the beacon token: use the token from the actual JS installation snippet, not an API token.
4. Review your privacy notice for analytics disclosure under applicable laws. Cloudflare's Web Analytics service is cookie-free, but collection and third-party requests may still require legal/privacy review.
5. Deploy the activation only after a reviewed, narrowly scoped PR passes configuration, loader, and privacy-guard tests.

## Site coverage

All four HTML entry points are wired to the same config and loader:
- `/` (research homepage)
- `/publications.html`
- `/contact.html`
- `/vasquez-index/` (the nested index **inside this repository**)

The **separately deployed** `vasquez-index` repository, Vercel dashboard, and `vasquezresearch.com` have different deployment ownership; this PR does **not** install tracking there. A site token is only activated for the pages listed above unless additional independent PRs are reviewed.

## Privacy choices and limitations

- No cookies, localStorage, identifiers, custom user events or local analytics database are added by these files.
- Browser Global Privacy Control or Do Not Track (`1`) blocks beacon initialization.
- Only standard Cloudflare page-view events are intended; no manual events, custom payloads, URL query-string handling or public counter is added.
- Cloudflare's own script, processing and retention rules are governed by Cloudflare. Ad-blockers, disabled JavaScript, privacy signals, and other constraints may reduce measured counts.
- The full Cloudflare dashboard and collection policy are controlled by the Cloudflare account, **not by GitHub**. A public page can reveal a public beacon token; possession of it does not authorize dashboard access.
- **No analytics service can reliably guarantee the exclusion of all personal data** (e.g. IP address during network transport); do not promise anonymous visitor counts.
- Avoid storing sensitive personal information in pathnames or query parameters; review Cloudflare's handling of URLs before activating on any new pages.

## Reproduction / acceptance gate

From the repository root:

```bash
python3 scripts/verify_site.py
python3 tests/test_public_navigation.py
python3 tests/test_analytics_integration.py
```

Unconfigured behavior: open each page with network inspection; no request to `static.cloudflareinsights.com` or `cloudflareinsights.com` should be initiated by this loader.

After activation: verify a real `beacon.min.js` response on each intended page, then check that page views appear **only inside the account owner's Cloudflare dashboard**. Also check that the beacon is **not** loaded with GPC/DNT enabled. Do not use an invented view count or claim the analytics system is live on CI success alone.

## Release boundary

The activation PR remains draft-only until CI, diff review, and explicit owner approval for merging. **DATA_COLLECTION := DEPLOYMENT_UNVERIFIED** until deployment and actual beacon delivery are confirmed.
