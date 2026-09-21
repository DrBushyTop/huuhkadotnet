---
version: 1
slug: "src-pages-slug-astro"
primary_target: "src/pages/[slug].astro"
related_targets:
  - "src/components/ReadingRail.astro"
  - "src/data/series.json"
  - "src/lib/reading.ts"
  - "src/styles/article.css"
  - "src/styles/code.css"
  - "src/layouts/Base.astro"
  - "src/styles/image-viewer.css"
  - "src/components/ImageViewer.astro"
  - "src/components/ReaderFigure.astro"
  - "scripts/rehype-content.mjs"
---

# Article reader and community page

## Approved centered reader

The selected A layout is now the only reader. `src/styles/article.css` owns its
rules; there are no reader query parameters, variant attributes, comparison
controls, or interactive demos. At 1200px the left rail is 128px and media is 800px
wide. At 1440px they become 160px and 960px. Text stays centered at 720px; captions
are capped at 720px. Feature images, standalone inline-image figures, and wide
`ReaderFigure` blocks and top-level code blocks share the media width. Nested code remains within its parent. Phone images stay at text width with
20px gutters.

The build groups standalone image paragraphs and adjacent captions into semantic
figures without editing imported MDX. JavaScript wraps unlinked images outside
`ReaderFigure` blocks in buttons with accessible names, visible focus rings, and a
zoom-in cursor. No visible Zoom label, icon, or other overlay cue remains. The
native dialog preserves the caption, offers the original image, and supports
Close, Escape, backdrop dismissal, focus return, and document scroll locking.
The approved tokens live in DESIGN.md.

Mode: Read. Extend the approved visual system to the imported Ghost articles and community page. Preserve original content and root-level slugs. Local only, no deployment.

## Direction contract

THESIS: Read the original technical article without losing code, diagrams, captions, dates, or heading anchors.

OWN-WORLD: Reuse the light header, slate text, blue links, and approved font families. Geist Sans sets the responsive article title and section headings. Source Sans 3 sets prose at 19px with 1.7 line height, becoming 18px on phones. Geist Mono sets 11px publication and updated dates with uppercase letters, .02em tracking, and tabular numerals. Code stays SauceCodePro Nerd Font Mono at 14px and 1.65 line height.

STORY: Readers arrive at the preserved article URL, identify its author and dates, inspect topics, and read or use the compact series and contents rail. The bottom link continues in the primary series when possible, otherwise to the older article. The community page has no continuation link. The compact shared footer contains copyright, Community activities, and RSS.

FIRST VIEWPORT: All articles link, title, author, original date, optional Updated date, and linked tags. The body begins with the original feature image when present, with its caption and no desktop height cap. Desktop places the rail to the left of the body; narrow screens place disclosures before it.

FORM: At 1200px and above, the 720px content column sits between equal flexible outside columns with 36px gaps in a container capped at 1480px. This centers the content independently of the rail. The rail occupies the left column, uses the approved responsive widths above, and sticks at 96px with its own bounded vertical scroll. At 1199px and below, the reader is one column, with native disclosures before the body. It uses 24px side gutters until 600px, then 20px.

Series disclosures start collapsed at every width. Contents opens on desktop and closes below the 1200px breakpoint, with JavaScript synchronizing the default when that breakpoint changes. Without JavaScript, disclosures are initially collapsed and remain usable. Contents tracks the 112px reading line with an active text state and a 2px blue marker. The marker translates in 160ms with ease-out; reduced motion removes that transition. Anchor margins of 24px combine with global scroll padding of 80px for a 104px landing offset.

FINISH: Record source-backed reader rules without claiming all articles, external destinations, video playback, keyboard navigation, or assistive technology have been exhaustively reviewed.

## Reader constraints

- Render the original MDX content and metadata. Do not invent excerpts, headings, tags, or editorial transitions.
- Keep original heading anchors. Contents includes the shallowest eligible depth of two or greater and its immediate subheading depth, in article order. Show it when the combined list has more than one entry. Primary links have a 14px left inset; immediate subheadings have 24px.
- Keep header, prose, continuation, and footer aligned to the centered 720px reading width. Center wider media independently and cap captions at the prose width. Code and tables scroll horizontally without widening the page.
- Series memberships come from frontmatter arrays and ordered groups in `src/data/series.json`, including overlapping themes. Only explicit theme-navigation callouts move into the rail. Warnings and other author notes stay in the body.
- Remaining callouts use blockquotes; bookmark links retain their title and description. Embedded video remains external. Exact conversion limits belong in `docs/migration.md`.
- Keep canonical and SEO metadata, while noindex and blocking robots remain in place for this local pass.
- Blog posts include click-to-load giscus comments after the continuation link.
  Community pages do not. Thread keys use root-level article paths. Keep a
  GitHub fallback link, and keep giscus off on preview hosts.
- The footer includes Privacy, with no analytics banner or settings panel.
  Umami loads on public HTTPS hosts and honors Do Not Track.
  Neither analytics nor comments load on local previews.

## Review disposition

Ship for the reader cleanup and targeted contents fix, with no material fixes.
Desktop and phone captures are in `.impeccable/review/reader-cleanup/` and
`.impeccable/review/reader-contents/`. Each pair covers 1440 by 1000 and 390 by 844
CSS pixels. The desktop keeps 720px prose, 960px media, and a 160px left rail.
Neither tested width has horizontal overflow.

The phone contents disclosure starts collapsed and opens. All three tested links
resolve. The three agents anchor lands 104px below the viewport top, and the
active marker follows forward and reverse desktop scrolling. Original article
content and anchors remain unchanged. `reader-contents/verification.md` records
the checks, including 52 contents lists and 311 valid heading targets across all
56 generated reader pages.

Build passed for 95 pages; all 20 tests passed. Migration validation checked 56
content pages and 94 source URLs with zero errors. Local validation passed for 94
routes, 56 AMP redirects, RSS, and the 404.

Earlier image-dialog checks remain in
`.impeccable/review/reader-images/verification.md`, with five viewport captures.
They covered click and Enter to open, captions, the original-asset link, Escape,
backdrop and Close dismissal, focus return, and scroll unlocking at the same
desktop and phone sizes. Those captures predate removal of the visible Zoom cue.
No whole-site keyboard, screen-reader, or real Safari audit is claimed.

Not canonized: removed comparison layouts, sample palettes, demo interactions,
and visible Zoom cues. Local only, no deployment.

## Appearance

Use the shared animated sun/moon toggle and device-theme reset. Dark mode uses Catppuccin
Macchiato without changing content, image colors, or reading order. The mobile
top bar remains brand and hamburger only; theme selection stays in its menu.

Code uses the existing SauceCodePro Nerd Font Mono at 14px, with contrast-adjusted
Catppuccin Latte or Catppuccin Macchiato highlighting. Long lines scroll within the
block on every device rather than widening the page or wrapping code.
