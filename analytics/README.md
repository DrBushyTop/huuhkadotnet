# Private traffic archive

This application archives Umami Cloud Hobby exports and shows them in a private
dashboard at <https://metrics.huuhka.net>. It has its own Azure Storage account,
Container Apps job, managed identity, and Free Static Web App in
`huuhkadotnet-prod`. It does not use the public blog's Static Web App or media
storage. Its image lives in the existing shared `huuhka` Azure Container
Registry, so the metrics stack adds no registry subscription cost.

Code and data ship separately:

- The **job** archives Umami exports and writes `umami.json` to the private
  `reports` blob container. It never touches the Static Web App.
- The **viewer** is a static app deployed by GitHub Actions. In the browser it
  signs in to Entra ID and reads `reports/umami.json` and
  `reports/ga4-baseline.json` directly from Blob Storage with the owner's token.

## How the job runs

The Container Apps job wakes every six hours. On the second day of a new month,
it signs in to Umami with Playwright and requests a `Last 6 months` export for
`huuhkadotnet`. Later runs check the Resend inbound mailbox. Umami currently
sends a signed ZIP link from `support@umami.is`; the link observed on September
24, 2026 expires after three days. The ZIP contains `website_event.csv`,
`event_data.csv`, and `session_data.csv`.

The job saves the original ZIP in the private `umami` container, keyed by
SHA-256. It combines archived exports by `event_id`, so six-month overlap cannot
inflate counts. The report counts page views from events of type `1`, visitors
from unique `session_id` values, and visits from unique `visit_id` values.
Referrers count the first page view of each visit.

`umami.json` holds one row per page view and one per visit, so the browser can
compute any date range, comparison, and filter. Umami's session, visit, event,
and website IDs are replaced by array positions. Rows keep the timestamp, path,
title, hostname, referrer domain, UTM tags, browser, OS, device, screen size,
language, country, region, and city. That is more detail than totals, which is
why only the owner can read the `reports` container. Blobs are stored gzipped
with `Content-Encoding: gzip`.

Run modes, set as container args:

- `src/run.mjs`: the scheduled monthly flow.
- `src/run.mjs --bootstrap`: import an export email from the last 72 hours.
- `src/run.mjs --rebuild`: rebuild and republish `umami.json` from archived ZIPs
  without touching Umami or email. Use after report format changes.

## GA4 baseline

Before the switch to Umami (2026-09-21 17:50 UTC), the site used GA4. A
one-time GA4 Data API export (`ga4-export/`, run separately) is translated by
`src/ga4.mjs` into `reports/ga4-baseline.json`. The export's CSVs, period
sidecars and manifest are archived in the private `imports` container under
`ga4-data-api-2026-09-24T17-07-14Z/`. Earlier, superseded exports are archived
next to it.

GA4 reports are aggregates, so the baseline keeps them as aggregates instead of
inventing visits or visitors. It has one table per dimension, each with
additive daily rows (views, visits, bounces, total session duration, and users
for that day). Most tables also have GA4's own totals for every ISO week, month,
year, and the whole export:

| Table | GA4 report | Exact periods |
| --- | --- | --- |
| site | sessions | yes |
| path, entry | pages, landing pages (paths normalised to Umami's trailing slash) | no |
| referrer (and channel) | session source / medium | no |
| country, region, city | locations | yes |
| browser, os, device, screen | technology | yes |
| language | languages | yes |
| event | event names | no |

GA4 counts users and sessions separately in each period, so visitors are exact
only when the GA4 part of a range or chart bucket is one GA4 day, ISO week,
month, year, or the whole export. GA4 reports each dimension separately, so a
filter on one GA4 dimension works (Country is Finland), but filters on two at
once (Finland and Chrome) leave GA4 out of the view with a notice. So do filters
GA4 lacks, such as hour or title.

Values are mapped to Umami's keys where they correspond: country codes, cities
as `city|country`, device categories, screen sizes, and browser and OS names
translated to Umami's identifiers (GA4 "Edge" is Umami `edge-chromium`,
"Macintosh" is `Mac OS`). GA4 regions are names (`FI|Uusimaa`) and languages are
converted to base codes (`en`), while Umami records `FI-18` and `en-US`, so those
rows don't merge. Page views before 2022-08-15 have no page path in GA4 and
appear as "(not set)". GA4 bounces are sessions without engagement, which
differs from Umami's single-page-view bounce; the viewer notes this. GA4 rows
after 2026-09-21 are dropped, since they would overlap Umami. The owner confirmed
that GA4 and Umami visitors don't overlap, so they are added together.

To rebuild the baseline, which should not normally be needed:

```sh
cd analytics
npm run import:ga4 -- ../ga4-export/data/<run>
gzip -9 -c .output/ga4-baseline.json > .output/ga4-baseline.json.gz
az storage blob upload --auth-mode login --account-name huuhkametcep4lunoep3hw \
  -c reports -n ga4-baseline.json -f .output/ga4-baseline.json.gz \
  --content-type application/json --content-encoding gzip --content-cache-control no-cache --overwrite
```

The script checks every CSV against the export manifest's SHA-256 and every
period sidecar against its CSV's row count. It has no unit tests, since it runs
once; the reconciliation is the check. The result is about 9 MB of JSON, 1.9 MB
gzipped. Uploading needs a temporary Storage Blob Data Contributor role on the
container.

## Viewer

`viewer/` is a separate Vite, React, Tailwind, and shadcn/ui app with Recharts
charts. It follows Umami's dashboard: metric cards with period comparison, a
time chart by hour, day, week, or month, and tabbed tables for pages, entry and
exit pages, referrers, channels, UTM tags, browsers, OS, devices, screens,
countries, regions, cities, and languages. It also has a weekday-by-hour heatmap
and an events table. Selecting a row, weekday, or hour adds a filter that
applies to the whole report. Selecting a chart bar zooms into that period. The
range, comparison, interval, time zone, metric, and filters are kept in the
query string, so any view can be bookmarked.

Relative ranges such as "Last 7 days" end at the latest archived page view, not
at the current time, because exports arrive monthly.

Umami and GA4 are both *contributors* in `viewer/src/lib/combined.ts`. Each
answers the same questions for any range and filters: additive counts (views,
visits, visitors, bounces, duration), breakdown rows, and event rows, with null
where it can't answer. Totals and chart buckets are field-wise sums, and a
field is shown only if every contributing source provides it. Filters GA4 can't
answer, such as browser or hour, leave GA4 out of the view with a notice.

The theme follows the blog: Catppuccin Latte and Macchiato, a sun/moon switch
and a device-theme button, stored in `huuhka-theme`. `public/theme-init.js`
applies it before first paint, as a file because the CSP forbids inline scripts.

Access has two layers:

1. The Static Web App's `staticwebapp.config.json` requires the invited `owner`
   role for every route.
2. The app registration `huuhkadotnet-metrics-viewer` (single tenant,
   `fac3e3c9-0f0a-48cb-9545-2e364c6c4d42`) requests the delegated Azure Storage
   `user_impersonation` scope. It requires user assignment, and only the owner
   is assigned. Blob Storage then checks the owner's Storage Blob Data Reader
   role on the `reports` container. Shared-key and anonymous access are
   disabled on the account.

MSAL v5 runs every flow through `redirect.html`, its redirect bridge. That page
must stay registered as an SPA redirect URI for both hostnames. It and its MSAL
code in `/msal/` are the only public paths, with `favicon.svg`: Firefox-based
browsers don't send the Static Web App's auth cookie in MSAL's hidden sign-in
iframe, so an owner-only bridge would bounce to the Static Web App login host,
which the CSP refuses to frame. Neither path contains app code or data. Tokens are kept
in session storage. The CSP allows `login.microsoftonline.com` and the storage
account for fetches, and same-origin framing for silent token renewal. It still
forbids inline `<style>`, so chart colours live in `viewer/src/index.css`
rather than shadcn's generated `ChartStyle`, and dropdowns use `modal={false}`
so Radix does not inject scroll-lock styles.

The public IDs the build needs are in `viewer/.env.production`.

## Deployment

`.github/workflows/analytics.yml` runs on pull requests and on pushes to
`master` that touch `analytics/`. It tests both packages, builds the viewer, and
compiles the Bicep. On `master`, through the `production` environment and the
`huuhkadotnet-github` identity's OIDC credential:

- Viewer changes deploy the built `dist/` to the Static Web App. The deployment
  token is read with `az staticwebapp secrets list`, never stored.
- Job changes build and push the image to `huuhka.azurecr.io` (AcrPush), then
  point the job at the new digest.

`workflow_dispatch` can force `viewer`, `job`, or `both`. Infrastructure is not
applied from Actions, because the deploy identity can't create role assignments.
Apply `deployment/main.bicep` by hand when it changes.

## Local checks

```sh
cd analytics
npm ci && npm test
npm run build:report -- --export ../.deployment/umami-export.zip
npm run import:ga4 -- ../ga4-export/data/2026-09-24T17-07-14.485Z
cd viewer
npm ci && npm test && npm run build
npm run dev -- --host 127.0.0.1
```

In development the viewer reads `../.output/*.json` through `/data` without
signing in. The generated `analytics/.output/` directory is ignored by Git. Do
not commit exports, reports, browser state, or mailbox content.

## Provisioning

The vault `huuhkadotnet-metrics` already has `umami-email`, `umami-password`,
and `resend-api-key`. The Resend key needs Full access to read inbound mail. The
job uses versionless Key Vault references, so password rotation does not require
a code change. The Bicep template grants the job identity Key Vault Secrets
User, Blob Data Contributor on its own storage account, and AcrPull. It grants
the viewer owner Storage Blob Data Reader on `reports`, and the GitHub identity
AcrPush.

1. Build the image with `az acr build -r huuhka -t huuhkadotnet-analytics:<tag>
   -f analytics/Dockerfile analytics`, or let the workflow do it. Use the
   immutable digest for `image`.
2. Apply `analytics/deployment/main.bicep` to `huuhkadotnet-prod`, supplying
   `image`, `alertEmail`, and `viewerPrincipalId`, the owner's object ID in this
   tenant. The deploying identity needs permission to create role assignments
   in both `huuhkadotnet-prod` and `containerregistry`. RBAC can take a few
   minutes to propagate; rerun the deployment if the first job creation reaches
   Key Vault or ACR early.
3. `metrics.huuhka.net` is a CNAME to the Static Web App's default hostname and
   uses `cname-delegation` validation.
4. Create the viewer app registration once. Add both `/redirect.html` URLs as
   SPA redirect URIs and the Azure Storage `user_impersonation` delegated
   permission, grant tenant consent, require assignment, and assign the owner.
5. In the Static Web App's **Role Management**, invite the owner's Entra account
   to the `owner` role.
6. Start the job manually to request the first export. It polls for the email
   at the next scheduled run. Arguments such as `--bootstrap` or `--rebuild`
   must go through `az containerapp job start --yaml`, because the Azure CLI
   treats them as its own flags when passed through `--args`:

   ```sh
   mkdir -p .deployment
   az containerapp job show -g huuhkadotnet-prod -n huuhkadotnet-metrics-export \
     --query properties.template -o json > .deployment/metrics-job-template.json
   node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync(".deployment/metrics-job-template.json")); x.containers[0].args=["src/run.mjs","--rebuild"]; fs.writeFileSync(".deployment/metrics-run.yaml",JSON.stringify(x));'
   az containerapp job start -g huuhkadotnet-prod -n huuhkadotnet-metrics-export \
     --yaml .deployment/metrics-run.yaml
   ```
7. Check the app as the owner, then check that a signed-out browser and a
   different account see neither the app nor the blobs.

The job sends at most one failure email per UTC day using Resend's idempotency
key, from the verified `mail.huuhka.net` domain. A failed run leaves the
previous `umami.json` in place.

## Recovery and limits

- The monthly request and email handoff are recorded in `state.json` in the
  `umami` container. If no email arrives for 48 hours, the job marks the attempt
  failed and requests again on its next run.
- If Umami changes its login, export form, sender, ZIP contents, or download
  host, the job fails closed and sends an alert. Review the new format before
  changing the selectors or allowlist.
- ZIP archives currently have a 100 MB compressed download limit. The rebuild
  reads all archived ZIPs into memory. Revisit this if traffic or retention
  approaches the 2 GiB job memory limit.
- The viewer computes everything in the browser. At a few hundred thousand page
  views this stays fast; beyond about 10–20 MB of JSON, split the report by year.
- Content blockers such as uBlock Origin may block `*.blob.core.windows.net`.
  The viewer then reports that it could not reach Blob Storage; allow the
  storage host for `metrics.huuhka.net`.
- Storage is reachable over the internet but accepts only Entra tokens with the
  reader role. The Static Web App is private by role on the Free tier, not
  network isolated.
- The Container Apps environment has no Log Analytics destination to avoid a
  standing ingestion bill. Azure keeps recent job execution status; detailed
  container logs are not retained centrally. Failure email is the primary
  operational signal.
