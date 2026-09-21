# Analytics and comments

Investigated September 21, 2026. A future analytics replacement must be free.
The owner chose Umami Cloud and giscus without importing Disqus data.

## Current implementation

The owner replaced GA4 with Umami Cloud on September 21, 2026. The supplied
website ID is `3f673ea9-160f-4880-8d92-226feaa1e6d9`; it is a public embed ID,
not a secret. `src/lib/analytics.ts` loads `https://cloud.umami.is/script.js`
once on the exact public HTTPS hostnames in `src/lib/site-integrations.ts`.
Local and Azure preview hosts never load the tracker. The loader and tracker
honor Do Not Track.

There is no consent banner or settings panel. The owner confirmed there are no
existing rejection choices to preserve. The GA script, consent persistence, and
cookie-writing integration have been removed. `/privacy/` explains the switch.
The loader does not read or write browser storage. Umami's tracker can read its
own optional `umami.disabled` opt-out flag and does not write analytics cookies.
No existing Google data or browser cookies are deleted by this change.

The tracker excludes query strings and fragments from page URLs and referrers,
including site search terms and giscus authentication tokens. This also omits
UTM campaign attribution; referring sites are still available. There are no
custom events, persistent distinct IDs, or performance collection configured.

The owner will handle export automation separately. Do not add a paid plan,
API integration, export job, or storage service. Umami Cloud Hobby's documented
six-month retention makes that follow-up important for long-term history.
Cookieless tracking is not a blanket statement of legal compliance; keep the
public privacy disclosure accurate about third-party processing.

Tracker configuration checked against the actual Cloud script and:

- https://umami.is/docs/tracker-configuration
- https://umami.is/docs/data-collection
- https://umami.is/privacy

Comments appear only on blog posts. Show comments loads giscus separately from
analytics consent. Each thread maps to the article's root-level path with strict
matching. No Disqus data is imported. The GitHub link remains available without
JavaScript and when the embed fails.

At the owner's request, `gh` changed `DrBushyTop/huuhkadotnet` from private to
public and enabled Discussions. The repository and Announcements category IDs
were read back from GitHub and saved in `src/data/giscus.json`. The prior local
history matched the remote default branch; a limited pattern scan of 478
historical text blobs found no obvious credentials. This was not a comprehensive
security audit.

The giscus GitHub App was installed for this repository during setup. Its
installation page is:
https://github.com/apps/giscus/installations/new

GitHub CLI configured visibility and Discussions; the initial GitHub App
installation required GitHub's browser UI. Verify the installation with:

```sh
curl --fail-with-body 'https://giscus.app/api/discussions/categories?repo=DrBushyTop%2Fhuuhkadotnet'
```

The setup check returned the repository and category IDs saved in the local
configuration. The live giscus widget opened with zero comments and a GitHub
sign-in button for a real article path. No test comment was posted.
`giscus.json` restricts allowed origins and must reach the default
branch alongside the site changes. Publish both through the existing Blog
workflow, then run the live checks below.

After publication, verify a page-view request to Umami with the supplied website
ID, no Google requests, and no analytics cookies. Check the Umami dashboard
separately for ingestion. Giscus sign-in, posting, and moderation still need an
authenticated check. Existing video embeds are separate third-party services
and need a separate privacy audit. `/privacy/` describes these boundaries.

Implementation references:

- https://developers.google.com/tag-platform/security/concepts/consent-mode
- https://developers.google.com/tag-platform/security/guides/privacy
- https://developers.google.com/analytics/devguides/collection/ga4/reference/config
- https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md

## Historical GA4 investigation: cookieless collection after rejection

Investigated September 21, 2026. This option was considered before the owner
chose Umami. It was not implemented.

Google calls this Advanced Consent Mode. Load the Google tag on public pages
after queuing default consent as denied, rather than waiting for acceptance.
Keep `analytics_storage` denied after rejection; grant it only after acceptance.
Keep advertising consent denied in either case. With denied analytics storage,
Google sends measurements without reading or writing analytics cookies.

Our current `ga-disable-G-X678YYBF80` flag blocks collection altogether.
Advanced mode would need to stop using that flag for ordinary cookie rejection,
while keeping all collection disabled on preview hosts. Initialization would
move outside the accepted-only branch. Keep the explicit page-view guard and
sanitized URLs, and test unknown, rejected, accepted, revoked, expired, and
cross-tab consent states. Verify actual requests and cookies, not just queued
consent commands.

These requests still disclose activity to Google. Its documentation lists
timestamps, user agents, referrers, consent state, and a random value generated
per page load among possible ping contents. Without persistent identifiers,
ten page views do not establish whether one person or ten people visited.

There is also a reporting limitation. Google's behavioral-modeling prerequisites
include both:

- At least 1,000 events per day with analytics storage denied for at least
  seven days.
- At least 1,000 daily users sending events with analytics storage granted for
  at least seven of the preceding 28 days.

Meeting these thresholds does not guarantee eligibility. Google explicitly
says that when there is insufficient consented traffic to train the model,
events from users who decline consent are not reported. Do not promise that
enabling cookieless collection will recover missing visitor counts in standard
reports for this blog. We have not inspected its traffic or modeling eligibility.

The existing controls say Reject analytics and promise that Google loads only
after acceptance. They cannot stay unchanged if rejected visits are sent to
Google. Both the controls and privacy page would need to disclose the new
behavior. Merely changing the button to Reject cookies does not establish a
lawful basis for the collection.

Traficom's guidance covers technologies beyond cookies, including tracking
pixels and access to information on terminal devices. Avoid assuming that
Google's cookieless mode is automatically exempt from consent requirements.
Assess the actual collection and applicable legal basis before enabling it.
The owner subsequently chose Umami instead; this GA4 option is superseded.

Primary sources checked:

- https://developers.google.com/tag-platform/security/concepts/consent-mode
- https://developers.google.com/tag-platform/security/guides/consent
- https://support.google.com/analytics/answer/11161109?hl=en
- https://www.traficom.fi/files/media/file/Guidance_on_the_use_of_web_cookies_for_the_service_providers.pdf

## Historical GA4 production deployment check

The Blog workflow run `35629780493` successfully deployed commit
`7a9e2a47508aadb550fb223806b9976ca9a9490c` on September 21, 2026.
Build, tests, packaging, infrastructure compilation, deployment, and the
published-route verification passed.

On the public article `/ci-with-azure-pipelines-yaml/`, the shared browser
showed the new navigation, privacy controls, and click-to-load comments.
Before acceptance and after initial rejection there were no Google or giscus
resource requests and no cookies. Acceptance loaded the Google tag and created
the two GA4 cookies. The tag attempted a `page_view` for `G-X678YYBF80`, with
the verification query parameter omitted from the reported page location.
An enhanced-measurement scroll event was also attempted.

The browser network diagnostics marked both collector requests
`net::ERR_ABORTED`. Consequently this verifies tag initialization and event
construction, not successful delivery or GA4 reporting. An authenticated
Realtime check remains outstanding. Do not describe the collector as verified.

Revoking consent cleared the GA cookies, restored the collection-disable flag,
and produced no additional collector entries during the subsequent check.
Show comments loaded the giscus iframe after rejection. Its article-path
mapping was correct; the widget reported no existing discussion, which is
expected before the first comment. Posting, authentication, and moderation
were not exercised.

## Existing Google Analytics

Browser checks used `https://huuhkadotnet-prod.azurewebsites.net` directly,
including article paths rather than following links to `www.huuhka.net`.

| Path | Observed GA4 event | Measurement ID |
| --- | --- | --- |
| `/` | `page_view` | `G-X678YYBF80` |
| `/building-your-own-pr-reviewer-with-coding-agents/` | `page_view` | `G-X678YYBF80` |
| `/ci-with-azure-pipelines-yaml/` | `page_view` | `G-X678YYBF80` |

The source HTML configures `UA-152228894-1`. At runtime that tag also loads
`gtag/js?id=G-X678YYBF80` and sends requests to
`https://region1.google-analytics.com/g/collect`. Their parameters include
`v=2`, `tid=G-X678YYBF80`, `en=page_view`, and the correct Azure-hosted page URL
in `dl`. The site's canonical URL does not replace that page-location parameter.

The observed behavior is consistent with a connected Google tag; the account's
configuration was not inspected.

The browser created `_ga`, `_ga_X678YYBF80`, `_gid`, and
`_gat_gtag_UA_152228894_1` cookies. No consent prompt was accepted during these
visits, and no `consent` commands appeared in the inspected `dataLayer`.
Do not treat `anonymize_ip: true` as a replacement for consent.

**Verdict:** browser-side GA4 tracking is active on the sampled legacy pages.
End-to-end reporting is not yet proven. Resource Timing exposed status `0` for
these cross-origin requests, not a verifiable collector HTTP status.
No authenticated GA4 dashboard or Data API was connected. Test visits themselves
may appear in the reports.

To finish verification, open the property whose web stream has measurement ID
`G-X678YYBF80`, visit a known Azure-hosted post, and inspect Realtime for that
page. Check hostname, page location, internal-traffic filters, and recent
historical reports. DebugView requires a debug-enabled session. Verify the
actual production hostname separately after choosing an implementation.

Google's Universal Analytics retirement does not by itself prove that this
site's GA4 collection is broken:
https://support.google.com/analytics/answer/11583528

## Free analytics shortlist for a later replacement

### Umami Cloud Hobby

The closest fit for the requested dashboard. Umami distinguishes page views,
unique visitors, and visits, and reports popular pages, referrers, countries,
and campaigns.

The live pricing page currently lists:

- $0 per month.
- One website.
- Up to 100,000 events per month.
- Six months of data retention.
- Community support.

A page view counts as an event; custom events and stored event properties can
also consume the allowance. The generic pricing FAQ describes overage billing
but does not clearly explain Hobby-specific behavior. Confirm that before
enabling collection with a strict zero-cost requirement. Do not start a Pro
trial or enable paid overages.

Six-month retention is the bigger drawback for a long-running blog. Export
regularly if older history matters. Do not assume free API access; the plan
lists that under Pro.

Sources:

- https://umami.is/pricing
- https://docs.umami.is/docs/metric-definitions
- https://docs.umami.is/docs/api-reference/get-website-stats
- https://docs.umami.is/docs/api-reference/get-website-metrics

### GoatCounter hosted

A good option for a simple personal blog without another server to maintain.
The hosted service is donation-supported and free for reasonable public usage.
Its terms allow personal sites and small-to-medium businesses, but not unlimited
traffic at any scale. It provides per-page counts, referrers, campaigns, and
location/browser information.

There is an important metric distinction. Its documented default deduplicates
visits to each path within an eight-hour session. Reloading an article is not
another visit. Disabling session counting makes each load count instead.
Do not promise simultaneous GA-style unique-user and raw-pageview reporting
from the default dashboard. Check its demo against the reports you actually
want before choosing it.

Sources:

- https://www.goatcounter.com/
- https://www.goatcounter.com/help/terms
- https://www.goatcounter.com/help/sessions
- https://www.goatcounter.com/help/privacy

### Cloudflare Web Analytics

Free and usable with the Azure-hosted site without moving hosting or DNS.
It covers page views, visits, popular paths, referrers, and country information.
Its "visit" means an arrival from another hostname or a direct link, not a
deduplicated person. That makes it a weaker match for the unique-user requirement.

I  This is my fallback if
simple traffic and performance totals matter more than visitor counts.

Sources:

- https://developers.cloudflare.com/web-analytics/
- https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/
- https://developers.cloudflare.com/web-analytics/configuration-options/filters/
- https://developers.cloudflare.com/web-analytics/faq/

### Recommendation

Start with **Umami Hobby** if six-month retention is acceptable and its free-plan
limit behavior is confirmed. Choose **GoatCounter hosted** if a simpler
visit-count model meets the need. Cloudflare is not my first choice when
unique visitors are an explicit requirement.

Self-hosted Umami is another option, but free software is not automatically
free operation. It needs an application server, database, backups, updates,
and monitoring. Azure sponsorship may cover the bill while credits remain;
that is different from a permanently free hosted service.

I would not build a custom analytics backend for these requirements.

No privacy-preserving visitor count is a count of known people. Session
boundaries, shared networks, browser changes, and blockers affect results.
Treat it as an estimate. Missing referrers also do not prove that a visitor
typed the URL.

## Consent and privacy

For a Finnish-operated site, Traficom's guidance is the relevant starting point.
It covers cookies and other device-access technologies, not just cookie files.
Non-essential analytics generally needs prior consent. "Cookieless" on a
vendor page is not sufficient to settle that legal assessment.

Umami and GoatCounter advertise cookieless collection. Before relying on a
no-banner configuration, assess the actual data flow, including IP/user-agent
processing, identifiers, retention, hosting region, and third parties. Publish
a privacy notice either way. This is an implementation assessment, not legal
advice; confirm the chosen configuration with qualified privacy advice.

If consent is required, the proposed implementation is:

- Do not load optional analytics until accepted.
- Offer equally easy Accept and Reject choices, with no preselected consent.
- Keep a persistent Privacy settings link to change or withdraw the choice.
- Stop optional collection and clear applicable first-party tracking state on
  withdrawal.
- Handle external media and comments separately from analytics. Do not imply
  that accepting comments also accepts tracking.

Audit existing video embeds too. A privacy-friendly analytics replacement does
not make unrelated third-party embeds consent-free.

Source, especially sections 3.2 and 4:
https://www.traficom.fi/files/media/file/Guidance_on_the_use_of_web_cookies_for_the_service_providers.pdf

## Lightweight comments

### giscus

My first choice for this developer audience if GitHub sign-in is acceptable.
It is free, open source, has no advertising or tracking, and stores comments
in GitHub Discussions. It requires a public discussion repository, the giscus
GitHub app, and an enabled discussion category. Readers need GitHub accounts
to comment through the widget.

Moderation happens on GitHub. Comments can be hidden or deleted, discussions
locked, and disruptive users blocked. Hiding minimizes a comment rather than
making it secret; delete material that must not remain readable. This is
post-publication moderation, not a general approval queue.

I suggest a dedicated public comments repository, separate from private site
source. Map discussions using stable article paths, not titles that may change,
and restrict allowed origins. Load the widget only when a reader chooses
Show comments, with a direct GitHub discussion link as a fallback.

GitHub remains a third party. Its authentication and privacy terms still matter;
"no tracking" is not the same as no external requests.

Sources:

- https://giscus.app/
- https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md
- https://github.com/giscus/giscus/blob/main/PRIVACY-POLICY.md
- https://docs.github.com/en/discussions/managing-discussions-for-your-community/moderating-discussions
- https://docs.github.com/en/communities/moderating-comments-and-conversations/managing-disruptive-comments

### Remark42

The self-hosted alternative if GitHub-only participation is too restrictive.
It supports multiple login providers, email and optional anonymous access,
comment removal, user blocking, and Disqus imports. It uses authentication and
CSRF cookies rather than advertising trackers.

The trade-off is operating a service with persistent storage and backups.
Email login also needs mail delivery. Its documented built-in bot protection
is basic; do not assume that anonymous comments will be spam-free.

Sources:

- https://remark42.com/
- https://remark42.com/docs/getting-started/installation/
- https://remark42.com/docs/manuals/admin-interface/
- https://remark42.com/docs/manuals/spam/

### Hyvor Talk

A managed alternative if paid commenting is acceptable. It advertises no
tracking in the embed and offers moderation controls, spam detection, and
comment approval. It is a subscription, so it is not a zero-cost replacement.
I would compare it only if guest participation and managed moderation outweigh
the cost.

Sources:

- https://talk.hyvor.com/pricing
- https://talk.hyvor.com/privacy
- https://talk.hyvor.com/docs/moderation

## Navigation changes and verification

About is hidden in both navigation layouts. The author archive remains reachable
from article bylines so existing routes are preserved. Sessionize now appears in
the desktop social links, the phone header, and the phone menu. On phones it
replaces the standalone GitHub shortcut; GitHub remains in the menu.

Shared-browser header checks covered desktop at 1280 by 800 and the phone
layout and menu at 390 by 844. Neither layout overflowed horizontally. Opening
the menu focused Close; Escape closed it, released the scroll lock, and returned
focus to the menu trigger. The Sessionize destination opened the expected public
speaker profile. This was not a whole-site keyboard or screen-reader audit.

The consent panel and comment section were checked at 1280 by 900 and 390 by
844. Rejecting, reopening settings, and accepting with Enter saved the expected
choice and restored focus. Preview acceptance still made no Google or giscus
requests. Tests exercised production-host behavior with simulated browser
boundaries, including expiry, blocked storage, revocation, stable thread
mapping, and embed failure. GA4 ingestion, authenticated giscus posting, and
moderation still need a live post-deployment check.

The design doctor reported a pre-existing stale sidecar warning. Only its
navigation example was updated here; unrelated design metadata was not
regenerated. No design tokens changed.
