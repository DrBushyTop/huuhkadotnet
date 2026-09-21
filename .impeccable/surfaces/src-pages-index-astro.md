---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets:
  - "src/lib/posts.ts"
  - "src/lib/search.ts"
  - "src/components/CardImage.astro"
  - "src/components/ArticleCard.astro"
  - "src/styles/global.css"
---

# Homepage

Mode: Read. Preserve the approved homepage composition while replacing the preview entries with the complete local content collection. No deployment.

## Direction contract

THESIS: A personal article index with owner-selected popular articles before the dated archive. No oversized introduction, category filters, or excerpts.

OWN-WORLD: White header, small blue geometric H, uppercase Geist Mono navigation, slate text, and quiet blue links. Popular cards are compact filled rectangles. Archive cards retain pale fill, fine borders, rounded image corners, 19px medium Geist Sans titles, up to two topic tags, and the date/read-more footer. Geist Sans also sets the wordmark and section headings. Preserve the shared palette, card padding, and code font in DESIGN.md.

STORY: Readers recognize Pasi, choose a suggested article, or search titles and topics across all 55 imported posts. Article cards, community activities, and RSS open local routes. About is hidden from navigation until its content is ready; the author archive is preserved. The popular group uses the four selected articles from the owner-supplied analytics screenshot, in ranking order, with the front page excluded. The selection is fixed rather than a live analytics feed.

FIRST VIEWPORT: A compact header with LinkedIn, GitHub, Sessionize, and RSS links. A small portrait introduction, four popular cards in two columns above 700px and one on phones, then the dated archive with search beside its heading. Desktop archive cards use three columns; phone cards stack. The phone header stays on one row with Sessionize and a full-screen navigation menu. GitHub remains available in that menu.

FORM: The approved image-led homepage remains the composition reference. Use the real portrait and published post images, with local WebP archive thumbnails. Keep introduction padding at 24px and the archive separation at 28px on desktop and 24px on phones. Preserve padding inside archive cards. Card images fit fully within the existing containers, with a blurred, muted copy of the same image behind them to fill unused space.

FINISH: Keep documentation matched to source. Browser evidence covers only its recorded pages, widths, and interactions; do not infer whole-site or keyboard certification.

## Content and behavior

- Show 12 articles initially and reveal another 12 with Load more, until the collection is exhausted. Do not switch to automatic infinite scrolling.
- Search all posts, including hidden batches; retain URL query state, clear actions, live counts, and the empty state.
- Without JavaScript, show all articles and hide search and loading controls.
- Keep metadata from the collection. Display at most two non-interactive topic labels on cards; full linked tags belong on article pages.
- Keep noindex and analytics disabled during local migration. Production requirements belong in `docs/migration.md`.

## Card images

`CardImage` is shared by homepage popular and archive cards and by tag and author
archive cards. The sharp foreground uses contain; the decorative background uses
cover, a 16px blur, scale 1.12, and opacity 0.3. Both layers use the same existing
URL and loading policy. No image assets change. Archive containers keep their 1.6
ratio; popular containers remain 72px on desktop, 56px at tablet widths, and 62px
on phones. Reader images and zoom are unchanged.

The card-image reviewer found the implementation ready to ship, with only stale
cropping documentation to fix. This refresh resolves that documentation mismatch.
Captures in `.impeccable/review/card-images/` cover the homepage at 1440 by 1000
and a portrait-image search result at 390 by 844 CSS pixels. All 20 tests, the
95-page build, migration checks, and local route checks passed.

Browser checks confirmed fuzzy search, empty results, Escape reset, 12 initial
articles, and 24 after Load more, with focus on the first newly revealed card.
The dev-server Fuse import fix preserves these behaviors; it does not change
pagination to infinite scrolling. On September 21, 2026, the owner requested hiding
About and adding Sessionize to the top right. These navigation changes are now
implemented without changing the shared visual tokens.
