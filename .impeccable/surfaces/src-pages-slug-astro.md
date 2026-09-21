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
---

# Article reader and community page

Mode: Read. Extend the approved visual system to the imported Ghost articles and community page. Preserve original content and root-level slugs. Local only, no deployment.

## Direction contract

THESIS: Read the original technical article without losing code, diagrams, captions, dates, or heading anchors.

OWN-WORLD: Reuse the light header, slate text, blue links, and approved font families. Geist Sans sets the responsive article title and section headings. Source Sans 3 sets prose at 19px with 1.7 line height, becoming 18px on phones. Geist Mono sets 11px publication and updated dates with uppercase letters, .02em tracking, and tabular numerals. Code stays SauceCodePro Nerd Font Mono at 14px and 1.65 line height.

STORY: Readers arrive at the preserved article URL, identify its author and dates, inspect topics, and read or use the compact series and contents rail. The bottom link continues in the primary series when possible, otherwise to the older article. The community page has no continuation link. The compact shared footer contains copyright, Community activities, and RSS.

FIRST VIEWPORT: All articles link, title, author, original date, optional Updated date, and linked tags. The body begins with the original feature image when present, contained at a maximum height of 440px with its caption. Desktop places the rail beside the body; narrow screens place disclosures before it.

FORM: At 1200px and above, the 720px content column sits between equal flexible outside columns with 36px gaps in a container capped at 1480px. This centers the content independently of the rail. The rail occupies the right column, has a 224px maximum width, and sticks at 96px with its own bounded vertical scroll. At 1199px and below, the reader is one column, with native disclosures before the body. It uses 24px side gutters until 600px, then 20px.

Series disclosures start collapsed at every width. Contents opens on desktop and closes below the 1200px breakpoint, with JavaScript synchronizing the default when that breakpoint changes. Without JavaScript, disclosures are initially collapsed and remain usable. Contents tracks the 112px reading line with an active text state and a 2px blue marker. The marker translates in 160ms with ease-out; reduced motion removes that transition. Anchor margins of 24px combine with global scroll padding of 80px for a 104px landing offset.

FINISH: Record source-backed reader rules without claiming all articles, external destinations, video playback, keyboard navigation, or assistive technology have been exhaustively reviewed.

## Reader constraints

- Render the original MDX content and metadata. Do not invent excerpts, headings, tags, or editorial transitions.
- Keep original heading anchors. Show contents only when more than one heading exists at the shallowest eligible depth of two or greater.
- Keep header, feature image, prose, continuation, and footer aligned to the centered 720px reading width. Code and tables scroll horizontally without widening the page.
- Series memberships come from frontmatter arrays and ordered groups in `src/data/series.json`, including overlapping themes. Only explicit theme-navigation callouts move into the rail. Warnings and other author notes stay in the body.
- Remaining callouts use blockquotes; bookmark links retain their title and description. Embedded video remains external. Exact conversion limits belong in `docs/migration.md`.
- Keep canonical and SEO metadata, while noindex and blocking robots remain in place for this local pass.
