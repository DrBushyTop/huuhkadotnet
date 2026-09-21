---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets:
  - "src/lib/posts.ts"
  - "src/lib/search.ts"
---

# Homepage

Mode: Read. Preserve the approved homepage composition while replacing the preview entries with the complete local content collection. No deployment.

## Direction contract

THESIS: A personal article index with provisional popular picks before the dated archive. No oversized introduction, category filters, or excerpts.

OWN-WORLD: White header, small blue geometric H, uppercase Geist Mono navigation, slate text, and quiet blue links. Popular cards are compact filled rectangles. Archive cards retain pale fill, fine borders, rounded image corners, 19px medium Geist Sans titles, up to two topic tags, and the date/read-more footer. Geist Sans also sets the wordmark and section headings. Preserve the shared palette, card padding, and code font in DESIGN.md.

STORY: Readers recognize Pasi, choose a suggested article, or search titles and topics across all 55 imported posts. Article cards, About, community activities, and RSS now open local routes. The popular group uses the newest three entries as provisional picks without a sample-selection label or a verified analytics claim.

FIRST VIEWPORT: A compact header with LinkedIn, GitHub, and RSS links. A small portrait introduction, three popular cards, then the dated archive with search beside its heading. Desktop archive cards use three columns; phone cards stack. The phone header stays on one row with GitHub and a full-screen navigation menu.

FORM: The approved image-led homepage remains the composition reference. Use the real portrait and published post images, with local WebP archive thumbnails. Keep introduction padding at 24px and the archive separation at 28px on desktop and 24px on phones. Preserve padding inside archive cards.

FINISH: Keep documentation matched to source. Browser evidence covers only its recorded pages, widths, and interactions; do not infer whole-site or keyboard certification.

## Content and behavior

- Show 12 articles initially and reveal another 12 with Load more, until the collection is exhausted. Do not switch to automatic infinite scrolling.
- Search all posts, including hidden batches; retain URL query state, clear actions, live counts, and the empty state.
- Without JavaScript, show all articles and hide search and loading controls.
- Keep metadata from the collection. Display at most two non-interactive topic labels on cards; full linked tags belong on article pages.
- Keep noindex and analytics disabled during local migration. Production requirements belong in `docs/migration.md`.
