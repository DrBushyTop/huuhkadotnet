# Ghost migration

The published-content migration runs locally. Production Ghost, Azure resources,
DNS, and hosting configuration have not changed.

## Source and scope

The import reads the public Ghost Content API at `https://www.huuhka.net`.
It discovers the public API key from the homepage and follows API pagination.
The September 21, 2026 snapshot contains 55 public posts, one community page,
36 public tags, and one author. Its 94 sitemap URLs all have local routes.

This replaces the plan's database-export step. Every published body was accessible,
and the API exposes the timestamps, tags, captions, canonical overrides, and
custom SEO fields needed here. No production credentials or infrastructure access
were necessary. This is not a backup of drafts, members, private settings, or
other unpublished Ghost data.

The converter started from Jussi Roine's `astro-formatter`:

```text
https://github.com/jussiroine/astro-formatter
commit 8faff4fc188b903255e682f6bc55063f5c081ba5
package license: ISC
```

`scripts/migration/convert.mjs` retains its Turndown conversion and frontmatter
approach, adapted to preserve full timestamps, exact slugs, existing tags,
code-language identifiers, MDX-safe text, and original anchors. It does not call
Ollama, invent tags, copy the upstream sample export, or add analytics values.

## Reimport deliberately

```sh
npm run migrate
npm run build
npm test
npm run validate:migration
# With npm run dev running in another terminal:
npm run validate:local
```

The importer caches public API responses in ignored `.migration/`. To fetch a
new snapshot, use the explicit commands below. The chained npm script does not
forward the refresh flag to the importer:

```sh
node scripts/migration/import-ghost.mjs --refresh
node scripts/migration/thumbnails.mjs
```

Reimport overwrites the imported MDX files. Commit local content edits first and
review the diff. It does not delete local posts absent from the export. Normal
builds read committed MDX and assets only, never Ghost or Azure.

## Content handling

- Posts stay at `/<original-slug>/`. Tags stay at `/tag/<original-tag-slug>/`.
- `/author/pasi/`, `/community-activities/`, `/rss/`, and `/sitemap.xml` work locally.
- The homepage uses the complete collection, showing 12 posts at a time with
  search across all posts. Without JavaScript, every post remains visible.
- Original images live in `public/images/ghost/`. Archive thumbnails are separate
  WebP derivatives. `migration/assets.json` and adjacent JSON files record sources.
- At build time, `scripts/rehype-content.mjs` groups standalone image paragraphs
  and adjacent captions into semantic figures without rewriting imported MDX.
  Authored image links retain their destinations. The approved reader
  widens these figures on desktop; JavaScript adds a captioned zoom viewer only
  to unlinked images outside authored `ReaderFigure` blocks.
- Series callouts become native reading navigation. Other Ghost callouts become
  blockquotes. Bookmark cards retain their link, title, and
  description, but omit publisher badges and remote preview thumbnails.
- YouTube embeds remain external embeds, not Ghost dependencies.
- Theme-specific CSS injections are intentionally omitted. Tables scroll within
  the article instead of using Ghost's injected table styles.
- Original code languages remain in MDX, including uppercase `YAML`. Shiki aliases
  handle `YAML` and `pwsh`. Unlabelled source blocks remain plaintext.
- One broken source fragment is corrected explicitly in
  `migration/corrections.json`. The authored prose is unchanged.
- RSS contains titles, original publication dates, tags, and descriptions with
  canonical article links. It is an excerpt feed, not a full-body feed.

`migration/inventory.json` is a comparison snapshot, not application content.
It records imported text blocks, code, headings, metadata, and links so validation
can detect conversion loss without needing the export cache. New content belongs
in MDX, not the inventory. Refresh the inventory only during a deliberate import.

## Verification

`validate:migration` compares the build to every imported text block and code
block, original titles/timestamps/tags, canonical links, source image references,
original heading anchors, all source sitemap URLs, and local link targets.
`validate:local` requests those routes, every AMP redirect, RSS, sitemap, and a 404
from the dev server. Unit tests exercise conversion edge cases and archive search.
Image tests check figure and caption grouping and preserve linked images.
Series validation checks that every link from a moved callout appears in the
native navigation. The inventory records those callouts separately from prose.

The browser spot checks cover a recent article, the oldest article, the reading
layout on desktop and phone, and horizontal code scrolling. They are not a full
keyboard or screen-reader audit. External destinations and embedded video playback
are not exhaustively verified.

The earlier image pass records five viewport captures and its checks in
`.impeccable/review/reader-images/verification.md`. Desktop and phone checks
covered image zoom, captions, dismissal, focus return, and scroll unlocking.
Those captures predate removal of the visible Zoom cue.

The reader cleanup and contents fix passed review with no material fixes.
`.impeccable/review/reader-cleanup/` and `.impeccable/review/reader-contents/`
contain desktop and phone captures at 1440 by 1000 and 390 by 844 CSS pixels.
The phone contents disclosure opens from its initially collapsed state; all three
tested links resolve. The three agents anchor lands at 104px, and desktop active
tracking follows forward and reverse scrolling. Neither width has horizontal
overflow. Original article content and anchors remain unchanged.

Build passed for 95 pages and all 20 tests passed. Migration validation checked
56 content pages and 94 source URLs with zero errors; local checks covered 94
routes, 56 AMP redirects, RSS, and the 404. No whole-site keyboard, screen-reader,
or real Safari audit was performed.

## Before production, not part of this pass

- Refresh the public snapshot if the Ghost site has changed, then rerun validation.
- Choose the hosting adapter and implement real HTTP redirect rules there. Astro
  dev serves AMP requests as 301. The static build emits HTML redirect documents,
  which are not HTTP 301 responses by themselves.
- Configure `/rss/` as XML at the chosen host. Astro emits an extensionless RSS
  file. Dev sets its XML content type, but a generic static server may not.
- Preserve older paginated archive URLs if required. They are outside Ghost's
  sitemap and have not been migrated; the new homepage uses Load more.
- Confirm a working analytics property. The live homepage contains only legacy
  Universal Analytics ID `UA-152228894-1`, not a GA4 measurement ID. No analytics
  script is copied or run locally.
- Remove the deliberate `noindex, nofollow` and blocking `robots.txt` only as part
  of the eventual cutover. Verify canonical URLs, redirects, feed headers, and
  indexing on the chosen host before changing DNS.

## Series navigation

The import extracts three recurring themes into `src/data/series.json`: Agentic
Dev, AI Dev Platform, and Secure Enterprise AI Tooling on Azure. Each definition
has an ID, title, and ordered list of post slugs. Posts declare their memberships
in the frontmatter `series` array, so an article can belong to more than one group.

Only explicit opening theme-navigation callouts move out of the body. Warnings,
updates, and other author notes remain. The importer rejects inconsistent ordering
or missing members. `migration/inventory.json` records each moved callout and its
original links for comparison.

The reader shows collapsible series lists and a scroll-tracking contents list.
Its bottom link continues within the first series when possible, otherwise to
the next older article. Optional content editors remain deferred.
