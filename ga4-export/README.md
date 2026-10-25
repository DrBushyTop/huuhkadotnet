# One-off GA4 Data API export

This folder is separate from the production Umami archive in `analytics/`.
The script uses Node 22 or newer with no installed dependencies. It makes only
read-only Google Analytics Data API requests. It does not change GA4 settings,
saved reports, Google Cloud resources, or the Umami importer.

## Run

The defaults match the previous browser exports: property `289649733`,
September 27, 2017 through September 23, 2026. A requested date range does not
prove data exists throughout it.

```sh
node ga4-export/export.mjs --dry-run
node --test ga4-export/export.test.mjs
```

Obtain a short-lived OAuth access token for the Google account with access to
the property, with only this scope:

```text
https://www.googleapis.com/auth/analytics.readonly
```

For a one-time run, Google's OAuth Playground can obtain it without installing
gcloud or creating local refresh credentials. Choose the read-only scope,
authorize the account, and exchange the authorization code. Do not export or
save the refresh token. An existing Analytics browser login is not an API token.

To supply the access token using a shell prompt without echoing it or placing
the token itself in shell history, use:

```sh
read -r -s GA4_ACCESS_TOKEN
export GA4_ACCESS_TOKEN
node ga4-export/export.mjs
unset GA4_ACCESS_TOKEN
```

The script also accepts `--token-stdin` for a trusted credential provider.
`--receive-token` starts a single-use loopback receiver for an explicit handoff
of the access token shown in Google's OAuth Playground. It accepts requests
only from `https://developers.google.com` at a randomly generated endpoint
and keeps the token in memory. It does not extract cookies or browser sessions.
The browser may ask for permission to connect to the local receiver.

Authentication errors, missing API enablement, or property access errors stop
the export. They are not worked around with browser cookies or broader scopes.

## Files and verification

Each run creates a new ignored `data/<timestamp>/` folder. Existing output
directories are never overwritten. `--out DIR`, `--start`, `--end`, and
`--property` override the defaults.

The script saves:

- `schema.json`, the property's dimension and metric definitions.
- Original request and response JSON for every page.
- Nine core CSVs: session totals, daily/weekly/monthly/yearly sessions, daily
  sources, daily landing pages, daily page paths, and daily event names.
- Forty location/environment CSVs: countries, regions, cities, browsers,
  operating systems, device categories, screen resolutions and languages.
  Each has whole-period, daily, weekly, monthly and yearly reports with user
  counts, sessions, bounce rates, engagement and duration metrics.
- Calendar-period JSON sidecars with exact queried boundaries and partial-period
  flags for weekly, monthly and yearly values.
- `manifest.json`, including completion status, row counts, checksums, coverage,
  and response metadata. A failed or interrupted export is not complete.

Pagination uses all requested dimensions as a stable sort. The script checks
headers, row widths, row counts and duplicate dimension keys, and rejects
incomplete pagination. It retries transient HTTP errors at most three times.

Rates are fractions, not percentages. `averageSessionDuration` is in seconds.
`userEngagementDuration` is total foreground engagement time in seconds.
Divide that total by sessions for average engagement time per session, with
an explicit zero-session rule. It is not the same metric as session duration.

Use `session-totals.csv` for whole-period rates, durations and distinct users.
Do not sum distinct users or average row-level rates without weighting.
Keep source and landing-page breakdowns separate. Session counts across dates
and dimensions may not sum to the whole-period total.

Inspect metadata for timezone, thresholding, sampling, truncation and `(other)`
data loss before using a report. Raw API response rows are aggregate data, not
raw visits. Do not generate synthetic events or IDs to merge them with Umami.
The date range includes the September 21, 2026 provider change, so an importer
needs a deliberate cutoff. Query strings and source values can contain
visitor-supplied text; import CSV columns as text rather than executing formulas.

Data and credentials must not be committed. The script logs report names,
row counts and output locations, never tokens. Only the code and these
instructions belong in Git.

## Weekly and yearly viewer values

`--periods-only` requests whole-period totals and daily, weekly, monthly and
yearly metrics without downloading the larger source and page breakdowns.
For the current baseline cutoff:

```sh
node ga4-export/export.mjs --receive-token --periods-only \
  --start 2021-10-12 --end 2026-09-21
```

Weekly reports use `isoYearIsoWeek`, not Google's Sunday-start `yearWeek`.
This matches the viewer's Monday-start calendar weeks. Yearly reports use
calendar years; monthly reports use `yearMonth`. Each bucket's `totalUsers`
comes directly from GA4. It is not a sum of daily users. The same applies to
bucket bounce rates and average session duration.

The property's API timezone is recorded in each response. Existing viewer
code offers browser-local and UTC dates. Neither can silently replace GA4's
property timezone for these aggregates. Partial weeks and years have explicit
query bounds in the sidecars. In particular, 2026 is not a complete year.

These exports can support matching calendar ranges. They cannot supply a
deduplicated visitor count for every rolling 7/30/90-day or custom date range
by adding buckets; those ranges need their own API request. Filtered visitor
counts also need a matching filtered query.

The owner confirmed that this archive has no cross-provider duplicates.
The viewer may therefore add GA4 and Umami visitor totals under that assumption.
This does not make daily GA4 users additive across dates. Bounce and duration
definitions must remain labeled, and rates and averages must not be added.
No viewer integration is performed by this script.

## Location and environment

A normal full run includes all 49 reports. For a new export using the baseline
cutoff, without overwriting an earlier run:

```sh
node ga4-export/export.mjs --receive-token \
  --start 2021-10-12 --end 2026-09-21
```

Countries include both ISO country IDs and country names. Regions also include
country context, and cities include country and region context, so identically
named locations are not silently combined. The other breakdowns are queried
separately. Their period sidecars preserve all dimension values and metric
columns, not just the calendar key.

These files can answer individual breakdowns for matching periods. They cannot
answer arbitrary combined filters such as country plus browser; that needs a
joint query. Do not sum breakdown rows to reconstruct distinct visitors.
Preserve `(not set)`, `(other)`, thresholding and data-loss metadata rather than
replacing them with guessed values. `--periods-only` excludes these breakdowns.

## Google references

- https://developers.google.com/oauthplayground/
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
- https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
- https://analyticsdata.googleapis.com/$discovery/rest?version=v1beta
